"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { LLMEngine } from "@/lib/ai/llm-engine";
import { type InitProgressReport } from "@mlc-ai/web-llm";

export type Message = {
    role: "user" | "assistant" | "system";
    content: string;
};

export function useAi() {
    const [isModelLoading, setIsModelLoading] = useState(false);
    const [progress, setProgress] = useState(0); // 0-100
    const [loadingText, setLoadingText] = useState("");
    const [isGenerating, setIsGenerating] = useState(false);
    const [messages, setMessages] = useState<Message[]>([]);
    const [error, setError] = useState<string | null>(null);

    // Track if we need to initialize
    const engine = useRef<LLMEngine | null>(null);

    useEffect(() => {
        // Lazy init of the singleton wrapper
        engine.current = LLMEngine.getInstance();
    }, []);

    const initialize = useCallback(async () => {
        if (!engine.current) return;
        try {
            if (engine.current.isReady()) return;

            setIsModelLoading(true);
            setError(null);
            await engine.current.initialize((report: InitProgressReport) => {
                // Parse progress if possible, report.progress is 0-1
                // report.text example: "Loading model 50%"
                const p = Math.round(report.progress * 100);
                setProgress(p);
                setLoadingText(report.text);
            });
        } catch (err) {
            setError((err as Error).message);
        } finally {
            setIsModelLoading(false);
        }
    }, []);

    const sendMessage = useCallback(async (content: string) => {
        if (!content.trim() || !engine.current) return;

        const userMsg: Message = { role: "user", content };

        // Optimistic update
        setMessages((prev) => [...prev, userMsg]);
        setIsGenerating(true);
        setError(null);

        try {
            // Ensure initialized
            if (!engine.current.isReady()) {
                await initialize();
            }

            // Prepare context window - sending all messages for context
            // In a real app, might want to limit context window
            const context = [...messages, userMsg];

            const responseText = await engine.current.chat(context);

            const aiMsg: Message = { role: "assistant", content: responseText };
            setMessages((prev) => [...prev, aiMsg]);

        } catch (err) {
            setError((err as Error).message);
            // Remove failed user message? Or keep it with error state? 
            // For now, keeping it but showing error.
        } finally {
            setIsGenerating(false);
        }
    }, [messages, initialize]);

    // Auto-unload logic (Optional/Advanced)
    // For now, we'll implement a simple unload on unmount if configured.
    // However, WebLLM caching recommends keeping it loaded if usage is frequent.
    // We'll skip aggressive unloading for now to keep the experience snappy.

    return {
        isModelLoading,
        progress,
        loadingText,
        isGenerating,
        messages,
        error,
        sendMessage,
        initialize, // Expose manually if needed
    };
}
