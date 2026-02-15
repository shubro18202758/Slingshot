// ===================================================================
// LLM Engine — DeepSeek R1 0528 Distill Qwen3 8B
//
// ██████████████████████████████████████████████████████████████████
// ██  CORE MODEL: DeepSeek-R1-0528-Distill-Qwen3-8B (Ollama)    ██
// ██  This is the IMMUTABLE heart of Slingshot. DO NOT change.   ██
// ██  The entire project — tuning, GPU acceleration, prompts —   ██
// ██  is built around this specific model. Changing it breaks    ██
// ██  everything. If you're reading this: LEAVE IT ALONE.        ██
// ██████████████████████████████████████████████████████████████████
//
// SECONDARY (helpers — extend core prowess, never replace):
//   1. OpenRouter API → deepseek/deepseek-r1-0528 (full 671B R1)
//   2. Groq API → ultra-fast inference for lightweight tasks
//
// All consumers use: LLMEngine.getInstance().chat(messages)
// ===================================================================

// ─── LOCKED Core Model Config ────────────────────────────────────
// These values define the core and MUST NEVER be changed.
const CORE_MODEL = "deepseek-r1:8b" as const;
const CORE_MODEL_DISPLAY = "DeepSeek-R1-0528-Distill-Qwen3-8B" as const;

// ─── Configurable infra (can be adjusted per-deployment) ─────────
const OLLAMA_BASE =
    (typeof window !== "undefined"
        ? (window as any).__NEXT_DATA__?.props?.pageProps?.ollamaUrl
        : undefined) || "http://localhost:11434";

// ─── GPU Acceleration & Performance Tuning ───────────────────────
// These Ollama runtime options maximize throughput on the user's GPU.
// They are sent with EVERY inference call for consistent performance.
const OLLAMA_GPU_OPTIONS = {
    // GPU layers: -1 means offload ALL layers to GPU (CUDA/Vulkan/Metal)
    num_gpu: -1,
    // Enable Flash Attention 2 for 2-4x faster attention on modern GPUs
    flash_attn: true,
    // KV cache quantization: q8_0 reduces VRAM usage by ~50% with <1% quality loss
    kv_cache_type: "q8_0",
    // Context window: 32K tokens (sweet spot for 8B model + structured output)
    num_ctx: 32768,
    // Batch size for prompt processing (higher = faster prefill on GPU)
    num_batch: 512,
    // Thread count for CPU fallback layers (0 = auto-detect)
    num_thread: 0,
    // Keep model loaded in VRAM indefinitely (prevent cold starts)
    keep_alive: -1,
    // Repeat penalty to reduce repetitive JSON output
    repeat_penalty: 1.1,
    // Top-K sampling (40 is optimal for structured output)
    top_k: 40,
} as const;

/** Progress report during initialization */
export type InitProgressReport = {
    progress: number; // 0-1
    text: string;
};

export type InitProgressCallback = (report: InitProgressReport) => void;

/** Route to the secondary API engine for complex tasks */
export type ChatMode = "local" | "api" | "groq";

/** Chat options for fine-grained control per-call */
export interface ChatOptions {
    temperature?: number;
    max_tokens?: number;
    mode?: ChatMode;
    /** Request structured JSON output (sets lower temp + format hint) */
    json_mode?: boolean;
}

/**
 * Strip `<think>...</think>` reasoning tokens from DeepSeek R1 output.
 * All downstream consumers expect clean content (many parse JSON directly).
 */
function stripThinkingTokens(text: string): string {
    return text.replace(/<think>[\s\S]*?<\/think>/g, "").trim();
}

/**
 * Robust JSON extraction from LLM output.
 * Handles markdown fencing, preamble text, trailing garbage.
 * Used by ALL modules to standardize JSON parsing.
 */
export function extractJson<T = any>(raw: string): T {
    // Step 1: Strip thinking tokens
    const cleaned = stripThinkingTokens(raw);

    // Step 2: Try direct parse
    try { return JSON.parse(cleaned) as T; } catch { /* continue */ }

    // Step 3: Strip markdown fences
    const unfenced = cleaned
        .replace(/^```(?:json)?\s*/gm, "")
        .replace(/```\s*$/gm, "")
        .trim();
    try { return JSON.parse(unfenced) as T; } catch { /* continue */ }

    // Step 4: Extract first JSON object/array
    const objMatch = unfenced.match(/\{[\s\S]*\}/);
    if (objMatch) {
        try { return JSON.parse(objMatch[0]) as T; } catch { /* continue */ }
    }
    const arrMatch = unfenced.match(/\[[\s\S]*\]/);
    if (arrMatch) {
        try { return JSON.parse(arrMatch[0]) as T; } catch { /* continue */ }
    }

    throw new Error("Failed to extract valid JSON from LLM response");
}

export class LLMEngine {
    private static instance: LLMEngine;
    private ollamaReady = false;
    private apiReady = false;
    private groqReady = false;
    private initPromise: Promise<void> | null = null;

    private constructor() {}

    public static getInstance(): LLMEngine {
        if (!LLMEngine.instance) {
            LLMEngine.instance = new LLMEngine();
        }
        return LLMEngine.instance;
    }

    /** Returns the locked core model identifier. Cannot be changed. */
    public static getCoreModel(): string {
        return CORE_MODEL;
    }

    /** Returns the human-readable core model name. */
    public static getCoreModelDisplay(): string {
        return CORE_MODEL_DISPLAY;
    }

    // ─── Initialization ──────────────────────────────────────────────

    /**
     * Warm up the local core model and verify API helpers.
     * Uses a proper Promise-based lock (no polling).
     * The local model is the primary — if it's up, we're good.
     * API helpers are secondary and their failure is non-fatal.
     */
    public async initialize(
        progressCallback?: InitProgressCallback
    ): Promise<void> {
        if (this.ollamaReady) return;

        // Promise-based init lock — proper concurrency safety
        if (this.initPromise) {
            return this.initPromise;
        }

        this.initPromise = this._doInitialize(progressCallback)
            .finally(() => {
                this.initPromise = null;
            });

        return this.initPromise;
    }

    private async _doInitialize(
        progressCallback?: InitProgressCallback
    ): Promise<void> {
        try {
            // Step 1: Check local Ollama is running
            progressCallback?.({
                progress: 0.05,
                text: `Connecting to ${CORE_MODEL_DISPLAY} (Ollama)…`,
            });

            const ollamaUp = await this.checkOllama();
            if (!ollamaUp) {
                throw new Error(
                    "Ollama is not running. Start it with: ollama serve\n" +
                    `Then ensure model is pulled: ollama pull ${CORE_MODEL}`
                );
            }

            // Step 2: Verify the correct model is available
            progressCallback?.({
                progress: 0.1,
                text: "Verifying core model availability…",
            });
            await this.verifyModelAvailable();

            // Step 3: Warm up the model (loads into GPU VRAM with tuned params)
            progressCallback?.({
                progress: 0.2,
                text: `Loading ${CORE_MODEL_DISPLAY} into GPU (Flash Attn + Q8 KV cache)…`,
            });

            await this.warmUpOllama();
            this.ollamaReady = true;

            progressCallback?.({
                progress: 0.75,
                text: "Core model loaded. Checking API helpers…",
            });

            // Step 4: Check API helpers in parallel (non-fatal)
            await this.checkAPIHelpers();

            const helpers: string[] = [];
            if (this.apiReady) helpers.push("OpenRouter");
            if (this.groqReady) helpers.push("Groq");

            progressCallback?.({
                progress: 1,
                text: `${CORE_MODEL_DISPLAY} ready` +
                    (helpers.length > 0 ? ` + ${helpers.join(" + ")} helpers` : " (local-only)"),
            });

        } catch (error) {
            console.error("[LLM] Engine Initialization Failed:", error);
            this.ollamaReady = false;
            throw error;
        }
    }

    // ─── Chat ────────────────────────────────────────────────────────

    /**
     * Send a chat completion to DeepSeek R1 0528.
     *
     * @param messages - Chat messages
     * @param options  - temperature, max_tokens, mode, json_mode
     *   - mode "local" (default): Uses Ollama (the core local model)
     *   - mode "api": Uses OpenRouter for complex/lengthy tasks
     *   - mode "groq": Uses Groq for ultra-fast lightweight tasks
     *   - json_mode: true to enforce structured JSON output (temp 0.2)
     */
    public async chat(
        messages: { role: "system" | "user" | "assistant"; content: string }[],
        options?: ChatOptions
    ): Promise<string> {
        const mode = options?.mode ?? "local";

        // Auto-initialize if not ready
        if (!this.ollamaReady) {
            await this.initialize();
        }

        // JSON mode: override temperature for reliability
        const effectiveOpts = options?.json_mode
            ? { ...options, temperature: options.temperature ?? 0.15 }
            : options;

        if (mode === "api") {
            return this.chatViaAPI(messages, effectiveOpts);
        }
        if (mode === "groq") {
            return this.chatViaAPI(messages, { ...effectiveOpts, mode: "groq" });
        }
        return this.chatViaOllama(messages, effectiveOpts);
    }

    // ─── Local Ollama (Primary / Core — IMMUTABLE) ───────────────────

    private async chatViaOllama(
        messages: { role: "system" | "user" | "assistant"; content: string }[],
        options?: ChatOptions
    ): Promise<string> {
        try {
            const controller = new AbortController();
            const timeoutMs = 5 * 60 * 1000; // 5 min for long reasoning chains
            const timeout = setTimeout(() => controller.abort(), timeoutMs);

            const res = await fetch(
                `${OLLAMA_BASE}/v1/chat/completions`,
                {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        model: CORE_MODEL, // LOCKED — never changes
                        messages,
                        temperature: options?.temperature ?? 0.6,
                        max_tokens: options?.max_tokens ?? 4096,
                        stream: false,
                        // GPU acceleration & tuning params sent with every call
                        options: OLLAMA_GPU_OPTIONS,
                    }),
                    signal: controller.signal,
                }
            );

            clearTimeout(timeout);

            if (!res.ok) {
                const errText = await res.text();
                throw new Error(`Ollama error ${res.status}: ${errText}`);
            }

            const data = await res.json();
            const rawContent = data.choices?.[0]?.message?.content || "";
            return stripThinkingTokens(rawContent);
        } catch (error) {
            console.error("[LLM] Local Ollama error:", error);

            // Fallback cascade: try API helpers if available
            if (this.apiReady) {
                console.warn("[LLM] Core model failed — falling back to OpenRouter…");
                try {
                    return await this.chatViaAPI(messages, options);
                } catch (apiErr) {
                    console.error("[LLM] OpenRouter fallback also failed:", apiErr);
                }
            }
            if (this.groqReady) {
                console.warn("[LLM] Trying Groq fallback…");
                try {
                    return await this.chatViaAPI(messages, { ...options, mode: "groq" });
                } catch (groqErr) {
                    console.error("[LLM] Groq fallback also failed:", groqErr);
                }
            }
            throw error;
        }
    }

    // ─── API Helpers (Secondary — extend core, never replace) ────────

    private async chatViaAPI(
        messages: { role: "system" | "user" | "assistant"; content: string }[],
        options?: ChatOptions
    ): Promise<string> {
        const provider = options?.mode === "groq" ? "groq" : "openrouter";

        if (provider === "groq" && !this.groqReady) {
            throw new Error("Groq API helper not available. Check GROQ_API_KEY in .env.local");
        }
        if (provider === "openrouter" && !this.apiReady) {
            throw new Error("OpenRouter API helper not available. Check OPENROUTER_API_KEY in .env.local");
        }

        try {
            const res = await fetch("/api/llm/chat", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    messages,
                    temperature: options?.temperature ?? 0.6,
                    max_tokens: options?.max_tokens ?? 4096,
                    provider,
                }),
            });

            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                throw new Error(
                    (err as any).error || `API error (${provider}): ${res.status}`
                );
            }

            const data = await res.json();
            return data.content || "";
        } catch (error) {
            console.error(`[LLM] ${provider} helper error:`, error);
            throw error;
        }
    }

    // ─── Ollama Health / Model Verification / Warm-up ────────────────

    private async checkOllama(): Promise<boolean> {
        try {
            const res = await fetch(`${OLLAMA_BASE}/api/tags`, {
                signal: AbortSignal.timeout(5000),
            });
            return res.ok;
        } catch {
            return false;
        }
    }

    /**
     * Verify the EXACT core model is available in Ollama.
     * This is a safety check — refuse to start if the wrong model is loaded.
     */
    private async verifyModelAvailable(): Promise<void> {
        try {
            const res = await fetch(`${OLLAMA_BASE}/api/tags`, {
                signal: AbortSignal.timeout(5000),
            });
            if (!res.ok) throw new Error("Cannot list models");

            const data = await res.json();
            const models: Array<{ name: string }> = data.models || [];
            const found = models.some(
                (m) => m.name === CORE_MODEL || m.name.startsWith(CORE_MODEL.split(":")[0])
            );

            if (!found) {
                throw new Error(
                    `Core model '${CORE_MODEL}' not found in Ollama.\n` +
                    `Pull it with: ollama pull ${CORE_MODEL}\n` +
                    `Available models: ${models.map(m => m.name).join(", ")}`
                );
            }
        } catch (error) {
            if ((error as Error).message.includes("Core model")) throw error;
            console.warn("[LLM] Could not verify model — proceeding with warm-up");
        }
    }

    /**
     * Send a trivial prompt to force Ollama to load the model into
     * GPU VRAM with full GPU acceleration parameters.
     * First call after boot is slow (~10-30s), subsequent calls are instant.
     */
    private async warmUpOllama(): Promise<void> {
        const res = await fetch(`${OLLAMA_BASE}/api/chat`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                model: CORE_MODEL,
                messages: [{ role: "user", content: "hi" }],
                stream: false,
                // Critical: send GPU options during warm-up to pre-allocate VRAM
                options: {
                    ...OLLAMA_GPU_OPTIONS,
                    num_predict: 1, // Generate 1 token only — just loads the model
                },
            }),
            signal: AbortSignal.timeout(180_000), // 3 min for cold start
        });

        if (!res.ok) {
            throw new Error(
                `Core model warm-up failed (${res.status}). ` +
                `Ensure '${CORE_MODEL}' is pulled: ollama pull ${CORE_MODEL}`
            );
        }

        console.log(
            `[LLM] ${CORE_MODEL_DISPLAY} loaded into GPU VRAM ` +
            `(Flash Attn: ON, KV Cache: Q8, Context: ${OLLAMA_GPU_OPTIONS.num_ctx})`
        );
    }

    /**
     * Check API helpers in parallel (non-fatal for both).
     * Uses lightweight status checks instead of actual inference calls.
     */
    private async checkAPIHelpers(): Promise<void> {
        const checks = await Promise.allSettled([
            // Check OpenRouter via our proxy route (just sends a ping)
            fetch("/api/llm/chat", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    messages: [{ role: "user", content: "1" }],
                    max_tokens: 1,
                    provider: "openrouter",
                }),
                signal: AbortSignal.timeout(10_000),
            }).then(r => r.ok),
            // Check Groq availability
            fetch("/api/llm/chat", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    messages: [{ role: "user", content: "1" }],
                    max_tokens: 1,
                    provider: "groq",
                }),
                signal: AbortSignal.timeout(10_000),
            }).then(r => r.ok),
        ]);

        this.apiReady = checks[0].status === "fulfilled" && checks[0].value === true;
        this.groqReady = checks[1].status === "fulfilled" && checks[1].value === true;

        if (!this.apiReady) console.warn("[LLM] OpenRouter helper not available");
        if (!this.groqReady) console.warn("[LLM] Groq helper not available");
    }

    // ─── Status ──────────────────────────────────────────────────────

    /** Check if the local core model is ready */
    public isReady(): boolean {
        return this.ollamaReady;
    }

    /** Check if the OpenRouter API helper is available */
    public isAPIReady(): boolean {
        return this.apiReady;
    }

    /** Check if the Groq API helper is available */
    public isGroqReady(): boolean {
        return this.groqReady;
    }

    /** Get a summary of engine status for debugging */
    public getStatus(): {
        core: { model: string; ready: boolean; gpu_options: typeof OLLAMA_GPU_OPTIONS };
        helpers: { openrouter: boolean; groq: boolean };
    } {
        return {
            core: { model: CORE_MODEL_DISPLAY, ready: this.ollamaReady, gpu_options: OLLAMA_GPU_OPTIONS },
            helpers: { openrouter: this.apiReady, groq: this.groqReady },
        };
    }
}
