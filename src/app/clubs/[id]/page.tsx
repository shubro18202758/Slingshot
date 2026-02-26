"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";

const KNOWLEDGE_STYLE: Record<string, { label: string; icon: string; color: string }> = {
  recruitment_criteria: { label: "Recruitment",  icon: "🎯", color: "#f59e0b" },
  project_highlight:    { label: "Projects",     icon: "🔧", color: "#00d4ff" },
  culture_insight:      { label: "Culture",      icon: "✨", color: "#a855f7" },
  skill_requirements:   { label: "Skills",       icon: "⚙️", color: "#22c55e" },
  timeline:             { label: "Timeline",     icon: "📅", color: "#ec4899" },
  achievement:          { label: "Achievement",  icon: "🏆", color: "#f59e0b" },
  resource:             { label: "Resources",    icon: "📚", color: "#14b8a6" },
};

const IIT_COLORS: Record<string, string> = {
  iitb: "#00d4ff", iitd: "#f59e0b", iitk: "#22c55e",
  iitm: "#ef4444", iitr: "#ec4899", iith: "#8b5cf6",
  iitg: "#14b8a6", iitbbs: "#f97316",
};

export default function ClubDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [club, setClub] = useState<Record<string, unknown> | null>(null);
  const [knowledge, setKnowledge] = useState<Record<string, unknown>[]>([]);
  const [events, setEvents] = useState<Record<string, unknown>[]>([]);
  const [activeTab, setActiveTab] = useState<"knowledge" | "events" | "about">("knowledge");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setIsLoading(true);
      try {
        const [clubRes, kRes, eRes] = await Promise.all([
          fetch(`/api/clubs/crawl?limit=200`),
          fetch(`/api/clubs/${id}/knowledge`),
          fetch(`/api/clubs/${id}/events`),
        ]);
        const clubData = await clubRes.json();
        const found = (clubData.clubs ?? []).find((c: Record<string, unknown>) => c.id === id);
        setClub(found ?? null);

        const kData = await kRes.json();
        const eData = await eRes.json();
        setKnowledge(kData.items ?? []);
        setEvents(eData.events ?? []);
      } finally {
        setIsLoading(false);
      }
    }
    load();
  }, [id]);

  const accentColor = IIT_COLORS[String(club?.iitId ?? "")] ?? "#00d4ff";

  if (isLoading) return (
    <div className="min-h-screen bg-[#0d1117] flex items-center justify-center">
      <motion.div animate={{ rotate: 360 }} transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
        className="text-4xl" style={{ color: "#00d4ff" }}>⬡</motion.div>
    </div>
  );

  if (!club) return (
    <div className="min-h-screen bg-[#0d1117] flex items-center justify-center text-gray-500 font-mono">
      Club not found. <Link href="/clubs" className="ml-2 text-cyan-400 underline">← Back to Nexus</Link>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#0d1117] text-white">
      {/* Ambient glow */}
      <div className="pointer-events-none fixed top-0 left-1/2 -translate-x-1/2 w-[600px] h-[250px] rounded-full opacity-10 blur-[100px]"
        style={{ background: `radial-gradient(ellipse at center, ${accentColor}, transparent 70%)` }} />

      <div className="relative max-w-4xl mx-auto px-4 py-8">

        {/* Back button */}
        <Link href="/clubs">
          <motion.button whileHover={{ x: -3 }}
            className="flex items-center gap-2 text-xs font-mono text-gray-500 hover:text-white mb-8 transition-colors">
            ← Back to Nexus
          </motion.button>
        </Link>

        {/* Hero */}
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}
          className="p-6 rounded-2xl border mb-8"
          style={{ background: `linear-gradient(135deg, ${accentColor}08, #0d1117)`, borderColor: `${accentColor}33` }}>

          <div className="flex items-start gap-5">
            <div className="w-16 h-16 rounded-xl flex items-center justify-center text-3xl flex-shrink-0"
              style={{ background: `${accentColor}15`, border: `1px solid ${accentColor}33` }}>
              {String(club.category ?? "").includes("technical") ? "⚙️"
                : String(club.category ?? "").includes("cultural") ? "🎭"
                : String(club.category ?? "").includes("entrepreneurship") ? "🚀"
                : String(club.category ?? "").includes("research") ? "🔬"
                : String(club.category ?? "").includes("sports") ? "🏆"
                : "⬡"}
            </div>

            <div className="flex-1">
              <div className="flex items-center gap-3 flex-wrap mb-1">
                <h1 className="text-3xl font-black text-white">{String(club.name)}</h1>
                {club.isRecruiting === "true" && (
                  <motion.span animate={{ opacity: [1, 0.4, 1] }} transition={{ duration: 2, repeat: Infinity }}
                    className="text-xs font-mono px-2 py-1 rounded-full"
                    style={{ background: "#22c55e22", color: "#22c55e", border: "1px solid #22c55e44" }}>
                    ● RECRUITING
                  </motion.span>
                )}
              </div>
              <p className="text-sm font-mono mb-2" style={{ color: accentColor }}>
                {String(club.iitId ?? "").toUpperCase()} · {String(club.category ?? "")}
                {club.foundedYear ? ` · Est. ${club.foundedYear}` : ""}
              </p>
              <p className="text-gray-300 text-sm leading-relaxed">{String(club.tagline || club.description || "")}</p>
            </div>
          </div>

          {/* Stats row */}
          <div className="flex gap-4 mt-5 pt-4 border-t flex-wrap" style={{ borderColor: `${accentColor}22` }}>
            {club.memberCount && (
              <div className="text-center">
                <p className="text-lg font-bold" style={{ color: accentColor }}>{String(club.memberCount)}</p>
                <p className="text-[10px] font-mono text-gray-500">MEMBERS</p>
              </div>
            )}
            <div className="text-center">
              <p className="text-lg font-bold" style={{ color: "#a855f7" }}>{knowledge.length}</p>
              <p className="text-[10px] font-mono text-gray-500">KNOWLEDGE ITEMS</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-bold" style={{ color: "#22c55e" }}>{events.length}</p>
              <p className="text-[10px] font-mono text-gray-500">EVENTS</p>
            </div>
          </div>

          {/* Links */}
          <div className="flex gap-3 mt-4 flex-wrap">
            {club.websiteUrl && String(club.websiteUrl).startsWith("http") && (
              <a href={String(club.websiteUrl)} target="_blank" rel="noopener noreferrer"
                className="px-4 py-2 rounded-lg text-xs font-mono border transition-all hover:opacity-80"
                style={{ background: `${accentColor}15`, borderColor: `${accentColor}44`, color: accentColor }}>
                Website ↗
              </a>
            )}
            {club.instagramUrl && String(club.instagramUrl).startsWith("http") && (
              <a href={String(club.instagramUrl)} target="_blank" rel="noopener noreferrer"
                className="px-4 py-2 rounded-lg text-xs font-mono border border-[#30363d] text-pink-400 hover:opacity-80 transition-all">
                Instagram ↗
              </a>
            )}
            {club.githubUrl && String(club.githubUrl).startsWith("http") && (
              <a href={String(club.githubUrl)} target="_blank" rel="noopener noreferrer"
                className="px-4 py-2 rounded-lg text-xs font-mono border border-[#30363d] text-gray-400 hover:text-white transition-all">
                GitHub ↗
              </a>
            )}
          </div>
        </motion.div>

        {/* Tabs */}
        <div className="flex border-b border-[#21262d] mb-6">
          {([
            { id: "knowledge", label: "Knowledge Base", count: knowledge.length },
            { id: "events",    label: "Events",         count: events.length },
            { id: "about",     label: "About",          count: null },
          ] as const).map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className="px-1 py-3 mr-8 text-sm font-mono border-b-2 transition-colors flex items-center gap-2"
              style={activeTab === tab.id
                ? { color: accentColor, borderColor: accentColor }
                : { color: "#6e7681", borderColor: "transparent" }}>
              {tab.label}
              {tab.count !== null && (
                <span className="px-1.5 py-0.5 rounded-full text-[10px]"
                  style={activeTab === tab.id
                    ? { background: `${accentColor}22`, color: accentColor }
                    : { background: "#21262d", color: "#6e7681" }}>
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Knowledge Tab */}
        {activeTab === "knowledge" && (
          <div className="space-y-4">
            {knowledge.length === 0
              ? <EmptyTab message="No knowledge items yet — run the Nexus Agent to extract them" />
              : knowledge.map((item, i) => {
                  const style = KNOWLEDGE_STYLE[String(item.knowledgeType)] ?? { label: String(item.knowledgeType), icon: "◈", color: "#6e7681" };
                  return (
                    <motion.div key={String(item.id ?? i)}
                      initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                      className="p-5 rounded-xl border"
                      style={{ background: `${style.color}06`, borderColor: `${style.color}22` }}>
                      <div className="flex items-center gap-2 mb-3">
                        <span>{style.icon}</span>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded-full"
                          style={{ background: `${style.color}15`, color: style.color }}>
                          {style.label}
                        </span>
                        <span className="text-[10px] font-mono text-gray-600 ml-auto">
                          {Math.round(Number(item.confidence ?? 0.7) * 100)}% confidence
                        </span>
                      </div>
                      <h3 className="font-bold text-white mb-2">{String(item.title)}</h3>
                      <p className="text-sm text-gray-400 leading-relaxed">{String(item.content)}</p>
                    </motion.div>
                  );
                })
            }
          </div>
        )}

        {/* Events Tab */}
        {activeTab === "events" && (
          <div className="space-y-4">
            {events.length === 0
              ? <EmptyTab message="No events indexed for this club yet" />
              : events.map((ev, i) => (
                  <motion.div key={String(ev.id ?? i)}
                    initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                    className="p-5 rounded-xl border border-[#21262d] bg-[#161b22]">
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <h3 className="font-bold text-white">{String(ev.title)}</h3>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded flex-shrink-0"
                        style={{ background: `${accentColor}15`, color: accentColor }}>
                        {String(ev.eventType ?? "event")}
                      </span>
                    </div>
                    {ev.description && <p className="text-sm text-gray-500 mb-3">{String(ev.description)}</p>}
                    <div className="flex items-center gap-4 text-[11px] font-mono text-gray-600 flex-wrap">
                      {ev.startDate && <span>📅 {String(ev.startDate)}</span>}
                      {ev.venue && <span>📍 {String(ev.venue)}</span>}
                      {ev.prizePool && <span>🏆 {String(ev.prizePool)}</span>}
                    </div>
                    {ev.registrationUrl && String(ev.registrationUrl).startsWith("http") && (
                      <a href={String(ev.registrationUrl)} target="_blank" rel="noopener noreferrer"
                        className="inline-block mt-3 text-xs font-mono px-3 py-1.5 rounded-lg transition-all"
                        style={{ background: `${accentColor}15`, color: accentColor, border: `1px solid ${accentColor}33` }}>
                        Register →
                      </a>
                    )}
                  </motion.div>
                ))
            }
          </div>
        )}

        {/* About Tab */}
        {activeTab === "about" && (
          <div className="space-y-6">
            {club.description && (
              <div className="p-5 rounded-xl border border-[#21262d] bg-[#161b22]">
                <p className="text-xs font-mono text-gray-500 mb-3">DESCRIPTION</p>
                <p className="text-gray-300 leading-relaxed">{String(club.description)}</p>
              </div>
            )}
            {Array.isArray(club.tags) && club.tags.length > 0 && (
              <div>
                <p className="text-xs font-mono text-gray-500 mb-3">TAGS</p>
                <div className="flex flex-wrap gap-2">
                  {club.tags.map((tag: unknown) => (
                    <span key={String(tag)} className="text-xs font-mono px-3 py-1.5 rounded-full border border-[#30363d] text-gray-500">
                      {String(tag)}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function EmptyTab({ message }: { message: string }) {
  return (
    <div className="text-center py-16 text-gray-600">
      <div className="text-4xl mb-3 opacity-20">⬡</div>
      <p className="text-xs font-mono">{message}</p>
    </div>
  );
}
