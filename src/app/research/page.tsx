"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useDb } from "@/components/providers/db-provider";
import { useRag } from "@/hooks/use-rag";
import { documents } from "@/db/schema";
import { LLMEngine } from "@/lib/ai/llm-engine";
import {
    parseJsonArray,
    buildQueryExpansionPrompt,
    buildResearchDecompositionPrompt,
} from "@/lib/ai/agent";
import {
    Search, Loader2, FileText, Save, Copy,
    Sparkles, BookOpen, ArrowRight, CheckCircle2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

type ResearchStep = {
    id: number;
    label: string;
    status: "pending" | "running" | "done" | "error";
    detail?: string;
};

type Citation = {
    index: number;
    content: string;
    similarity: number;
};

export default function ResearchPage() {
    const router = useRouter();
    const { db } = useDb();
    const { searchWithRerank } = useRag();
    const [topic, setTopic] = useState("");
    const [isResearching, setIsResearching] = useState(false);
    const [steps, setSteps] = useState<ResearchStep[]>([]);
    const [briefing, setBriefing] = useState<string | null>(null);
    const [citations, setCitations] = useState<Citation[]>([]);
    const [isSaving, setIsSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const outputRef = useRef<HTMLDivElement>(null);

    const updateStep = (id: number, updates: Partial<ResearchStep>) => {
        setSteps((prev) => prev.map((s) => (s.id === id ? { ...s, ...updates } : s)));
    };

    const startResearch = async () => {
        if (!topic.trim()) return;
        setIsResearching(true);
        setBriefing(null);
        setCitations([]);
        setSaved(false);

        const researchSteps: ResearchStep[] = [
            { id: 1, label: "Decomposing topic into sub-questions", status: "pending" },
            { id: 2, label: "Expanding queries for comprehensive coverage", status: "pending" },
            { id: 3, label: "Searching knowledge base with re-ranking", status: "pending" },
            { id: 4, label: "Compiling research brief with citations", status: "pending" },
        ];
        setSteps(researchSteps);

        try {
            // Step 1: Decompose into sub-questions
            updateStep(1, { status: "running" });
            const llm = LLMEngine.getInstance();

            if (!llm.isReady()) {
                updateStep(1, { detail: "Initializing AI Model (First Run)..." });
                await llm.initialize((progress) => {
                    console.log("Initializing LLM:", progress);
                    if (progress.text.includes("%")) {
                        updateStep(1, { detail: `Loading AI Model: ${progress.text}` });
                    }
                });
            }

            const decompositionPrompt = buildResearchDecompositionPrompt(topic, 3);
            let subQuestions: string[] = [];
            try {
                const response = await llm.chat([
                    { role: "system", content: "You are a research assistant. Respond ONLY with a JSON array of sub-questions." },
                    { role: "user", content: decompositionPrompt },
                ]);
                subQuestions = parseJsonArray(response);
            } catch {
                subQuestions = [topic];
            }
            if (subQuestions.length === 0) subQuestions = [topic];
            updateStep(1, { status: "done", detail: `Generated ${subQuestions.length} sub-questions` });

            // Step 2: Expand queries
            updateStep(2, { status: "running" });
            const allQueries: string[] = [];
            for (const q of subQuestions) {
                allQueries.push(q);
                try {
                    const expansionPrompt = buildQueryExpansionPrompt(q);
                    const response = await llm.chat([
                        { role: "system", content: "You are a helpful assistant that generates search queries. Respond ONLY with a JSON array." },
                        { role: "user", content: expansionPrompt },
                    ]);
                    const expanded = parseJsonArray(response);
                    allQueries.push(...expanded.slice(0, 2));
                } catch { /* Silent */ }
            }
            updateStep(2, { status: "done", detail: `${allQueries.length} search queries prepared` });

            // Step 3: Search & re-rank
            updateStep(3, { status: "running" });
            const allResults: any[] = [];
            const seen = new Set<string>();

            for (const query of allQueries) {
                try {
                    const results = await searchWithRerank(query);
                    for (const r of results) {
                        const key = r.content.substring(0, 80);
                        if (!seen.has(key)) {
                            seen.add(key);
                            allResults.push(r);
                        }
                    }
                } catch { /* Continue */ }
            }

            allResults.sort((a, b) => (b.rerank_score ?? b.similarity) - (a.rerank_score ?? a.similarity));
            const topResults = allResults.slice(0, 10);

            const citationList: Citation[] = topResults.map((r, i) => ({
                index: i + 1,
                content: r.content,
                similarity: r.rerank_score ?? r.similarity,
            }));
            setCitations(citationList);
            updateStep(3, { status: "done", detail: `Found ${topResults.length} high-relevance sources` });

            // Step 4: Compile with LLM
            updateStep(4, { status: "running" });
            const sourcesBlock = citationList
                .map((c) => `[${c.index}] ${c.content}`)
                .join("\n\n");

            const compilationPrompt = `You are a research assistant. Using ONLY the provided sources, write a well-structured research brief on: "${topic}"

SOURCES:
${sourcesBlock || "No sources found."}

INSTRUCTIONS:
- Write 3-5 paragraphs covering the key findings.
- Cite sources using [1], [2], etc. inline when referencing specific facts.
- If no sources are available, write a brief general overview and note the lack of evidence.
- Use markdown formatting (headers, bold, lists).
- End with a "## Key Takeaways" section with 3-4 bullet points.`;

            const brief = await llm.chat([
                { role: "system", content: "You are an expert research writer. Always cite sources." },
                { role: "user", content: compilationPrompt },
            ]);

            setBriefing(brief);
            updateStep(4, { status: "done", detail: "Research brief compiled" });
        } catch (error) {
            console.error("Research failed:", error);
            const failedStep = steps.find((s) => s.status === "running");
            if (failedStep) updateStep(failedStep.id, { status: "error", detail: String(error) });
        } finally {
            setIsResearching(false);
        }
    };

    const handleSaveAsDocument = async () => {
        if (!db || !briefing) return;
        setIsSaving(true);
        try {
            await db.insert(documents).values({
                workspaceId: "default",
                title: `Research: ${topic}`,
                content: briefing,
            });
            setSaved(true);
        } catch (e) {
            console.error("Failed to save:", e);
        } finally {
            setIsSaving(false);
        }
    };

    const handleCopy = () => {
        if (briefing) {
            navigator.clipboard.writeText(briefing);
        }
    };

    return (
        <div className="flex flex-col min-h-screen p-6 md:p-8">
            <div className="max-w-4xl mx-auto w-full space-y-8">
                {/* Header */}
                <div className="flex items-center gap-4">
                    <div className="bg-gradient-to-br from-cyan-500/20 to-blue-500/20 p-3 rounded-xl border border-cyan-500/10">
                        <Search className="h-6 w-6 text-cyan-400" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-cyan-400 via-blue-400 to-violet-400 bg-clip-text text-transparent">
                            Research Copilot
                        </h1>
                        <p className="text-muted-foreground">
                            AI-powered deep research with citations from your knowledge base.
                        </p>
                    </div>
                </div>

                {/* Topic Input */}
                <Card className="border-white/10 bg-white/5 backdrop-blur-sm">
                    <CardContent className="p-5">
                        <div className="flex gap-3">
                            <Input
                                value={topic}
                                onChange={(e) => setTopic(e.target.value)}
                                placeholder="Enter a research topic... (e.g., 'Impact of transformer architecture on NLP')"
                                className="bg-white/5 border-white/10 focus:border-cyan-500/50 text-base"
                                onKeyDown={(e) => e.key === "Enter" && startResearch()}
                                disabled={isResearching}
                            />
                            <Button
                                onClick={startResearch}
                                disabled={isResearching || !topic.trim()}
                                className="bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white gap-2 px-6"
                            >
                                {isResearching ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                    <Sparkles className="h-4 w-4" />
                                )}
                                Research
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                {/* Research Progress */}
                <AnimatePresence>
                    {steps.length > 0 && (
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="space-y-2"
                        >
                            {steps.map((step) => (
                                <motion.div
                                    key={step.id}
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: step.id * 0.05 }}
                                    className={cn(
                                        "flex items-center gap-3 p-3 rounded-lg border transition-all",
                                        step.status === "running" && "border-cyan-500/30 bg-cyan-500/5",
                                        step.status === "done" && "border-emerald-500/20 bg-emerald-500/5",
                                        step.status === "error" && "border-red-500/20 bg-red-500/5",
                                        step.status === "pending" && "border-white/10 bg-white/5 opacity-50"
                                    )}
                                >
                                    {step.status === "running" && <Loader2 className="h-4 w-4 animate-spin text-cyan-400 shrink-0" />}
                                    {step.status === "done" && <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />}
                                    {step.status === "error" && <div className="h-4 w-4 rounded-full bg-red-500 shrink-0" />}
                                    {step.status === "pending" && <div className="h-4 w-4 rounded-full border-2 border-white/20 shrink-0" />}
                                    <div className="flex-1">
                                        <p className="text-sm font-medium">{step.label}</p>
                                        {step.detail && <p className="text-[10px] text-muted-foreground">{step.detail}</p>}
                                    </div>
                                </motion.div>
                            ))}
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Research Output */}
                {briefing && (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="space-y-4"
                    >
                        <Card className="border-white/10 bg-white/5 backdrop-blur-sm">
                            <div className="px-5 py-3 border-b border-white/5 flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <BookOpen className="h-4 w-4 text-cyan-400" />
                                    <h3 className="font-semibold text-sm">Research Brief</h3>
                                    {citations.length > 0 && (
                                        <Badge variant="outline" className="border-cyan-500/30 text-cyan-400 text-[10px]">
                                            {citations.length} citations
                                        </Badge>
                                    )}
                                </div>
                                <div className="flex items-center gap-2">
                                    <Button variant="ghost" size="sm" className="h-8 text-xs gap-1" onClick={handleCopy}>
                                        <Copy className="h-3 w-3" /> Copy
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-8 text-xs gap-1 text-cyan-300"
                                        onClick={handleSaveAsDocument}
                                        disabled={isSaving || saved}
                                    >
                                        {saved ? (
                                            <><CheckCircle2 className="h-3 w-3 text-emerald-400" /> Saved</>
                                        ) : isSaving ? (
                                            <><Loader2 className="h-3 w-3 animate-spin" /> Saving...</>
                                        ) : (
                                            <><Save className="h-3 w-3" /> Save as Document</>
                                        )}
                                    </Button>
                                </div>
                            </div>
                            <CardContent className="p-6" ref={outputRef}>
                                <div className="prose prose-sm dark:prose-invert max-w-none prose-headings:text-foreground/90 prose-p:text-muted-foreground prose-strong:text-foreground/80 prose-li:text-muted-foreground">
                                    {briefing.split("\n").map((line, i) => {
                                        if (line.startsWith("## ")) {
                                            return <h2 key={i} className="text-lg font-semibold mt-4 mb-2 text-cyan-300">{line.replace("## ", "")}</h2>;
                                        }
                                        if (line.startsWith("### ")) {
                                            return <h3 key={i} className="text-base font-medium mt-3 mb-1">{line.replace("### ", "")}</h3>;
                                        }
                                        if (line.startsWith("- ")) {
                                            return (
                                                <div key={i} className="flex items-start gap-2 ml-2 my-1">
                                                    <ArrowRight className="h-3 w-3 text-cyan-400 mt-1 shrink-0" />
                                                    <span className="text-sm text-muted-foreground">{renderCitations(line.replace("- ", ""))}</span>
                                                </div>
                                            );
                                        }
                                        if (line.trim() === "") return <div key={i} className="h-2" />;
                                        return <p key={i} className="text-sm leading-relaxed mb-2">{renderCitations(line)}</p>;
                                    })}
                                </div>
                            </CardContent>
                        </Card>

                        {/* Citations Panel */}
                        {citations.length > 0 && (
                            <Card className="border-white/10 bg-white/5 backdrop-blur-sm">
                                <div className="px-5 py-3 border-b border-white/5">
                                    <h3 className="font-semibold text-sm flex items-center gap-2">
                                        <FileText className="h-4 w-4 text-amber-400" /> Sources
                                    </h3>
                                </div>
                                <CardContent className="p-4 space-y-2">
                                    {citations.map((c) => (
                                        <div key={c.index} className="flex gap-3 p-2.5 rounded-lg bg-white/5 border border-white/10">
                                            <Badge variant="outline" className="shrink-0 h-5 text-[10px] border-amber-500/30 text-amber-400 mt-0.5">
                                                {c.index}
                                            </Badge>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-xs text-muted-foreground line-clamp-2">{c.content}</p>
                                                <p className="text-[10px] text-muted-foreground/50 mt-0.5">
                                                    Confidence: {(c.similarity * 100).toFixed(0)}%
                                                </p>
                                            </div>
                                        </div>
                                    ))}
                                </CardContent>
                            </Card>
                        )}
                    </motion.div>
                )}
            </div>
        </div>
    );
}

function renderCitations(text: string): React.ReactNode {
    // Highlight [1], [2], etc as interactive badges
    const parts = text.split(/(\[\d+\])/g);
    return parts.map((part, i) => {
        const match = part.match(/^\[(\d+)\]$/);
        if (match) {
            return (
                <span key={i} className="inline-flex items-center mx-0.5 px-1 py-0 text-[10px] font-mono rounded bg-cyan-500/15 text-cyan-400 border border-cyan-500/20">
                    {part}
                </span>
            );
        }
        return <span key={i}>{part}</span>;
    });
}
