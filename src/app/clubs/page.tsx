"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ClubCard } from "@/components/clubs/ClubCard";
import { NexusCrawlPanel } from "@/components/clubs/NexusCrawlPanel";
import { ClubProfile } from "@/components/clubs/ClubProfile";
import { NexusSearchBar } from "@/components/clubs/NexusSearchBar";
import { IITFilterBar } from "@/components/clubs/IITFilterBar";

const IIT_OPTIONS = [
  { id: "all",    label: "All IITs",     color: "#a855f7" },
  { id: "iitb",   label: "IIT Bombay",   color: "#00d4ff" },
  { id: "iitd",   label: "IIT Delhi",    color: "#f59e0b" },
  { id: "iitk",   label: "IIT Kanpur",   color: "#22c55e" },
  { id: "iitm",   label: "IIT Madras",   color: "#ef4444" },
  { id: "iitr",   label: "IIT Roorkee",  color: "#ec4899" },
  { id: "iith",   label: "IIT Hyderabad",color: "#8b5cf6" },
  { id: "iitg",   label: "IIT Guwahati", color: "#14b8a6" },
];

const CATEGORY_OPTIONS = [
  { id: "all",               label: "All",             emoji: "🌐" },
  { id: "technical",         label: "Technical",        emoji: "⚙️" },
  { id: "cultural",          label: "Cultural",         emoji: "🎭" },
  { id: "entrepreneurship",  label: "E-Cell",           emoji: "🚀" },
  { id: "research",          label: "Research",         emoji: "🔬" },
  { id: "sports",            label: "Sports",           emoji: "🏆" },
  { id: "social",            label: "Social",           emoji: "🤝" },
  { id: "media",             label: "Media",            emoji: "📡" },
];

export type Club = {
  id: string;
  iitId: string;
  name: string;
  shortName?: string;
  category: string;
  description?: string;
  tagline?: string;
  tags?: string[];
  memberCount?: number;
  foundedYear?: number;
  isRecruiting?: boolean;
  websiteUrl?: string;
  instagramUrl?: string;
  githubUrl?: string;
  logoUrl?: string;
  lastCrawledAt?: string;
};

export default function NexusPage() {
  const [clubs, setClubs] = useState<Club[]>([]);
  const [filteredClubs, setFilteredClubs] = useState<Club[]>([]);
  const [selectedClub, setSelectedClub] = useState<Club | null>(null);
  const [selectedIIT, setSelectedIIT] = useState("all");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [showCrawlPanel, setShowCrawlPanel] = useState(false);
  const [searchResults, setSearchResults] = useState<Club[] | null>(null);
  const [searchAnswer, setSearchAnswer] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [view, setView] = useState<"grid" | "list">("grid");
  const [stats, setStats] = useState({ totalClubs: 0, totalKnowledge: 0, iitsIndexed: 0 });

  // Fetch clubs on mount + when filters change
  const fetchClubs = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({ limit: "100" });
      if (selectedIIT !== "all") params.set("iitId", selectedIIT);
      if (selectedCategory !== "all") params.set("category", selectedCategory);

      const res = await fetch(`/api/clubs/crawl?${params}`);
      const data = await res.json();
      setClubs(data.clubs ?? []);
      setFilteredClubs(data.clubs ?? []);
    } catch (err) {
      console.error("Failed to fetch clubs:", err);
    } finally {
      setIsLoading(false);
    }
  }, [selectedIIT, selectedCategory]);

  useEffect(() => { fetchClubs(); }, [fetchClubs]);

  // Fetch stats
  useEffect(() => {
    fetch("/api/clubs/stats")
      .then((r) => r.json())
      .then(setStats)
      .catch(() => {});
  }, [clubs.length]);

  const handleSearch = useCallback(
    async (query: string) => {
      if (!query.trim()) {
        setSearchResults(null);
        setSearchAnswer("");
        return;
      }
      setIsLoading(true);
      try {
        const res = await fetch("/api/clubs/search", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            query,
            iitId: selectedIIT !== "all" ? selectedIIT : undefined,
            category: selectedCategory !== "all" ? selectedCategory : undefined,
            generateAnswer: true,
            topK: 8,
          }),
        });
        const data = await res.json();
        setSearchResults(data.clubs ?? []);
        setSearchAnswer(data.answer ?? "");
      } catch (err) {
        console.error("Search failed:", err);
      } finally {
        setIsLoading(false);
      }
    },
    [selectedIIT, selectedCategory]
  );

  const displayClubs = searchResults ?? filteredClubs;
  const iitColor = IIT_OPTIONS.find((i) => i.id === selectedIIT)?.color ?? "#00d4ff";

  return (
    <div className="min-h-screen bg-[#0d1117] text-white overflow-x-hidden">
      {/* ── Scanline overlay ── */}
      <div
        className="pointer-events-none fixed inset-0 z-0 opacity-[0.03]"
        style={{
          backgroundImage:
            "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,255,255,0.5) 2px, rgba(255,255,255,0.5) 3px)",
        }}
      />

      {/* ── Ambient glow ── */}
      <div
        className="pointer-events-none fixed top-0 left-1/2 -translate-x-1/2 w-[800px] h-[300px] rounded-full opacity-10 blur-[120px] z-0"
        style={{ background: `radial-gradient(ellipse at center, ${iitColor}, transparent 70%)` }}
      />

      <div className="relative z-10 max-w-7xl mx-auto px-4 py-8">
        {/* ── Header ── */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div
                  className="w-2 h-8 rounded-full"
                  style={{ background: `linear-gradient(to bottom, ${iitColor}, #a855f7)` }}
                />
                <h1
                  className="text-4xl font-black tracking-tight"
                  style={{
                    fontFamily: "'Space Grotesk', sans-serif",
                    background: `linear-gradient(135deg, #fff 0%, ${iitColor} 60%, #a855f7 100%)`,
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                  }}
                >
                  NEXUS
                </h1>
              </div>
              <p className="text-gray-400 text-sm font-mono ml-5">
                Cross-IIT Club Intelligence Network
              </p>
            </div>

            <div className="flex items-center gap-4">
              {/* Stats pills */}
              <div className="hidden md:flex items-center gap-2">
                <StatPill label="Clubs" value={stats.totalClubs} color={iitColor} />
                <StatPill label="Knowledge" value={stats.totalKnowledge} color="#a855f7" />
                <StatPill label="IITs" value={stats.iitsIndexed} color="#22c55e" />
              </div>

              {/* View toggle */}
              <div className="flex items-center bg-[#161b22] border border-[#30363d] rounded-lg overflow-hidden">
                {(["grid", "list"] as const).map((v) => (
                  <button
                    key={v}
                    onClick={() => setView(v)}
                    className={`px-3 py-2 text-xs font-mono transition-colors ${
                      view === v
                        ? "text-white bg-[#21262d]"
                        : "text-gray-500 hover:text-gray-300"
                    }`}
                  >
                    {v === "grid" ? "⊞" : "☰"}
                  </button>
                ))}
              </div>

              {/* Crawl trigger */}
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setShowCrawlPanel(true)}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-mono font-semibold transition-all"
                style={{
                  background: `linear-gradient(135deg, ${iitColor}22, #a855f722)`,
                  border: `1px solid ${iitColor}44`,
                  color: iitColor,
                }}
              >
                <span className="animate-pulse">⬡</span>
                Run Nexus Agent
              </motion.button>
            </div>
          </div>
        </motion.div>

        {/* ── Search Bar ── */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-6"
        >
          <NexusSearchBar
            onSearch={handleSearch}
            isLoading={isLoading}
            accentColor={iitColor}
          />
        </motion.div>

        {/* ── AI Answer Box ── */}
        <AnimatePresence>
          {searchAnswer && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-6 p-4 rounded-xl border"
              style={{
                background: `linear-gradient(135deg, ${iitColor}08, #a855f708)`,
                borderColor: `${iitColor}30`,
              }}
            >
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs font-mono" style={{ color: iitColor }}>
                  ◆ NEXUS ANSWER
                </span>
              </div>
              <p className="text-gray-200 text-sm leading-relaxed">{searchAnswer}</p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Filters ── */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="mb-6 space-y-3"
        >
          {/* IIT Filter */}
          <IITFilterBar
            options={IIT_OPTIONS}
            selected={selectedIIT}
            onSelect={setSelectedIIT}
          />

          {/* Category Filter */}
          <div className="flex gap-2 flex-wrap">
            {CATEGORY_OPTIONS.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-3 py-1.5 rounded-full text-xs font-mono transition-all flex items-center gap-1.5 ${
                  selectedCategory === cat.id
                    ? "bg-[#21262d] text-white border-white/30"
                    : "bg-[#161b22] text-gray-500 border-[#30363d] hover:text-gray-300"
                } border`}
              >
                <span>{cat.emoji}</span>
                <span>{cat.label}</span>
              </button>
            ))}
          </div>
        </motion.div>

        {/* ── Results count ── */}
        {displayClubs.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mb-4 text-xs font-mono text-gray-500"
          >
            {searchResults ? (
              <>
                <span style={{ color: iitColor }}>◈</span>{" "}
                {displayClubs.length} clubs matched · semantic search active
              </>
            ) : (
              <>
                <span style={{ color: "#22c55e" }}>◈</span>{" "}
                {displayClubs.length} clubs indexed
              </>
            )}
          </motion.div>
        )}

        {/* ── Empty State ── */}
        {displayClubs.length === 0 && !isLoading && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center py-24"
          >
            <div
              className="text-6xl mb-4 opacity-20"
              style={{ fontFamily: "monospace" }}
            >
              ⬡
            </div>
            <p className="text-gray-500 font-mono text-sm mb-2">
              No clubs indexed yet
            </p>
            <p className="text-gray-600 text-xs mb-6">
              Run the Nexus Agent to crawl IIT club directories
            </p>
            <button
              onClick={() => setShowCrawlPanel(true)}
              className="px-6 py-3 rounded-lg text-sm font-mono transition-all"
              style={{
                background: `linear-gradient(135deg, ${iitColor}22, #a855f722)`,
                border: `1px solid ${iitColor}44`,
                color: iitColor,
              }}
            >
              Launch Nexus Agent →
            </button>
          </motion.div>
        )}

        {/* ── Loading State ── */}
        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <div className="flex gap-1">
              {[0, 1, 2].map((i) => (
                <motion.div
                  key={i}
                  className="w-2 h-2 rounded-full"
                  style={{ background: iitColor }}
                  animate={{ scale: [1, 1.5, 1], opacity: [0.4, 1, 0.4] }}
                  transition={{ duration: 1, repeat: Infinity, delay: i * 0.2 }}
                />
              ))}
            </div>
          </div>
        )}

        {/* ── Club Grid / List ── */}
        {!isLoading && displayClubs.length > 0 && (
          <motion.div
            className={
              view === "grid"
                ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
                : "flex flex-col gap-3"
            }
          >
            {displayClubs.map((club, i) => (
              <motion.div
                key={club.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04, duration: 0.3 }}
              >
                <ClubCard
                  club={club}
                  view={view}
                  accentColor={
                    IIT_OPTIONS.find((o) => o.id === club.iitId)?.color ?? "#00d4ff"
                  }
                  onClick={() => setSelectedClub(club)}
                />
              </motion.div>
            ))}
          </motion.div>
        )}
      </div>

      {/* ── Club Profile Drawer ── */}
      <AnimatePresence>
        {selectedClub && (
          <ClubProfile
            club={selectedClub}
            onClose={() => setSelectedClub(null)}
            accentColor={
              IIT_OPTIONS.find((o) => o.id === selectedClub.iitId)?.color ?? "#00d4ff"
            }
          />
        )}
      </AnimatePresence>

      {/* ── Crawl Panel ── */}
      <AnimatePresence>
        {showCrawlPanel && (
          <NexusCrawlPanel
            onClose={() => setShowCrawlPanel(false)}
            onComplete={fetchClubs}
            iitOptions={IIT_OPTIONS}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function StatPill({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div
      className="px-3 py-1.5 rounded-full border text-xs font-mono flex items-center gap-1.5"
      style={{ borderColor: `${color}33`, background: `${color}11` }}
    >
      <span style={{ color }}>{value}</span>
      <span className="text-gray-500">{label}</span>
    </div>
  );
}
