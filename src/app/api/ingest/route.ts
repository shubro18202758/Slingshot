import { NextResponse } from "next/server";
import { serverDb } from "@/lib/server-db";
import { students, opportunities, events } from "@/db/schema";
import { eq } from "drizzle-orm";
import OpenAI from "openai";
import { AI_CONFIG } from "@/lib/ai/config";

const Groq = require("groq-sdk");

// Initialize OpenAI client for Local LLM
const localLLM = new OpenAI({
    baseURL: AI_CONFIG.BASE_URL,
    apiKey: "ollama",
});

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { content, text, url, source, metadata } = body;
        const messageContent = content || text || "";
        const msgDate = metadata?.timestamp ? new Date(metadata.timestamp).toISOString() : new Date().toISOString();

        console.log(`📥 Ingest Received from ${source}: ${url || "No URL"}`);

        // 1. Database Lookup: Fetch Student Profile
        const allStudents = await serverDb.select().from(students).limit(1);
        const student = allStudents.length > 0 ? allStudents[0] : { major: "Undecided" as string | null, transcript: "" as string | null };
        const profile_summary = `Major: ${student.major || "Undecided"}, Interests: ${student.transcript ? student.transcript.substring(0, 100) + "..." : "None"}`;

        // Helper to parse date
        const safeDate = (dateStr: string | null): Date | null => {
            if (!dateStr) return null;
            const d = new Date(dateStr);
            return isNaN(d.getTime()) ? null : d;
        };

        // 2. Inference (Groq Preferred, Fallback to Local)
        let analysis;
        const groqApiKey = process.env.GROQ_API_KEY;

        const prompt = `You are an Event Scout. Analyze this message: '${messageContent}'. 
        Message sent on: ${msgDate} (Use this as 'today' reference).
        The student profile is: ${profile_summary}.
        
        Extract the following fields in JSON:
        {
            "is_event": boolean,
            "relevance_score": 0-100 (>= 40 if event, even if vague),
            "event_type": "hackathon"|"workshop"|"other",
            "title": string (short event title),
            "description": string (summary),
            "event_date": string (ISO 8601 YYYY-MM-DD format. CALCULATE the actual date relative to sent date. Do NOT return 'Saturday' or relative terms. If unsure, return null),
            "location": string (or 'Virtual'),
            "summary": string (reasoning)
        }
        Return ONLY valid JSON.`;

        if (groqApiKey) {
            console.log("🧠 Querying Groq (Llama 3.3)...");
            const groq = new Groq({ apiKey: groqApiKey });
            const completion = await groq.chat.completions.create({
                messages: [
                    { role: "system", content: "You are a helpful assistant that outputs JSON." },
                    { role: "user", content: prompt }
                ],
                model: "llama-3.3-70b-versatile",
                temperature: 0,
                response_format: { type: "json_object" }
            });
            analysis = JSON.parse(completion.choices[0]?.message?.content || "{}");
        } else {
            console.log(`🧠 Querying Local LLM (${AI_CONFIG.LOCAL_MODEL_NAME})...`);
            const completion = await localLLM.chat.completions.create({
                model: AI_CONFIG.LOCAL_MODEL_NAME,
                messages: [
                    { role: "system", content: "You are a helpful assistant that outputs JSON." },
                    { role: "user", content: prompt }
                ],
                temperature: AI_CONFIG.TEMPERATURE,
            });
            const raw = completion.choices[0].message.content || "{}";
            const jsonStr = raw.replace(/```json/g, "").replace(/```/g, "").replace(/<think>[\s\S]*?<\/think>/g, "").trim();
            analysis = JSON.parse(jsonStr);
        }

        console.log("🤖 Analysis Result:", analysis);

        // 3. Decision Logic
        if (analysis.is_event && analysis.relevance_score >= 40) {
            // Save to Events Table (Calendar)
            // Fix: ensure eventDate is parsed safely
            const finalEventDate = safeDate(analysis.event_date);

            await serverDb.insert(events).values({
                source: (source as any) || "WhatsApp",
                title: analysis.title || "Untitled Event",
                description: analysis.description,
                eventDate: finalEventDate,
                url: url || null,
                rawContext: messageContent,
                metadata: { ...metadata, location: analysis.location },
                status: "Detected",
                priority: analysis.relevance_score > 80 ? 3 : 2,
            });

            // Also Save to Opportunities (Lead Pipeline) - Optional, but keeping for backward compat
            if (url) {
                await serverDb.insert(opportunities).values({
                    url: url,
                    source: source || "Unknown",
                    content: messageContent,
                    aiSummary: analysis.summary,
                    relevanceScore: analysis.relevance_score,
                    eventType: analysis.event_type,
                    status: "pending",
                }).onConflictDoNothing(); // Prevent dups if URL exists
            }

            console.log("✅ Event Saved!");
            return NextResponse.json({ status: "saved", type: analysis.event_type });
        } else {
            console.log("🗑️ Discarded as Noise");
            return NextResponse.json({ status: "discarded", reason: "noise" });
        }

    } catch (error) {
        console.error("❌ Ingestion Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
