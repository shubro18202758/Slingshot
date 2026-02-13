import { CreateMLCEngine, MLCEngine, type InitProgressCallback } from "@mlc-ai/web-llm";

// ===================================================================
// DeepSeek-R1-0528-Qwen3-8B — DeepSeek R1 reasoning distilled into Qwen3-8B
// 4-bit quantization (~5.7GB), fits RTX 4070 (8GB VRAM)
// Uses the same WASM library as Qwen3-8B since they share architecture
// ===================================================================
const MODEL_ID = "DeepSeek-R1-0528-Qwen3-8B-q4f16_1-MLC";

// Custom model configuration — not in WebLLM's built-in catalog
const CUSTOM_APP_CONFIG = {
    model_list: [
        {
            model: "https://huggingface.co/mlc-ai/DeepSeek-R1-0528-Qwen3-8B-q4f16_1-MLC",
            model_id: MODEL_ID,
            model_lib:
                "https://raw.githubusercontent.com/mlc-ai/binary-mlc-llm-libs/main/web-llm-models/v0_2_80/Qwen3-8B-q4f16_1-ctx4k_cs1k-webgpu.wasm",
            overrides: {
                context_window_size: 4096,
            },
        },
    ],
};

export class LLMEngine {
    private static instance: LLMEngine;
    private engine: MLCEngine | null = null;
    private isInitializing = false;

    private constructor() { }

    public static getInstance(): LLMEngine {
        if (!LLMEngine.instance) {
            LLMEngine.instance = new LLMEngine();
        }
        return LLMEngine.instance;
    }

    public async initialize(
        progressCallback?: InitProgressCallback
    ): Promise<void> {
        if (this.engine) return;
        if (this.isInitializing) {
            throw new Error("LLM Engine is already initializing");
        }

        this.isInitializing = true;

        try {
            // VRAM Check (Estimate)
            const deviceMemory = (navigator as any).deviceMemory || 4;
            if (deviceMemory < 4) {
                console.warn("System RAM is low (<4GB). WebGPU LLM might fail or crash.");
            }

            // Check for WebGPU support
            if (!(navigator as any).gpu) {
                throw new Error("WebGPU is not supported on this device.");
            }

            // Initialize with custom model config
            this.engine = await CreateMLCEngine(
                MODEL_ID,
                {
                    initProgressCallback: progressCallback,
                    appConfig: CUSTOM_APP_CONFIG,
                } as any
            );
        } catch (error) {
            console.error("LLM Engine Initialization Failed:", error);
            this.engine = null;
            throw error;
        } finally {
            this.isInitializing = false;
        }
    }

    public async chat(
        messages: { role: "system" | "user" | "assistant"; content: string }[],
        tools?: any
    ): Promise<string> {
        if (!this.engine) {
            throw new Error("LLM Engine not initialized. Call initialize() first.");
        }

        try {
            const completion = await this.engine.chat.completions.create({
                messages: messages,
                temperature: 0.6,
                max_tokens: 2048,
            });

            return completion.choices[0]?.message?.content || "";
        } catch (error) {
            console.error("LLM Chat Error:", error);
            throw error;
        }
    }

    // Helper to check if ready
    public isReady(): boolean {
        return !!this.engine;
    }
}
