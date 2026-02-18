"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import type { Club } from "@/app/clubs/page";

interface KnowledgeItem {
  id: string;
  knowledgeType: string;
  title: string;
  content: string;
  confidence: number;
  sourceUrl?: string;
}

interface ClubEvent {
  id: string;
  title: string;
  description?: string;
  eventType: string;
  startDate?: string;
  registrationUrl?: string;
  prizePool?: string;
  venue?: string;
}

interface ClubProfileProps {
  club: Club;
  accentColor: string;
  onClose: () => void;
}

const KNOWLEDGE_TYPE_STYLE: Record<string, { label: string; icon: string; color: string }> = {
  recruitment_criteria: { label: "Recruitment",  icon: "🎯", color: "#f59e0b" },
  project_highlight:    { label: "Projects",     icon: "🔧", color: "#00d4ff" },
  culture_insight:      { label: "Culture",      icon: "✨", color: "#a855f7" },
  skill_requirements:   { label: "Skills",       icon: "⚙",  color: "#22c55e" },
  timeline:             { label: "Timeline",     icon: "📅", color: "#ec4899" },
  achievement:          { label: "Achievement",  icon: "🏆", color: "#f59e0b" },
  resource:             { label: "Resources",    icon: "📚", color: "#14b8a6" },
};

export function ClubProfile({ club, accentColor, onClose }: ClubProfileProps) {
  const [knowledge, setKnowledge] = useState<KnowledgeItem[]>([]);
  const [events, setEvents] = useState<ClubEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"knowledge" | "events" | "about">("knowledge");
  const [isFollowing, setIsFollowing] = useState(false);

  useEffect(() => {
    async function loadData() {
      setIsLoading(true);
      try {
        const [kRes, eRes] = await Promise.all([
          fetch(`/api/clubs/${club.id}/knowledge`),
          fetch(`/api/clubs/${club.id}/events`),
        ]);
        const kData = await kRes.json();
        const eData = await eRes.json();
        setKnowledge(kData.items ?? []);
        setEvents(eData.events ?? []);
      } catch {
        // Silent failure — club data may not be available yet
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, [club.id]);

  const tabs = [
    { id: "knowledge", label: "Knowledge", count: knowledge.length },
    { id: "events",    label: "Events",    count: events.length },
    { id: "about",     label: "About",     count: null },
  ] as const;

  return (
    <>
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-40"
        style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }}
        onClick={onClose}
      />

      {/* Drawer */}
      <motion.div
        initial={{ x: "100%" }}
        animate={{ x: 0 }}
        exit={{ x: "100%" }}
        transition={{ type: "spring", damping: 30, stiffness: 300 }}
        className="fixed right-0 top-0 h-full w-full max-w-lg z-50 flex flex-col overflow-hidden"
        style={{
          background: "#0d1117",
          borderLeft: `1px solid ${accentColor}33`,
          boxShadow: `-20px 0 60px ${accentColor}15`,
        }}
      >
        {/* Header */}
        <div
          className="flex items-start gap-4 p-6 flex-shrink-0"
          style={{
            background: `linear-gradient(135deg, ${accentColor}08, transparent)`,
            borderBottom: "1px solid #21262d",
          }}
        >
          {/* Club icon */}
          <div
            className="w-14 h-14 rounded-xl flex items-center justify-center text-2xl flex-shrink-0"
            style={{ background: `${accentColor}15`, border: `1px solid ${accentColor}33` }}
          >
            {club.logoUrl ? (
              <img src={club.logoUrl} alt={club.name} className="w-10 h-10 object-contain" />
            ) : (
              "⬡"
            )}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h2 className="text-lg font-bold text-white leading-tight">{club.name}</h2>
              {club.isRecruiting && (
                <motion.span
                  animate={{ opacity: [1, 0.4, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="text-[9px] font-mono px-1.5 py-0.5 rounded"
                  style={{ background: "#22c55e22", color: "#22c55e" }}
                >
                  ● OPEN
                </motion.span>
              )}
            </div>
            <p className="text-xs text-gray-500 font-mono mb-2">
              {club.iitId?.toUpperCase()} · {club.category}
              {club.foundedYear ? ` · Est. ${club.foundedYear}` : ""}
            </p>
            <p className="text-xs text-gray-400 line-clamp-2">
              {club.tagline || club.description}
            </p>
          </div>

          <button onClick={onClose} className="text-gray-600 hover:text-white transition-colors text-xl flex-shrink-0">
            ×
          </button>
        </div>

        {/* Action bar */}
        <div className="flex items-center gap-2 px-6 py-3 flex-shrink-0 border-b border-[#21262d]">
          <motion.button
            whileTap={{ scale: 0.96 }}
            onClick={() => setIsFollowing(!isFollowing)}
            className="px-4 py-2 rounded-lg text-xs font-mono transition-all"
            style={
              isFollowing
                ? { background: `${accentColor}22`, border: `1px solid ${accentColor}44`, color: accentColor }
                : { background: "#161b22", border: "1px solid #30363d", color: "#6e7681" }
            }
          >
            {isFollowing ? "● Following" : "+ Follow"}
          </motion.button>

          {club.websiteUrl && (
            <a
              href={club.websiteUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 rounded-lg text-xs font-mono border border-[#30363d] text-gray-500 hover:text-white transition-colors"
            >
              Website ↗
            </a>
          )}
          {club.instagramUrl && (
            <a
              href={club.instagramUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-2 rounded-lg text-xs font-mono border border-[#30363d] text-gray-500 hover:text-pink-400 transition-colors"
            >
              📸
            </a>
          )}
          {club.githubUrl && (
            <a
              href={club.githubUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-2 rounded-lg text-xs font-mono border border-[#30363d] text-gray-500 hover:text-white transition-colors"
            >
              ⎋
            </a>
          )}
        </div>

        {/* Tabs */}
        <div className="flex border-b border-[#21262d] flex-shrink-0 px-6">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className="px-1 py-3 mr-6 text-xs font-mono transition-colors flex items-center gap-1.5 border-b-2"
              style={
                activeTab === tab.id
                  ? { color: accentColor, borderColor: accentColor }
                  : { color: "#6e7681", borderColor: "transparent" }
              }
            >
              {tab.label}
              {tab.count !== null && (
                <span
                  className="px-1.5 py-0.5 rounded-full text-[9px]"
                  style={
                    activeTab === tab.id
                      ? { background: `${accentColor}22`, color: accentColor }
                      : { background: "#21262d", color: "#6e7681" }
                  }
                >
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                className="text-2xl"
                style={{ color: accentColor }}
              >
                ⬡
              </motion.div>
            </div>
          ) : (
            <>
              {/* ── Knowledge Tab ── */}
              {activeTab === "knowledge" && (
                <div className="space-y-3">
                  {knowledge.length === 0 ? (
                    <EmptyState message="No knowledge items extracted yet" />
                  ) : (
                    knowledge.map((item) => {
                      const style = KNOWLEDGE_TYPE_STYLE[item.knowledgeType] ?? {
                        label: item.knowledgeType,
                        icon: "◈",
                        color: "#6e7681",
                      };
                      return (
                        <motion.div
                          key={item.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="p-4 rounded-xl border"
                          style={{
                            background: `${style.color}06`,
                            borderColor: `${style.color}22`,
                          }}
                        >
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-sm">{style.icon}</span>
                            <span
                              className="text-[10px] font-mono px-1.5 py-0.5 rounded"
                              style={{ color: style.color, background: `${style.color}15` }}
                            >
                              {style.label}
                            </span>
                            <span className="text-[9px] font-mono text-gray-600 ml-auto">
                              {Math.round(item.confidence * 100)}% confidence
                            </span>
                          </div>
                          <h4 className="text-sm font-semibold text-white mb-1">{item.title}</h4>
                          <p className="text-xs text-gray-400 leading-relaxed">{item.content}</p>
                        </motion.div>
                      );
                    })
                  )}
                </div>
              )}

              {/* ── Events Tab ── */}
              {activeTab === "events" && (
                <div className="space-y-3">
                  {events.length === 0 ? (
                    <EmptyState message="No events indexed for this club" />
                  ) : (
                    events.map((event) => (
                      <motion.div
                        key={event.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="p-4 rounded-xl border border-[#21262d] bg-[#161b22]"
                      >
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <h4 className="text-sm font-semibold text-white">{event.title}</h4>
                          <span
                            className="text-[9px] font-mono px-1.5 py-0.5 rounded flex-shrink-0"
                            style={{ background: `${accentColor}15`, color: accentColor }}
                          >
                            {event.eventType}
                          </span>
                        </div>
                        {event.description && (
                          <p className="text-xs text-gray-500 mb-2 line-clamp-2">
                            {event.description}
                          </p>
                        )}
                        <div className="flex items-center gap-3 text-[10px] font-mono text-gray-600">
                          {event.startDate && <span>📅 {event.startDate}</span>}
                          {event.venue && <span>📍 {event.venue}</span>}
                          {event.prizePool && <span>🏆 {event.prizePool}</span>}
                        </div>
                        {event.registrationUrl && (
                          <a
                            href={event.registrationUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-block mt-3 text-[10px] font-mono px-3 py-1.5 rounded-lg transition-colors"
                            style={{
                              background: `${accentColor}15`,
                              color: accentColor,
                              border: `1px solid ${accentColor}33`,
                            }}
                          >
                            Register →
                          </a>
                        )}
                      </motion.div>
                    ))
                  )}
                </div>
              )}

              {/* ── About Tab ── */}
              {activeTab === "about" && (
                <div className="space-y-4">
                  {club.description && (
                    <div>
                      <p className="text-xs font-mono text-gray-500 mb-1">DESCRIPTION</p>
                      <p className="text-sm text-gray-300 leading-relaxed">{club.description}</p>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-3">
                    {club.memberCount && (
                      <StatBox label="Members" value={String(club.memberCount)} color={accentColor} />
                    )}
                    {club.foundedYear && (
                      <StatBox label="Founded" value={String(club.foundedYear)} color="#a855f7" />
                    )}
                  </div>

                  {(club.tags ?? []).length > 0 && (
                    <div>
                      <p className="text-xs font-mono text-gray-500 mb-2">TAGS</p>
                      <div className="flex flex-wrap gap-2">
                        {club.tags?.map((tag) => (
                          <span
                            key={tag}
                            className="text-xs font-mono px-2 py-1 rounded-full border border-[#30363d] text-gray-500"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </motion.div>
    </>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="text-center py-12 text-gray-600">
      <div className="text-3xl mb-2 opacity-20">⬡</div>
      <p className="text-xs font-mono">{message}</p>
    </div>
  );
}

function StatBox({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div
      className="p-3 rounded-lg border"
      style={{ background: `${color}08`, borderColor: `${color}22` }}
    >
      <p className="text-xs font-mono text-gray-500 mb-0.5">{label}</p>
      <p className="text-lg font-bold" style={{ color }}>{value}</p>
    </div>
  );
}
