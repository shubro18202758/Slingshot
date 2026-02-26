/**
 * NEXUS Intelligence Agent — Groq-knowledge-first version
 * 
 * Strategy:
 *   Stage 1 — Groq seeds clubs from training knowledge (always works)
 *   Stage 2 — Fetch + Groq enriches profiles where URLs are accessible  
 *   Stage 3 — Groq extracts tacit knowledge
 *   Profile-aware — reads student.university to auto-load home IIT
 */

import Groq from "groq-sdk";
import { IIT_SEED_REGISTRY, CATEGORY_KEYWORDS } from "./iit-registry";
import type { IITId } from "./iit-registry";

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

export interface ProgressEvent {
  stage: string;
  iitId: string;
  clubName?: string;
  progress: number;
  message: string;
  data?: unknown;
}

export interface NexusCrawlOptions {
  iitIds?: IITId[];
  maxClubsPerIIT?: number;
  delayBetweenRequestsMs?: number;
  preview?: boolean;
  stages?: ("discovery" | "profile" | "knowledge" | "embed")[];
}

function getGroqClient(): Groq {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) throw new Error("GROQ_API_KEY not set");
  return new Groq({ apiKey });
}

// ─── Stage 1: Discovery via Groq knowledge ─────────────────────────────────
// Groq knows all major IIT clubs from training data — much more reliable
// than scraping sites that block bots.

export async function runDiscoveryAgent(
  iitId: IITId,
  onProgress?: (e: ProgressEvent) => void
): Promise<DiscoveryResult> {
  const iit = IIT_SEED_REGISTRY.find((i) => i.id === iitId);
  if (!iit) throw new Error(`Unknown IIT: ${iitId}`);

  const groq = getGroqClient();
  const result: DiscoveryResult = { iitId, clubs: [], pagesVisited: 0, errors: [] };

  onProgress?.({ stage: "discovery", iitId, progress: 20, message: `Querying Groq knowledge for ${iit.fullName} clubs...` });

  try {
    const response = await groq.chat.completions.create({
      model: "llama-3.1-8b-instant",
      messages: [
        {
          role: "system",
          content: `You are a comprehensive database of Indian Institute of Technology (IIT) student clubs and societies.
Return ONLY a JSON object listing real, well-known student clubs at the specified IIT.
Format: { "clubs": [{ "name": "Club Name", "category": "technical|cultural|entrepreneurship|research|sports|social|media|hobby", "url": "website if known or empty string", "description": "1-2 sentence description" }] }
Include technical clubs, cultural clubs, entrepreneurship cells, research groups, sports clubs, media bodies.
List at least 20 clubs. Only include clubs you are confident exist at this institution.`,
        },
        {
          role: "user",
          content: `List all major student clubs and societies at ${iit.fullName} (${iit.city}). Include their websites if you know them.`,
        },
      ],
      temperature: 0.1,
      max_tokens: 3000,
      response_format: { type: "json_object" },
    });

    const content = response.choices[0]?.message?.content ?? "{}";
    const parsed = JSON.parse(content) as { clubs?: Array<{ name: string; url?: string; category?: string; description?: string }> };
    const clubs = parsed.clubs ?? [];

    for (const club of clubs) {
      if (club.name?.length > 1) {
        result.clubs.push({
          name: club.name.trim(),
          url: club.url ?? "",
          iitId,
        });
      }
    }

    // Also try to fetch the real directory page for extra clubs
    try {
      const urlsToTry = [iit.clubDirectoryUrl, ...(iit.fallbackUrls ?? [])].filter(Boolean);
      for (const url of urlsToTry) {
        const res = await fetch(url as string, {
          headers: { "User-Agent": "Mozilla/5.0 (compatible; NexusBot/1.0)" },
          signal: AbortSignal.timeout(8000),
        });
        if (res.ok) {
          const html = await res.text();
          const text = html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").slice(0, 4000);
          result.pagesVisited++;

          // Ask Groq to extract any additional clubs from the live page
          const liveResponse = await groq.chat.completions.create({
            model: "llama-3.1-8b-instant",
            messages: [
              { role: "system", content: `Extract club names and URLs from this website text. Return JSON: { "clubs": [{ "name": "string", "url": "string or empty" }] }` },
              { role: "user", content: text },
            ],
            temperature: 0.1,
            max_tokens: 1000,
            response_format: { type: "json_object" },
          });

          const liveParsed = JSON.parse(liveResponse.choices[0]?.message?.content ?? "{}") as { clubs?: Array<{ name: string; url?: string }> };
          for (const club of liveParsed.clubs ?? []) {
            if (club.name?.length > 1 && !result.clubs.find(c => c.name.toLowerCase() === club.name.toLowerCase())) {
              result.clubs.push({ name: club.name.trim(), url: resolveUrl(club.url, url as string), iitId });
            }
          }
          break;
        }
      }
    } catch {
      // Live fetch failed — Groq knowledge is sufficient
    }

  } catch (err) {
    result.errors.push(String(err));
    throw err;
  }

  result.clubs = deduplicateClubs(result.clubs);
  onProgress?.({ stage: "discovery", iitId, progress: 100, message: `Found ${result.clubs.length} clubs at ${iit.fullName}`, data: result.clubs });
  return result;
}

// ─── Stage 2: Profile enrichment ──────────────────────────────────────────────

export async function runProfileAgent(
  club: ClubLink,
  onProgress?: (e: ProgressEvent) => void
): Promise<ProfileResult> {
  const groq = getGroqClient();
  const iit = IIT_SEED_REGISTRY.find((i) => i.id === club.iitId);
  let rawPageText = "";

  // Try to fetch real page first
  if (club.url) {
    try {
      const res = await fetch(club.url, {
        headers: { "User-Agent": "Mozilla/5.0" },
        signal: AbortSignal.timeout(8000),
      });
      if (res.ok) {
        const html = await res.text();
        rawPageText = html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 6000);
      }
    } catch { /* use Groq knowledge instead */ }
  }

  onProgress?.({ stage: "profile", iitId: club.iitId, clubName: club.name, progress: 50, message: `Enriching ${club.name}...` });

  const contextPrompt = rawPageText
    ? `Page content:\n${rawPageText}`
    : `Use your knowledge about ${club.name} at ${iit?.fullName ?? club.iitId.toUpperCase()}.`;

  const response = await groq.chat.completions.create({
    model: "llama-3.1-8b-instant",
    messages: [
      {
        role: "system",
        content: `Return detailed info about this IIT student club as JSON:
{
  "name": "string",
  "tagline": "string",
  "description": "2-3 sentences",
  "category": "technical|cultural|entrepreneurship|research|sports|social|media|hobby",
  "instagramUrl": "string or null",
  "githubUrl": "string or null",
  "email": "string or null",
  "foundedYear": number or null,
  "memberCount": number or null,
  "isRecruiting": boolean,
  "tags": ["tag1", "tag2"],
  "events": [{ "title": "string", "description": "string", "eventType": "hackathon|workshop|talk|competition|recruitment", "registrationUrl": "string or null" }]
}`,
      },
      { role: "user", content: `Club: ${club.name} at ${iit?.fullName ?? club.iitId.toUpperCase()}\n${contextPrompt}` },
    ],
    temperature: 0.2,
    max_tokens: 1200,
    response_format: { type: "json_object" },
  }).catch(() => null);

  const data = response ? JSON.parse(response.choices[0]?.message?.content ?? "{}") as Record<string, unknown> : {};

  const profile: ClubProfile = {
    name: String(data.name ?? club.name),
    tagline: data.tagline ? String(data.tagline) : undefined,
    description: String(data.description ?? ""),
    category: String(data.category ?? inferCategory(club.name)),
    instagramUrl: data.instagramUrl ? String(data.instagramUrl) : undefined,
    githubUrl: data.githubUrl ? String(data.githubUrl) : undefined,
    email: data.email ? String(data.email) : undefined,
    foundedYear: data.foundedYear ? Number(data.foundedYear) : undefined,
    memberCount: data.memberCount ? Number(data.memberCount) : undefined,
    isRecruiting: Boolean(data.isRecruiting),
    tags: Array.isArray(data.tags) ? data.tags.map(String) : extractTags(club.name),
    websiteUrl: club.url || undefined,
  };

  const events: ClubEvent[] = (Array.isArray(data.events) ? data.events : []).map((e: Record<string, unknown>) => ({
    title: String(e.title ?? "Event"),
    description: String(e.description ?? ""),
    eventType: String(e.eventType ?? "event"),
    registrationUrl: e.registrationUrl ? String(e.registrationUrl) : undefined,
    rawText: JSON.stringify(e),
  }));

  return { profile, events, rawPageText: rawPageText || `${club.name} at ${iit?.fullName}`, sourceUrl: club.url || iit?.clubDirectoryUrl || "" };
}

// ─── Stage 3: Knowledge extraction ───────────────────────────────────────────

export async function runKnowledgeExtractor(
  clubName: string,
  iitName: string,
  rawPageText: string,
  sourceUrl: string,
  onProgress?: (e: ProgressEvent) => void
): Promise<KnowledgeResult> {
  const groq = getGroqClient();
  onProgress?.({ stage: "knowledge", iitId: "", clubName, progress: 20, message: `Extracting tacit knowledge...` });

  const response = await groq.chat.completions.create({
    model: "llama-3.1-8b-instant",
    messages: [
      {
        role: "system",
        content: `Extract TACIT knowledge about this IIT student club — info seniors know but isn't written down.
Return ONLY JSON:
{
  "summary": "2-3 sentence punchy summary for a student deciding whether to join",
  "knowledgeItems": [
    {
      "knowledgeType": "recruitment_criteria|project_highlight|culture_insight|skill_requirements|timeline|achievement|resource",
      "title": "short specific title",
      "content": "concrete, actionable content — not vague",
      "confidence": 0.7-1.0
    }
  ]
}
Generate 4-8 items covering: who gets selected, what you actually build, culture, skills needed, when to apply.`,
      },
      { role: "user", content: `Club: ${clubName} (${iitName})\n\n${rawPageText}` },
    ],
    temperature: 0.2,
    max_tokens: 2000,
    response_format: { type: "json_object" },
  }).catch(() => null);

  if (!response) return { knowledgeItems: [], summary: "" };

  const parsed = JSON.parse(response.choices[0]?.message?.content ?? "{}") as KnowledgeResult;
  const items = (parsed.knowledgeItems ?? [])
    .filter((i) => i.title && i.content)
    .map((i) => ({ ...i, sourceUrl, confidence: Math.min(1, Math.max(0, Number(i.confidence) || 0.7)) }));

  onProgress?.({ stage: "knowledge", iitId: "", clubName, progress: 100, message: `Extracted ${items.length} items` });
  return { knowledgeItems: items, summary: parsed.summary ?? "" };
}

// ─── Profile-aware auto-discovery ─────────────────────────────────────────────
// Reads the student profile to find their home IIT, returns it as primary IIT

export async function detectHomeIIT(universityName: string): Promise<IITId | null> {
  const lower = universityName.toLowerCase();
  const map: Record<string, IITId> = {
    "iit bombay": "iitb", "iitb": "iitb", "bombay": "iitb",
    "iit delhi": "iitd", "iitd": "iitd", "delhi": "iitd",
    "iit kanpur": "iitk", "iitk": "iitk", "kanpur": "iitk",
    "iit madras": "iitm", "iitm": "iitm", "madras": "iitm", "chennai": "iitm",
    "iit roorkee": "iitr", "iitr": "iitr", "roorkee": "iitr",
    "iit hyderabad": "iith", "iith": "iith", "hyderabad": "iith",
    "iit guwahati": "iitg", "iitg": "iitg", "guwahati": "iitg",
    "iit bhubaneswar": "iitbbs", "iitbbs": "iitbbs", "bhubaneswar": "iitbbs",
  };
  for (const [key, id] of Object.entries(map)) {
    if (lower.includes(key)) return id;
  }
  return null;
}

// ─── Search ───────────────────────────────────────────────────────────────────

export async function queryNexusKnowledge(
  userQuery: string,
  retrievedChunks: Array<{ clubName: string; iitId: string; content: string; knowledgeType: string }>
): Promise<string> {
  const groq = getGroqClient();
  const context = retrievedChunks
    .map((c) => `[${c.clubName} — ${c.iitId.toUpperCase()} — ${c.knowledgeType}]\n${c.content}`)
    .join("\n\n---\n\n");

  const response = await groq.chat.completions.create({
    model: "llama-3.1-8b-instant",
    messages: [
      { role: "system", content: "You are Nexus, an AI guide for IIT students. Answer using ONLY the provided context. Be specific and student-friendly." },
      { role: "user", content: `Context:\n${context}\n\nQuestion: ${userQuery}` },
    ],
    temperature: 0.4,
    max_tokens: 800,
  });
  return response.choices[0]?.message?.content ?? "Couldn't find relevant info.";
}

// ─── Pipeline orchestrator ────────────────────────────────────────────────────

export async function* runNexusPipeline(
  options: NexusCrawlOptions = {}
): AsyncGenerator<ProgressEvent & { type: "progress" | "result" | "error" | "done" }> {
  const {
    iitIds = IIT_SEED_REGISTRY.map((i) => i.id as IITId),
    maxClubsPerIIT = 20,
    delayBetweenRequestsMs = 800,
    stages = ["discovery", "profile", "knowledge"],
  } = options;

  const allResults: unknown[] = [];

  for (const iitId of iitIds) {
    const iit = IIT_SEED_REGISTRY.find((i) => i.id === iitId);
    if (!iit) continue;

    yield { type: "progress", stage: "discovery", iitId, progress: 0, message: `Starting ${iit.fullName}...` };

    let discoveredClubs: ClubLink[] = [];

    if (stages.includes("discovery")) {
      try {
        const discovery = await runDiscoveryAgent(iitId);
        discoveredClubs = discovery.clubs.slice(0, maxClubsPerIIT);
        yield { type: "result", stage: "discovery", iitId, progress: 25, message: `Discovered ${discoveredClubs.length} clubs at ${iit.fullName}`, data: discoveredClubs };
      } catch (err) {
        yield { type: "error", stage: "discovery", iitId, progress: 0, message: `Discovery failed: ${String(err)}` };
        continue;
      }
    }

    const iitResult = { iitId, clubs: [] as unknown[] };

    for (let i = 0; i < discoveredClubs.length; i++) {
      const club = discoveredClubs[i];
      const clubProgress = Math.round(25 + (i / discoveredClubs.length) * 70);

      yield { type: "progress", stage: "profile", iitId, clubName: club.name, progress: clubProgress, message: `Processing ${club.name} (${i + 1}/${discoveredClubs.length})` };

      const clubEntry: Record<string, unknown> = { link: club };

      if (stages.includes("profile")) {
        const profile = await runProfileAgent(club);
        clubEntry.profile = profile;
      }

      if (stages.includes("knowledge") && (clubEntry.profile as ProfileResult | undefined)?.rawPageText) {
        await sleep(400);
        const p = clubEntry.profile as ProfileResult;
        const knowledge = await runKnowledgeExtractor(club.name, iit.fullName, p.rawPageText, p.sourceUrl);
        clubEntry.knowledge = knowledge;
        yield { type: "result", stage: "knowledge", iitId, clubName: club.name, progress: clubProgress, message: `Extracted ${knowledge.knowledgeItems.length} knowledge items for ${club.name}`, data: clubEntry };
      }

      iitResult.clubs.push(clubEntry);
      if (i < discoveredClubs.length - 1) await sleep(delayBetweenRequestsMs);
    }

    allResults.push(iitResult);
    yield { type: "progress", stage: "done", iitId, progress: 100, message: `Completed ${iit.fullName}: ${iitResult.clubs.length} clubs`, data: iitResult };
  }

  yield { type: "done", stage: "pipeline", iitId: "all", progress: 100, message: `Nexus complete. Processed clubs across ${allResults.length} IITs.`, data: allResults };
}

// ─── Utilities ────────────────────────────────────────────────────────────────

function resolveUrl(url: string | undefined, base: string): string {
  if (!url) return "";
  try { return new URL(url, base).toString(); } catch { return url; }
}

function deduplicateClubs(clubs: ClubLink[]): ClubLink[] {
  const seen = new Set<string>();
  return clubs.filter((c) => { const k = c.name.toLowerCase().trim(); if (seen.has(k)) return false; seen.add(k); return true; });
}

function inferCategory(text: string): string {
  const lower = text.toLowerCase();
  for (const [cat, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    if (keywords.some((kw) => lower.includes(kw.toLowerCase()))) return cat;
  }
  return "other";
}

function extractTags(text: string): string[] {
  const tags = new Set<string>();
  const lower = text.toLowerCase();
  for (const kw of Object.values(CATEGORY_KEYWORDS).flat()) {
    if (kw.length > 3 && lower.includes(kw.toLowerCase())) tags.add(kw);
  }
  return Array.from(tags).slice(0, 8);
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}
