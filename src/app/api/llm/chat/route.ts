import { NextRequest, NextResponse } from "next/server";

// ===================================================================
// Multi-Provider LLM API Proxy
//
// Keeps ALL API keys server-side. Supports:
//   1. OpenRouter  → deepseek/deepseek-r1-0528 (full 671B R1)
//   2. Groq        → ultra-fast inference for lightweight tasks
//
// Client sends { provider: "openrouter" | "groq" } to select.
// Default: openrouter.
// ===================================================================

// ─── Provider Configs (all from env — never hardcoded) ───────────
const PROVIDERS = {
    openrouter: {
        apiKey: process.env.OPENROUTER_API_KEY,
        url: process.env.OPENROUTER_API_URL || "https://openrouter.ai/api/v1/chat/completions",
        model: process.env.OPENROUTER_MODEL_ID || "deepseek/deepseek-r1-0528",
        label: "OpenRouter",
    },
    groq: {
        apiKey: process.env.GROQ_API_KEY,
        url: "https://api.groq.com/openai/v1/chat/completions",
        model: process.env.GROQ_MODEL_ID || "qwen/qwen3-32b",
        label: "Groq",
    },
} as const;

type ProviderKey = keyof typeof PROVIDERS;

/** Derive app URL dynamically (production-safe) */
function getAppUrl(req: NextRequest): string {
    const proto = req.headers.get("x-forwarded-proto") || "http";
    const host = req.headers.get("host") || "localhost:3000";
    return process.env.NEXT_PUBLIC_APP_URL || `${proto}://${host}`;
}

/** Strip <think>...</think> reasoning tokens from DeepSeek R1 output. */
function stripThinkingTokens(text: string): string {
    return text.replace(/<think>[\s\S]*?<\/think>/g, "").trim();
}

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const {
            messages,
            temperature = 0.6,
            max_tokens = 4096,
            provider: providerName = "openrouter",
        } = body;

        // Validate provider
        if (!(providerName in PROVIDERS)) {
            return NextResponse.json(
                { error: `Unknown provider: ${providerName}. Use: ${Object.keys(PROVIDERS).join(", ")}` },
                { status: 400 }
            );
        }

        const provider = PROVIDERS[providerName as ProviderKey];

        if (!provider.apiKey) {
            return NextResponse.json(
                { error: `${provider.label} API key not configured. Add ${providerName === "groq" ? "GROQ_API_KEY" : "OPENROUTER_API_KEY"} to .env.local` },
                { status: 500 }
            );
        }

        if (!Array.isArray(messages) || messages.length === 0) {
            return NextResponse.json(
                { error: "messages array is required" },
                { status: 400 }
            );
        }

        // Build headers based on provider
        const headers: Record<string, string> = {
            "Content-Type": "application/json",
            Authorization: `Bearer ${provider.apiKey}`,
        };

        if (providerName === "openrouter") {
            headers["HTTP-Referer"] = getAppUrl(req);
            headers["X-Title"] = "Slingshot";
        }

        const response = await fetch(provider.url, {
            method: "POST",
            headers,
            body: JSON.stringify({
                model: provider.model,
                messages,
                temperature,
                max_tokens,
            }),
        });

        if (!response.ok) {
            const errText = await response.text();
            console.error(
                `[LLM API] ${provider.label} error ${response.status}:`,
                errText
            );
            return NextResponse.json(
                { error: `${provider.label} API error: ${response.status}` },
                { status: response.status }
            );
        }

        const data = await response.json();

        const rawContent = data.choices?.[0]?.message?.content || "";
        const reasoningContent =
            data.choices?.[0]?.message?.reasoning_content || null;
        const content = stripThinkingTokens(rawContent);

        return NextResponse.json({
            content,
            reasoning: reasoningContent,
            model: data.model,
            provider: providerName,
            usage: data.usage,
        });
    } catch (error) {
        console.error("[LLM API] Error:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
