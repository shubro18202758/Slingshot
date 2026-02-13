"use client";

import { createContext, useContext, useEffect, useRef, useState, ReactNode, useCallback } from "react";
import { v4 as uuidv4 } from "uuid";
import { chunkText } from "@/lib/file-processing";
import { useDb } from "@/components/providers/db-provider";
import { knowledgeItems, knowledgeChunks } from "@/db/schema";

type RagWorkerMessage = {
    type: "INDEX_GENERATED" | "SEARCH_GENERATED" | "RERANK_COMPLETE" | "STATUS" | "ERROR";
    payload: any;
};

interface SearchResult {
    id: string;
    content: string;
    similarity: number;
    rerank_score?: number;
}

interface RagContextType {
    isReady: boolean;
    worker: Worker | null;
    addDocument: (title: string, content: string, workspaceId: string, fileName?: string) => Promise<string>;
    resetIndex: () => Promise<void>;
    search: (query: string) => Promise<SearchResult[]>;
    searchWithRerank: (query: string) => Promise<SearchResult[]>;
}

const RagContext = createContext<RagContextType | undefined>(undefined);

export function useRag() {
    const context = useContext(RagContext);
    if (!context) {
        throw new Error("useRag must be used within a RagProvider");
    }
    return context;
}

/**
 * Contextual Compression — extract only the most relevant sentences 
 * from a chunk based on keyword overlap with the query.
 */
function compressContext(content: string, query: string, maxSentences: number = 3): string {
    const queryWords = new Set(
        query.toLowerCase().split(/\s+/).filter(w => w.length > 2)
    );
    const sentences = content.split(/[.!?]+/).map(s => s.trim()).filter(Boolean);

    if (sentences.length <= maxSentences) return content;

    // Score each sentence by keyword overlap
    const scored = sentences.map(sentence => {
        const words = sentence.toLowerCase().split(/\s+/);
        const overlap = words.filter(w => queryWords.has(w)).length;
        return { sentence, score: overlap };
    });

    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, maxSentences).map(s => s.sentence).join(". ") + ".";
}

export function RagProvider({ children }: { children: ReactNode }) {
    const workerRef = useRef<Worker | null>(null);
    const [isReady, setIsReady] = useState(false);
    const { db, pg } = useDb();

    // Map search requests to promises
    const searchResolversRef = useRef<Map<string, (results: SearchResult[]) => void>>(new Map());
    // Map re-rank requests to promises
    const rerankResolversRef = useRef<Map<string, (results: SearchResult[]) => void>>(new Map());

    useEffect(() => {
        workerRef.current = new Worker(new URL("../../workers/rag.worker.ts", import.meta.url));

        workerRef.current.onmessage = async (event: MessageEvent<RagWorkerMessage>) => {
            const { type, payload } = event.data;

            if (type === "INDEX_GENERATED") {
                const { id, text, embedding } = payload;
                const parts = id.split("-");
                const knowledgeItemId = parts.slice(0, 5).join("-"); // UUID has 5 parts

                if (db && embedding) {
                    try {
                        await db.insert(knowledgeChunks).values({
                            knowledgeItemId,
                            content: text,
                            embedding,
                        });
                    } catch (e) {
                        console.error("Failed to insert chunk embedding:", e);
                    }
                }

            } else if (type === "SEARCH_GENERATED") {
                const { query, embedding } = payload;

                if (pg && embedding) {
                    try {
                        const embeddingString = `[${embedding.join(",")}]`;

                        // Broad retrieval — fetch top 20 for re-ranking
                        const result = await pg.query(`
                            SELECT 
                                content, 
                                1 - (embedding <=> $1) as similarity,
                                knowledge_item_id
                            FROM knowledge_chunks
                            WHERE embedding IS NOT NULL
                            ORDER BY embedding <=> $1 ASC
                            LIMIT 20;
                        `, [embeddingString]);

                        const results: SearchResult[] = result.rows.map((row: any) => ({
                            content: row.content,
                            similarity: parseFloat(row.similarity),
                            id: row.knowledge_item_id
                        }));

                        // Resolve all pending search promises
                        const resolvers = Array.from(searchResolversRef.current.entries());
                        resolvers.forEach(([id, resolve]) => resolve(results));
                        searchResolversRef.current.clear();
                    } catch (e) {
                        console.error("Vector search failed:", e);
                        const resolvers = Array.from(searchResolversRef.current.values());
                        resolvers.forEach(resolve => resolve([]));
                        searchResolversRef.current.clear();
                    }
                }
            } else if (type === "RERANK_COMPLETE") {
                const { searchId, results } = payload;

                const resolve = rerankResolversRef.current.get(searchId);
                if (resolve) {
                    resolve(results);
                    rerankResolversRef.current.delete(searchId);
                }
            } else if (type === "STATUS") {
                console.log("[RAG Worker]", payload.message);
            } else if (type === "ERROR") {
                console.error("RAG Worker Error:", payload.error);
            }
        };

        setIsReady(true);

        return () => {
            workerRef.current?.terminate();
        };
    }, [db, pg]);

    const addDocument = useCallback(async (title: string, content: string, workspaceId: string, fileName: string = "manual-entry") => {
        if (!workerRef.current || !db) return "";

        const [newItem] = await db.insert(knowledgeItems).values({
            workspaceId,
            title,
            fileName,
            type: "text",
        }).returning();

        const docId = newItem.id;
        const chunks = chunkText(content);

        chunks.forEach((chunk, index) => {
            const chunkId = `${docId}-${index}`;
            workerRef.current?.postMessage({
                type: "INDEX",
                payload: { id: chunkId, text: chunk }
            });
        });

        return docId;
    }, [db]);

    const resetIndex = useCallback(async () => {
        if (pg) {
            await pg.exec(`TRUNCATE TABLE knowledge_chunks; TRUNCATE TABLE knowledge_items CASCADE;`);
        }
    }, [pg]);

    /**
     * Basic vector search — returns top 20 raw results (no re-ranking).
     * Used internally and for quick searches.
     */
    const search = useCallback((query: string): Promise<SearchResult[]> => {
        return new Promise((resolve) => {
            if (!workerRef.current) {
                resolve([]);
                return;
            }
            const searchId = uuidv4();
            searchResolversRef.current.set(searchId, resolve);
            workerRef.current.postMessage({ type: "SEARCH", payload: { query } });
        });
    }, []);

    /**
     * Re-rank results using the Cross-Encoder.
     * Sends candidate results to the worker for scoring.
     */
    const rerank = useCallback((query: string, candidates: SearchResult[]): Promise<SearchResult[]> => {
        return new Promise((resolve) => {
            if (!workerRef.current || candidates.length === 0) {
                resolve(candidates);
                return;
            }
            const searchId = uuidv4();
            rerankResolversRef.current.set(searchId, resolve);
            workerRef.current.postMessage({
                type: "RERANK",
                payload: {
                    searchId,
                    query,
                    candidates: candidates.map(c => ({
                        id: c.id,
                        content: c.content,
                        similarity: c.similarity,
                    })),
                },
            });
        });
    }, []);

    /**
     * Full Agentic RAG pipeline:
     * 1. Broad vector retrieval (top 20)
     * 2. Cross-Encoder re-ranking
     * 3. Take top 5
     * 4. Contextual compression
     */
    const searchWithRerank = useCallback(async (query: string): Promise<SearchResult[]> => {
        // Stage 1: Broad retrieval
        const broadResults = await search(query);
        if (broadResults.length === 0) return [];

        // Stage 2: Cross-Encoder re-ranking
        const reranked = await rerank(query, broadResults);

        // Stage 3: Take top 5
        const top5 = reranked.slice(0, 5);

        // Stage 4: Contextual compression
        const compressed = top5.map(result => ({
            ...result,
            content: compressContext(result.content, query),
        }));

        return compressed;
    }, [search, rerank]);

    return (
        <RagContext.Provider value={{ isReady, worker: workerRef.current, addDocument, resetIndex, search, searchWithRerank }}>
            {children}
        </RagContext.Provider>
    );
}
