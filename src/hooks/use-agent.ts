"use client";

import { useState } from "react";
import { LLMEngine } from "@/lib/ai/llm-engine";
import {
    parseToolCall,
    parseJsonArray,
    buildQueryExpansionPrompt,
    buildResearchDecompositionPrompt,
    SYSTEM_PROMPT,
    type AgentMessage,
} from "@/lib/ai/agent";
import { useDb } from "@/components/providers/db-provider";
import { createTaskInWorkspace } from "@/lib/task-utils";
import { useRag } from "@/hooks/use-rag";

export function useAgent(workspaceId: string = "default") {
    const [messages, setMessages] = useState<AgentMessage[]>([]);
    const [isThinking, setIsThinking] = useState(false);
    const [currentThought, setCurrentThought] = useState<string>("");

    const { db } = useDb();
    const { search, searchWithRerank } = useRag();

    /**
     * Query Expansion — use LLM to generate 3 alternative queries,
     * then search all of them (including original) and deduplicate.
     */
    const expandAndSearch = async (query: string): Promise<any[]> => {
        setCurrentThought("Expanding query for comprehensive search...");

        // Generate expanded queries via LLM
        const expansionPrompt = buildQueryExpansionPrompt(query);
        let expandedQueries: string[] = [];

        try {
            const llm = LLMEngine.getInstance();
            const response = await llm.chat([
                { role: "system", content: "You are a helpful assistant that generates search queries. Respond ONLY with a JSON array." },
                { role: "user", content: expansionPrompt },
            ], { temperature: 0.3, max_tokens: 1024, json_mode: true });
            expandedQueries = parseJsonArray(response);
        } catch (e) {
            console.warn("Query expansion failed, falling back to original query:", e);
        }

        // Always include the original query
        const allQueries = [query, ...expandedQueries.slice(0, 3)];
        setCurrentThought(`Searching ${allQueries.length} queries with re-ranking...`);

        // Search all queries in parallel
        const allResults = await Promise.all(
            allQueries.map(q => searchWithRerank(q))
        );

        // Deduplicate by content hash (simple approach: use first 50 chars as key)
        const seen = new Set<string>();
        const deduped: any[] = [];

        for (const results of allResults) {
            for (const result of results) {
                const key = result.content.substring(0, 50);
                if (!seen.has(key)) {
                    seen.add(key);
                    deduped.push(result);
                }
            }
        }

        // Sort by rerank_score (highest first), take top 5
        deduped.sort((a, b) => (b.rerank_score ?? b.similarity) - (a.rerank_score ?? a.similarity));
        return deduped.slice(0, 5);
    };

    /**
     * Multi-hop Research — decompose topic into sub-questions,
     * deep-search each, and compile findings.
     */
    const researchTopic = async (topic: string, depth: number = 3): Promise<string> => {
        setCurrentThought("Decomposing research topic into sub-questions...");

        // Generate sub-questions
        const decompositionPrompt = buildResearchDecompositionPrompt(topic, depth);
        let subQuestions: string[] = [];

        try {
            const llm = LLMEngine.getInstance();
            const response = await llm.chat([
                { role: "system", content: "You are a research assistant. Respond ONLY with a JSON array of sub-questions." },
                { role: "user", content: decompositionPrompt },
            ], { temperature: 0.2, max_tokens: 1024, json_mode: true });
            subQuestions = parseJsonArray(response);
        } catch (e) {
            console.warn("Research decomposition failed:", e);
            subQuestions = [topic]; // Fallback
        }

        if (subQuestions.length === 0) subQuestions = [topic];

        // Research each sub-question
        const findings: { question: string; evidence: string[] }[] = [];

        for (let i = 0; i < subQuestions.length; i++) {
            const q = subQuestions[i];
            setCurrentThought(`Researching (${i + 1}/${subQuestions.length}): "${q.substring(0, 40)}..."`);

            const results = await expandAndSearch(q);
            findings.push({
                question: q,
                evidence: results.map(r => r.content),
            });
        }

        // Compile research brief
        let brief = `## Research Brief: ${topic}\n\n`;
        for (const finding of findings) {
            brief += `### ${finding.question}\n`;
            if (finding.evidence.length === 0) {
                brief += `- No relevant evidence found.\n\n`;
            } else {
                finding.evidence.forEach((e, i) => {
                    brief += `- **[${i + 1}]** ${e}\n`;
                });
                brief += `\n`;
            }
        }

        return brief;
    };

    const processToolCall = async (tool: string, params: any): Promise<string> => {
        setCurrentThought(`Executing tool: ${tool}...`);

        try {
            if (tool === "create_task") {
                if (!db) return "Error: Database not connected.";
                const created = await createTaskInWorkspace(db, {
                    workspaceId,
                    title: params.title,
                    dueDate: params.due_date ? new Date(params.due_date) : null,
                    priority: params.priority || "medium",
                    description: params.description || null,
                });
                return created
                    ? `Task "${params.title}" created successfully.`
                    : `Task "${params.title}" already exists — skipped.`;
            }

            if (tool === "search_knowledge_base") {
                setCurrentThought("Searching knowledge base...");
                const results = await search(params.query);
                if (results.length === 0) return "No relevant documents found.";
                return `Found ${results.length} results:\n${results.slice(0, 5).map((r: any, i: number) =>
                    `[${i + 1}] (similarity: ${(r.similarity * 100).toFixed(0)}%) ${r.content.substring(0, 200)}...`
                ).join("\n\n")}`;
            }

            if (tool === "deep_search") {
                setCurrentThought("Running deep search with query expansion + re-ranking...");
                const results = await expandAndSearch(params.query);
                if (results.length === 0) return "No relevant documents found after deep search.";
                return `Deep Search found ${results.length} high-precision results:\n${results.map((r: any, i: number) =>
                    `[${i + 1}] (confidence: ${((r.rerank_score ?? r.similarity) * 100).toFixed(0)}%) ${r.content.substring(0, 300)}...`
                ).join("\n\n")}`;
            }

            if (tool === "research_topic") {
                setCurrentThought("Starting multi-hop research...");
                const depth = Math.min(params.depth || 3, 5);
                const brief = await researchTopic(params.topic, depth);
                return brief;
            }

            if (tool === "summarize_document") {
                if (!db) return "Error: Database not connected.";
                setCurrentThought("Fetching document chunks for summarization...");
                const { knowledgeChunks } = await import("@/db/schema");
                const { eq: eqOp } = await import("drizzle-orm");
                const chunks = await db
                    .select()
                    .from(knowledgeChunks)
                    .where(eqOp(knowledgeChunks.knowledgeItemId, params.document_id));

                if (chunks.length === 0) return "No content found for this document.";

                const fullText = chunks.map(c => c.content).join("\n\n");
                const truncated = fullText.length > 6000 ? fullText.substring(0, 6000) + "..." : fullText;

                setCurrentThought("Generating summary with AI...");
                const llm = LLMEngine.getInstance();
                const summary = await llm.chat([
                    { role: "system", content: "Summarize the following document concisely. Use bullet points for key findings." },
                    { role: "user", content: truncated },
                ], { temperature: 0.2, max_tokens: 4096 });

                return `## Document Summary\n\n${summary}`;
            }

            return "Error: Unknown tool.";
        } catch (error) {
            return `Error executing tool: ${(error as Error).message}`;
        }
    };

    const sendMessage = async (content: string) => {
        setIsThinking(true);
        setCurrentThought("Thinking...");

        const newHistory: AgentMessage[] = [...messages, { role: "user", content }];
        setMessages(newHistory);

        try {
            let conversation = [...newHistory];
            let turns = 0;
            const MAX_TURNS = 8;

            while (turns < MAX_TURNS) {
                turns++;

                const llmMessages: Array<{ role: "system" | "user" | "assistant"; content: string }> = [
                    { role: "system", content: SYSTEM_PROMPT },
                    ...conversation.map(msg => ({
                        role: (msg.role === "tool" ? "system" : msg.role) as "system" | "user" | "assistant",
                        content: msg.role === "tool" ? `Tool Output: ${msg.content}` : msg.content
                    }))
                ];

                const response = await LLMEngine.getInstance().chat(llmMessages, { temperature: 0.3, max_tokens: 4096 });

                const toolCall = parseToolCall(response);

                if (toolCall) {
                    conversation.push({ role: "assistant", content: response });
                    const result = await processToolCall(toolCall.tool, toolCall.parameters);
                    conversation.push({ role: "tool", content: result });
                    continue;
                } else {
                    conversation.push({ role: "assistant", content: response });
                    setMessages(conversation);
                    break;
                }
            }
        } catch (error) {
            console.error("Agent Error:", error);
            setMessages(prev => [...prev, { role: "assistant", content: "Sorry, I encountered an error." }]);
        } finally {
            setIsThinking(false);
            setCurrentThought("");
        }
    };

    return {
        messages,
        isThinking,
        currentThought,
        sendMessage,
    };
}
