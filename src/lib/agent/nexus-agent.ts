/**
 * NEXUS Intelligence Agent
 * ─────────────────────────────────────────────────────────────────────────────
 * A multi-stage agentic pipeline that crawls IIT club ecosystems and extracts
 * structured knowledge using Stagehand (browser automation) + Groq (LLM).
 *
 * Pipeline stages:
 *   Stage 1 — Discovery:  Find all club links on an IIT's directory page
 *   Stage 2 — Profiling:  Extract structured club data from each club's page
 *   Stage 3 — Knowledge:  Groq extracts tacit know-how (recruitment, projects, culture)
 *   Stage 4 — Embedding:  all-MiniLM-L6-v2 creates pgvector embeddings
 *
 * Design principles:
 *   • Fail gracefully — partial data is better than no data
 *   • Rate-limit aware — configurable delays between requests
 *   • Human-in-the-loop — preview mode before committing to DB
 *   • Resumable — tracks crawl state per club, can restart from failure
 */

import Groq from "groq-sdk";
import { IIT_SEED_REGISTRY, CATEGORY_KEYWORDS, type IITId } from "./iit-registry";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ClubLink {
  name: string;
  url: string;
  iitId: string;
}

export interface ClubProfile {
  name: string;
  shortName?: string;
  category: string;
  description: string;
  tagline?: string;
  websiteUrl?: string;
  instagramUrl?: string;
  linkedinUrl?: string;
  githubUrl?: string;
  email?: string;
  tags: string[];
  memberCount?: number;
  foundedYear?: number;
  isRecruiting: boolean;
  recruitmentDeadline?: string;
  logoUrl?: string;
}

export interface ClubKnowledgeItem {
  knowledgeType: string;
  title: string;
  content: string;
  sourceUrl?: string;
  confidence: number;
  structuredData?: Record<string, unknown>;
}

export interface ClubEvent {
  title: string;
  description?: string;
  eventType: string;
  startDate?: string;
  endDate?: string;
  registrationUrl?: string;
  prizePool?: string;
  venue?: string;
  rawText: string;
}

export interface DiscoveryResult {
  iitId: string;
  clubs: ClubLink[];
  pagesVisited: number;
  errors: string[];
}

export interface ProfileResult {
  profile: ClubProfile;
  events: ClubEvent[];
  rawPageText: string;
  sourceUrl: string;
}

export interface KnowledgeResult {
  knowledgeItems: ClubKnowledgeItem[];
  summary: string;
}

export interface NexusCrawlOptions {
  iitIds?: IITId[];                  // Which IITs to crawl (default: all)
  maxClubsPerIIT?: number;           // Cap for rate limiting
  delayBetweenRequestsMs?: number;   // Politeness delay
  preview?: boolean;                 // Don't write to DB, just return data
  stages?: ("discovery" | "profile" | "knowledge" | "embed")[];
  onProgress?: (event: ProgressEvent) => void;
}

export interface ProgressEvent {
  stage: string;
  iitId: string;
  clubName?: string;
  progress: number;                  // 0-100
  message: string;
  data?: unknown;
}

// ─── Groq Client ──────────────────────────────────────────────────────────────

function getGroqClient(): Groq {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) throw new Error("GROQ_API_KEY not set in environment");
  return new Groq({ apiKey });
}

// ─── Stage 1: Discovery Agent ─────────────────────────────────────────────────

/**
 * Uses Stagehand to navigate to an IIT's club directory and extract all club links.
 * Handles both structured lists and unstructured HTML via LLM-powered extraction.
 */
export async function runDiscoveryAgent(
  iitId: IITId,
  onProgress?: (e: ProgressEvent) => void
): Promise<DiscoveryResult> {
  const iit = IIT_SEED_REGISTRY.find((i) => i.id === iitId);
  if (!iit) throw new Error(`Unknown IIT: ${iitId}`);

  const result: DiscoveryResult = {
    iitId,
    clubs: [],
    pagesVisited: 0,
    errors: [],
  };

  // Dynamic import — Stagehand is server-only
  const { Stagehand } = await import("@browserbasehq/stagehand");

  const stagehand = new Stagehand({
    env: "LOCAL",
    verbose: false,
    enableCaching: true,
  });

  try {
    await stagehand.init();
    const page = stagehand.page;

    const urlsToTry = [iit.clubDirectoryUrl, ...iit.fallbackUrls].filter(Boolean);

    for (const url of urlsToTry) {
      try {
        onProgress?.({
          stage: "discovery",
          iitId,
          progress: 10,
          message: `Navigating to ${url}`,
        });

        await page.goto(url as string, { waitUntil: "networkidle", timeout: 30000 });
        result.pagesVisited++;

        // Use Stagehand's AI-powered extraction to find all club entries
        const extracted = await stagehand.extract({
          instruction:
            "Extract a list of all student clubs mentioned on this page. " +
            "For each club, find its name and any link to its own page. " +
            "Return as many clubs as possible — do not skip any.",
          schema: {
            type: "object",
            properties: {
              clubs: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    name: { type: "string" },
                    url: { type: "string" },
                  },
                  required: ["name"],
                },
              },
            },
          },
        });

        const clubs = (extracted as { clubs?: Array<{ name: string; url?: string }> })?.clubs ?? [];

        for (const club of clubs) {
          if (club.name && club.name.length > 1) {
            result.clubs.push({
              name: club.name.trim(),
              url: resolveUrl(club.url, url),
              iitId,
            });
          }
        }

        if (result.clubs.length > 0) {
          onProgress?.({
            stage: "discovery",
            iitId,
            progress: 80,
            message: `Found ${result.clubs.length} clubs at ${iit.fullName}`,
            data: result.clubs,
          });
          break; // Success — no need to try fallback URLs
        }
      } catch (err) {
        result.errors.push(`Failed to crawl ${url}: ${String(err)}`);
      }
    }
  } finally {
    await stagehand.close();
  }

  // Deduplicate by name
  result.clubs = deduplicateClubs(result.clubs);

  onProgress?.({
    stage: "discovery",
    iitId,
    progress: 100,
    message: `Discovery complete: ${result.clubs.length} unique clubs found`,
    data: result.clubs,
  });

  return result;
}

// ─── Stage 2: Profile Agent ────────────────────────────────────────────────────

/**
 * Visits a club's page and extracts a structured profile.
 * Also checks their Instagram/GitHub if linked.
 */
export async function runProfileAgent(
  club: ClubLink,
  onProgress?: (e: ProgressEvent) => void
): Promise<ProfileResult | null> {
  if (!club.url) {
    return createMinimalProfile(club);
  }

  const { Stagehand } = await import("@browserbasehq/stagehand");

  const stagehand = new Stagehand({
    env: "LOCAL",
    verbose: false,
    enableCaching: true,
  });

  try {
    await stagehand.init();
    const page = stagehand.page;

    onProgress?.({
      stage: "profile",
      iitId: club.iitId,
      clubName: club.name,
      progress: 20,
      message: `Visiting ${club.url}`,
    });

    await page.goto(club.url, { waitUntil: "networkidle", timeout: 25000 });

    // Capture raw text for the knowledge stage
    const rawPageText = await page.evaluate(
      () => document.body.innerText?.slice(0, 8000) ?? ""
    );

    // Extract structured profile using Stagehand
    const extracted = await stagehand.extract({
      instruction:
        "Extract all information about this student club. " +
        "Find the club's full name, tagline/motto, description, category (technical/cultural/sports/etc), " +
        "social media links (Instagram, LinkedIn, GitHub), email, founding year, " +
        "approximate member count, whether they are currently recruiting, " +
        "and any upcoming events or hackathons. Be thorough.",
      schema: {
        type: "object",
        properties: {
          name: { type: "string" },
          tagline: { type: "string" },
          description: { type: "string" },
          instagramUrl: { type: "string" },
          linkedinUrl: { type: "string" },
          githubUrl: { type: "string" },
          email: { type: "string" },
          foundedYear: { type: "number" },
          memberCount: { type: "number" },
          isRecruiting: { type: "boolean" },
          recruitmentDeadline: { type: "string" },
          events: {
            type: "array",
            items: {
              type: "object",
              properties: {
                title: { type: "string" },
                date: { type: "string" },
                description: { type: "string" },
                registrationUrl: { type: "string" },
              },
            },
          },
        },
      },
    });

    const data = extracted as Record<string, unknown>;

    const profile: ClubProfile = {
      name: String(data.name ?? club.name),
      tagline: String(data.tagline ?? ""),
      description: String(data.description ?? ""),
      category: inferCategory(club.name + " " + String(data.description ?? "")),
      instagramUrl: String(data.instagramUrl ?? ""),
      linkedinUrl: String(data.linkedinUrl ?? ""),
      githubUrl: String(data.githubUrl ?? ""),
      email: String(data.email ?? ""),
      foundedYear: Number(data.foundedYear) || undefined,
      memberCount: Number(data.memberCount) || undefined,
      isRecruiting: Boolean(data.isRecruiting),
      recruitmentDeadline: String(data.recruitmentDeadline ?? ""),
      tags: extractTags(club.name + " " + String(data.description ?? "")),
    };

    const rawEvents = Array.isArray(data.events) ? data.events : [];
    const events: ClubEvent[] = rawEvents.map((e: Record<string, unknown>) => ({
      title: String(e.title ?? "Untitled Event"),
      description: String(e.description ?? ""),
      eventType: inferEventType(String(e.title ?? "")),
      startDate: String(e.date ?? ""),
      registrationUrl: String(e.registrationUrl ?? ""),
      rawText: JSON.stringify(e),
    }));

    onProgress?.({
      stage: "profile",
      iitId: club.iitId,
      clubName: club.name,
      progress: 100,
      message: `Profile extracted: ${profile.name}`,
      data: profile,
    });

    return { profile, events, rawPageText, sourceUrl: club.url };
  } catch (err) {
    console.error(`Profile agent failed for ${club.name}:`, err);
    return createMinimalProfile(club);
  } finally {
    await stagehand.close();
  }
}

// ─── Stage 3: Knowledge Extractor (Groq) ──────────────────────────────────────

/**
 * The crown jewel — uses Groq's fast inference to extract TACIT knowledge
 * from raw page text: recruitment criteria, project highlights, culture,
 * skill requirements, and more.
 */
export async function runKnowledgeExtractor(
  clubName: string,
  iitName: string,
  rawPageText: string,
  sourceUrl: string,
  onProgress?: (e: ProgressEvent) => void
): Promise<KnowledgeResult> {
  const groq = getGroqClient();

  onProgress?.({
    stage: "knowledge",
    iitId: "",
    clubName,
    progress: 20,
    message: `Extracting tacit knowledge for ${clubName}...`,
  });

  const systemPrompt = `You are an expert at extracting structured knowledge about student clubs at IIT (Indian Institutes of Technology).
Your task is to analyze raw text from a club's webpage and extract TACIT KNOWLEDGE — the kind of information that isn't immediately obvious but is extremely valuable for students considering joining the club.

Focus on extracting:
1. RECRUITMENT CRITERIA — What skills, experience, or portfolio is typically needed to join?
2. PROJECT HIGHLIGHTS — What are the club's most notable projects, achievements, or creations?
3. CULTURE INSIGHTS — What is the working culture like? Casual vs intense? Collaborative vs competitive?
4. SKILL REQUIREMENTS — What technical or soft skills will you gain or need?
5. TIMELINE — When do they recruit? Semester 1 or 2? First year or all years?
6. ACHIEVEMENTS — Awards, competitions won, rankings, publications
7. RESOURCES — GitHub repos, documentation, learning materials they offer

Return a JSON object with this exact structure:
{
  "summary": "A 2-3 sentence punchy summary of this club for a student deciding whether to apply",
  "knowledgeItems": [
    {
      "knowledgeType": "recruitment_criteria|project_highlight|culture_insight|skill_requirements|timeline|achievement|resource",
      "title": "Short descriptive title",
      "content": "Detailed, specific content. Be concrete — avoid vague statements.",
      "confidence": 0.0-1.0,
      "structuredData": {}
    }
  ]
}

Generate between 3-8 knowledge items. Only include items you can extract from the text — never hallucinate.`;

  const userPrompt = `Club: ${clubName} (${iitName})
Source: ${sourceUrl}

Page Content:
${rawPageText.slice(0, 6000)}

Extract the tacit knowledge. Return ONLY valid JSON.`;

  try {
    const response = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.2,
      max_tokens: 2000,
      response_format: { type: "json_object" },
    });

    const content = response.choices[0]?.message?.content ?? "{}";
    const parsed = JSON.parse(content) as KnowledgeResult;

    // Validate and normalize
    const items: ClubKnowledgeItem[] = (parsed.knowledgeItems ?? [])
      .filter((item) => item.title && item.content && item.knowledgeType)
      .map((item) => ({
        ...item,
        sourceUrl,
        confidence: Math.min(1, Math.max(0, item.confidence ?? 0.7)),
      }));

    onProgress?.({
      stage: "knowledge",
      iitId: "",
      clubName,
      progress: 100,
      message: `Extracted ${items.length} knowledge items`,
      data: items,
    });

    return {
      knowledgeItems: items,
      summary: parsed.summary ?? "",
    };
  } catch (err) {
    console.error("Knowledge extraction failed:", err);
    return { knowledgeItems: [], summary: "" };
  }
}

// ─── Orchestrator: Full Pipeline ───────────────────────────────────────────────

/**
 * Runs the complete Nexus pipeline for one or more IITs.
 * Yields progress events — designed to be called from a Server-Sent Events
 * API route for real-time UI updates.
 */
export async function* runNexusPipeline(
  options: NexusCrawlOptions = {}
): AsyncGenerator<ProgressEvent & { type: "progress" | "result" | "error" | "done" }> {
  const {
    iitIds = IIT_SEED_REGISTRY.map((i) => i.id as IITId),
    maxClubsPerIIT = 30,
    delayBetweenRequestsMs = 2000,
    stages = ["discovery", "profile", "knowledge"],
  } = options;

  const allResults: {
    iitId: string;
    clubs: Array<{ link: ClubLink; profile?: ProfileResult; knowledge?: KnowledgeResult }>;
  }[] = [];

  for (const iitId of iitIds) {
    const iit = IIT_SEED_REGISTRY.find((i) => i.id === iitId);
    if (!iit) continue;

    yield { type: "progress", stage: "discovery", iitId, progress: 0, message: `Starting ${iit.fullName}...` };

    // Stage 1 — Discovery
    let discoveredClubs: ClubLink[] = [];
    if (stages.includes("discovery")) {
      try {
        const discovery = await runDiscoveryAgent(iitId, (e) => {
          // Can't yield in callback, so we just log
          console.log(`[${iitId}] Discovery:`, e.message);
        });
        discoveredClubs = discovery.clubs.slice(0, maxClubsPerIIT);

        yield {
          type: "result",
          stage: "discovery",
          iitId,
          progress: 25,
          message: `Discovered ${discoveredClubs.length} clubs at ${iit.fullName}`,
          data: discoveredClubs,
        };
      } catch (err) {
        yield {
          type: "error",
          stage: "discovery",
          iitId,
          progress: 0,
          message: `Discovery failed for ${iit.fullName}: ${String(err)}`,
        };
        continue;
      }
    }

    const iitResult = { iitId, clubs: [] as typeof allResults[0]["clubs"] };

    // Stages 2 & 3 — Profile + Knowledge (per club)
    for (let i = 0; i < discoveredClubs.length; i++) {
      const club = discoveredClubs[i];
      const clubProgress = Math.round(25 + (i / discoveredClubs.length) * 70);

      yield {
        type: "progress",
        stage: "profile",
        iitId,
        clubName: club.name,
        progress: clubProgress,
        message: `Processing ${club.name} (${i + 1}/${discoveredClubs.length})`,
      };

      const clubEntry: typeof iitResult.clubs[0] = { link: club };

      // Stage 2 — Profile
      if (stages.includes("profile")) {
        const profile = await runProfileAgent(club);
        if (profile) clubEntry.profile = profile;
      }

      // Stage 3 — Knowledge (needs raw text from profile stage)
      if (stages.includes("knowledge") && clubEntry.profile?.rawPageText) {
        await sleep(500); // Brief pause before Groq call
        const knowledge = await runKnowledgeExtractor(
          club.name,
          iit.fullName,
          clubEntry.profile.rawPageText,
          clubEntry.profile.sourceUrl
        );
        clubEntry.knowledge = knowledge;

        yield {
          type: "result",
          stage: "knowledge",
          iitId,
          clubName: club.name,
          progress: clubProgress,
          message: `Extracted ${knowledge.knowledgeItems.length} knowledge items for ${club.name}`,
          data: clubEntry,
        };
      }

      iitResult.clubs.push(clubEntry);

      // Politeness delay between clubs
      if (i < discoveredClubs.length - 1) {
        await sleep(delayBetweenRequestsMs);
      }
    }

    allResults.push(iitResult);

    yield {
      type: "progress",
      stage: "done",
      iitId,
      progress: 100,
      message: `Completed ${iit.fullName}: ${iitResult.clubs.length} clubs processed`,
      data: iitResult,
    };
  }

  yield {
    type: "done",
    stage: "pipeline",
    iitId: "all",
    progress: 100,
    message: `Nexus pipeline complete. Processed ${allResults.reduce((s, r) => s + r.clubs.length, 0)} clubs across ${allResults.length} IITs.`,
    data: allResults,
  };
}

// ─── Groq Quick Search ─────────────────────────────────────────────────────────

/**
 * Natural language search over the club knowledge base.
 * Used by the Nexus chat interface — sends query + retrieved chunks to Groq.
 */
export async function queryNexusKnowledge(
  userQuery: string,
  retrievedChunks: Array<{ clubName: string; iitId: string; content: string; knowledgeType: string }>
): Promise<string> {
  const groq = getGroqClient();

  const context = retrievedChunks
    .map((c) => `[${c.clubName} — ${c.iitId.toUpperCase()} — ${c.knowledgeType}]\n${c.content}`)
    .join("\n\n---\n\n");

  const response = await groq.chat.completions.create({
    model: "llama-3.3-70b-versatile",
    messages: [
      {
        role: "system",
        content:
          "You are Nexus, an AI guide for IIT students exploring clubs. " +
          "You have access to a knowledge base about clubs across IITs. " +
          "Answer the student's question using ONLY the provided context. " +
          "Be specific, honest, and student-friendly. " +
          "If the context doesn't have enough info, say so rather than guessing.",
      },
      {
        role: "user",
        content: `Context from Nexus knowledge base:\n${context}\n\nStudent question: ${userQuery}`,
      },
    ],
    temperature: 0.4,
    max_tokens: 800,
  });

  return response.choices[0]?.message?.content ?? "I couldn't find relevant information in the knowledge base.";
}

// ─── Utilities ─────────────────────────────────────────────────────────────────

function resolveUrl(url: string | undefined, base: string): string {
  if (!url) return "";
  try {
    return new URL(url, base).toString();
  } catch {
    return url;
  }
}

function deduplicateClubs(clubs: ClubLink[]): ClubLink[] {
  const seen = new Set<string>();
  return clubs.filter((c) => {
    const key = c.name.toLowerCase().trim();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function inferCategory(text: string): string {
  const lower = text.toLowerCase();
  for (const [cat, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    if (keywords.some((kw) => lower.includes(kw.toLowerCase()))) {
      return cat;
    }
  }
  return "other";
}

function extractTags(text: string): string[] {
  const tags = new Set<string>();
  const allKeywords = Object.values(CATEGORY_KEYWORDS).flat();
  const lower = text.toLowerCase();
  for (const kw of allKeywords) {
    if (lower.includes(kw.toLowerCase()) && kw.length > 3) {
      tags.add(kw);
    }
  }
  return Array.from(tags).slice(0, 8);
}

function inferEventType(title: string): string {
  const lower = title.toLowerCase();
  if (lower.includes("hackathon") || lower.includes("hack")) return "hackathon";
  if (lower.includes("workshop")) return "workshop";
  if (lower.includes("talk") || lower.includes("lecture") || lower.includes("seminar")) return "talk";
  if (lower.includes("recruit") || lower.includes("selection") || lower.includes("open house")) return "recruitment";
  if (lower.includes("competition") || lower.includes("contest")) return "competition";
  return "event";
}

function createMinimalProfile(club: ClubLink): ProfileResult {
  return {
    profile: {
      name: club.name,
      description: "",
      category: inferCategory(club.name),
      tags: extractTags(club.name),
      isRecruiting: false,
    },
    events: [],
    rawPageText: "",
    sourceUrl: club.url,
  };
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}
