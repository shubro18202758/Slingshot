"use client";

import { useState, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { NexusCrawlPanel } from "@/components/clubs/NexusCrawlPanel";
import { NexusSearchBar, IITFilterBar } from "@/components/clubs/NexusSearchBar";
import { useDb } from "@/components/providers/db-provider";

const IIT_OPTIONS = [
  { id: "all",    label: "All IITs",       color: "#a855f7" },
  { id: "iitb",   label: "IIT Bombay",     color: "#00d4ff" },
  { id: "iitd",   label: "IIT Delhi",      color: "#f59e0b" },
  { id: "iitk",   label: "IIT Kanpur",     color: "#22c55e" },
  { id: "iitm",   label: "IIT Madras",     color: "#ef4444" },
  { id: "iitr",   label: "IIT Roorkee",    color: "#ec4899" },
  { id: "iith",   label: "IIT Hyderabad",  color: "#8b5cf6" },
  { id: "iitg",   label: "IIT Guwahati",   color: "#14b8a6" },
  { id: "iitbbs", label: "IIT Bhubaneswar",color: "#f97316" },
];

const CATEGORY_ICONS: Record<string, string> = {
  technical: "⚙️", cultural: "🎭", entrepreneurship: "🚀",
  research: "🔬", sports: "🏆", social: "🤝", media: "📡", other: "⬡",
};

type Club = {
  id: string; iitId: string; name: string; category: string;
  description?: string; tagline?: string; tags?: string[];
  memberCount?: number; isRecruiting?: string; websiteUrl?: string;
};

function detectIIT(university?: string): string | null {
  if (!university) return null;
  const lower = university.toLowerCase();
  const map: Record<string, string> = {
    "bombay":"iitb","iitb":"iitb","delhi":"iitd","iitd":"iitd",
    "kanpur":"iitk","iitk":"iitk","madras":"iitm","iitm":"iitm","chennai":"iitm",
    "roorkee":"iitr","iitr":"iitr","hyderabad":"iith","iith":"iith",
    "guwahati":"iitg","iitg":"iitg","bhubaneswar":"iitbbs","iitbbs":"iitbbs",
  };
  for (const [key, id] of Object.entries(map)) {
    if (lower.includes(key)) return id;
  }
  return null;
}

// ── Club Card ────────────────────────────────────────────────────────────────
function ClubCard({ club, accentColor, isHome, onClick }: {
  club: Club; accentColor: string; isHome?: boolean; onClick: () => void;
}) {
  const icon = CATEGORY_ICONS[club.category] ?? "⬡";
  return (
    <motion.button onClick={onClick} whileHover={{ y: -3, scale: 1.02 }} whileTap={{ scale: 0.97 }}
      className="relative w-full text-left p-4 rounded-xl border overflow-hidden group transition-all"
      style={{ background: "#161b22", borderColor: "#30363d" }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = `${accentColor}55`; }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = "#30363d"; }}>

      {/* Glow */}
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
        style={{ background: `radial-gradient(ellipse at top left, ${accentColor}10, transparent 60%)` }} />

      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="w-10 h-10 rounded-lg flex items-center justify-center text-xl"
          style={{ background: `${accentColor}15` }}>
          {icon}
        </div>
        <div className="flex flex-col items-end gap-1">
          {isHome && <span className="text-[9px] font-mono px-1.5 py-0.5 rounded" style={{ background: `${accentColor}15`, color: accentColor }}>🏠 Home</span>}
          {club.isRecruiting === "true" && (
            <motion.span animate={{ opacity: [1, 0.4, 1] }} transition={{ duration: 2, repeat: Infinity }}
              className="text-[9px] font-mono px-1.5 py-0.5 rounded"
              style={{ background: "#22c55e22", color: "#22c55e" }}>● OPEN</motion.span>
          )}
        </div>
      </div>

      <h3 className="font-bold text-sm text-white mb-1 line-clamp-2">{club.name}</h3>
      <p className="text-xs text-gray-500 line-clamp-2 mb-3 leading-relaxed">
        {club.tagline || club.description || "Click to explore"}
      </p>

      <div className="flex items-center justify-between pt-2 border-t border-[#21262d]">
        <span className="text-[10px] font-mono text-gray-600">{club.category}</span>
        <span className="text-[10px] font-mono" style={{ color: `${accentColor}88` }}>View details →</span>
      </div>
    </motion.button>
  );
}

// ── Section ──────────────────────────────────────────────────────────────────
function ClubSection({ title, subtitle, clubs, accentColor, isHome, onClubClick }: {
  title: string; subtitle?: string; clubs: Club[]; accentColor: string;
  isHome?: boolean; onClubClick: (id: string) => void;
}) {
  const [expanded, setExpanded] = useState(true);
  if (clubs.length === 0) return null;
  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-10">
      {/* Section header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-1 h-7 rounded-full" style={{ background: `linear-gradient(to bottom, ${accentColor}, #a855f7)` }} />
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              {isHome && <span>🏠</span>}
              {title}
              <span className="text-xs font-mono px-2 py-0.5 rounded-full"
                style={{ background: `${accentColor}15`, color: accentColor }}>
                {clubs.length}
              </span>
            </h2>
            {subtitle && <p className="text-xs text-gray-500 font-mono">{subtitle}</p>}
          </div>
        </div>
        <button onClick={() => setExpanded(!expanded)}
          className="text-xs font-mono text-gray-600 hover:text-gray-400 transition-colors">
          {expanded ? "collapse ↑" : "expand ↓"}
        </button>
      </div>

      <AnimatePresence>
        {expanded && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {clubs.map((club, i) => (
              <motion.div key={club.id} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
                <ClubCard club={club} accentColor={accentColor} isHome={isHome}
                  onClick={() => onClubClick(club.id)} />
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function NexusPage() {
  const { db } = useDb();
  const router = useRouter();

  const [allClubs, setAllClubs] = useState<Club[]>([]);
  const [searchResults, setSearchResults] = useState<Club[] | null>(null);
  const [searchAnswer, setSearchAnswer] = useState("");
  const [showCrawlPanel, setShowCrawlPanel] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [homeIIT, setHomeIIT] = useState<string | null>(null);
  const [homeIITName, setHomeIITName] = useState("");
  const [stats, setStats] = useState({ totalClubs: 0, totalKnowledge: 0, iitsIndexed: 0 });
  const [selectedIIT, setSelectedIIT] = useState("all");

  // Detect home IIT from student profile
  useEffect(() => {
    if (!db) return;
    import("@/db/schema").then(({ students }) => {
      db.select({ university: students.university })
        .from(students)
        .limit(1)
        .then((rows) => {
          const row = rows[0] as { university?: string } | undefined;
          if (row?.university) {
            const id = detectIIT(row.university);
            if (id) { setHomeIIT(id); setHomeIITName(IIT_OPTIONS.find(i => i.id === id)?.label ?? ""); }
          }
        }).catch(() => {});
    }).catch(() => {});
  }, [db]);

  const fetchClubs = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({ limit: "200" });
      if (selectedIIT !== "all") params.set("iitId", selectedIIT);
      const res = await fetch(`/api/clubs/crawl?${params}`);
      const data = await res.json();
      setAllClubs(data.clubs ?? []);
    } finally { setIsLoading(false); }
  }, [selectedIIT]);

  useEffect(() => { fetchClubs(); }, [fetchClubs]);

  useEffect(() => {
    fetch("/api/clubs/stats").then(r => r.json()).then(setStats).catch(() => {});
  }, [allClubs.length]);

  const handleSearch = useCallback(async (query: string) => {
    if (!query.trim()) { setSearchResults(null); setSearchAnswer(""); return; }
    setIsLoading(true);
    try {
      const res = await fetch("/api/clubs/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query, generateAnswer: true, topK: 8 }),
      });
      const data = await res.json();
      setSearchResults(data.clubs ?? []);
      setSearchAnswer(data.answer ?? "");
    } finally { setIsLoading(false); }
  }, []);

  const handleClubClick = (id: string) => router.push(`/clubs/${id}`);

  // Group clubs into sections
  const displayClubs = searchResults ?? allClubs;
  const homeClubs = displayClubs.filter(c => c.iitId === homeIIT);
  const otherClubsByIIT = IIT_OPTIONS
    .filter(iit => iit.id !== "all" && iit.id !== homeIIT)
    .map(iit => ({
      iit,
      clubs: displayClubs.filter(c => c.iitId === iit.id),
    }))
    .filter(g => g.clubs.length > 0);

  const homeColor = IIT_OPTIONS.find(i => i.id === homeIIT)?.color ?? "#00d4ff";
  const accentColor = selectedIIT !== "all" ? (IIT_OPTIONS.find(i => i.id === selectedIIT)?.color ?? "#00d4ff") : "#a855f7";

  return (
    <div className="min-h-screen bg-[#0d1117] text-white overflow-x-hidden">
      {/* Scanlines */}
      <div className="pointer-events-none fixed inset-0 z-0 opacity-[0.025]"
        style={{ backgroundImage: "repeating-linear-gradient(0deg,transparent,transparent 2px,rgba(255,255,255,0.5) 2px,rgba(255,255,255,0.5) 3px)" }} />
      <div className="pointer-events-none fixed top-0 left-1/2 -translate-x-1/2 w-[800px] h-[300px] rounded-full opacity-10 blur-[120px] z-0"
        style={{ background: `radial-gradient(ellipse at center, ${accentColor}, transparent 70%)` }} />

      <div className="relative z-10 max-w-7xl mx-auto px-4 py-8">

        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <div className="flex items-center gap-3 mb-1">
                <div className="w-2 h-8 rounded-full" style={{ background: `linear-gradient(to bottom, ${accentColor}, #a855f7)` }} />
                <h1 className="text-4xl font-black"
                  style={{ background: "linear-gradient(135deg, #fff 0%, #00d4ff 60%, #a855f7 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                  NEXUS
                </h1>
              </div>
              <p className="text-gray-400 text-sm font-mono ml-5">
                Cross-IIT Club Intelligence Network
                {homeIITName && (
                  <span className="ml-2 px-2 py-0.5 rounded-full text-[10px]"
                    style={{ background: `${homeColor}22`, color: homeColor, border: `1px solid ${homeColor}44` }}>
                    🏠 {homeIITName}
                  </span>
                )}
              </p>
            </div>

            <div className="flex items-center gap-3">
              <div className="hidden md:flex gap-2">
                {[
                  { label: "Clubs", value: stats.totalClubs, color: "#00d4ff" },
                  { label: "Knowledge", value: stats.totalKnowledge, color: "#a855f7" },
                  { label: "IITs", value: stats.iitsIndexed, color: "#22c55e" },
                ].map(s => (
                  <div key={s.label} className="px-3 py-1.5 rounded-full border text-xs font-mono flex items-center gap-1.5"
                    style={{ borderColor: `${s.color}33`, background: `${s.color}11` }}>
                    <span style={{ color: s.color }}>{s.value}</span>
                    <span className="text-gray-500">{s.label}</span>
                  </div>
                ))}
              </div>
              <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                onClick={() => setShowCrawlPanel(true)}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-mono font-semibold"
                style={{ background: "linear-gradient(135deg, #00d4ff22, #a855f722)", border: "1px solid #00d4ff44", color: "#00d4ff" }}>
                <span className="animate-pulse">⬡</span> Run Nexus Agent
              </motion.button>
            </div>
          </div>
        </motion.div>

        {/* Search */}
        <div className="mb-6">
          <NexusSearchBar onSearch={handleSearch} isLoading={isLoading} accentColor={accentColor} />
        </div>

        {/* AI Answer */}
        <AnimatePresence>
          {searchAnswer && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
              className="mb-6 p-4 rounded-xl border"
              style={{ background: "linear-gradient(135deg, #00d4ff08, #a855f708)", borderColor: "#00d4ff30" }}>
              <p className="text-xs font-mono text-cyan-400 mb-2">◆ NEXUS ANSWER</p>
              <p className="text-gray-200 text-sm leading-relaxed">{searchAnswer}</p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* IIT Filter */}
        <div className="mb-8">
          <IITFilterBar options={IIT_OPTIONS} selected={selectedIIT} onSelect={setSelectedIIT} homeIIT={homeIIT} />
        </div>

        {/* Loading */}
        {isLoading && (
          <div className="flex items-center justify-center py-16">
            <div className="flex gap-1.5">
              {[0,1,2].map(i => (
                <motion.div key={i} className="w-2 h-2 rounded-full bg-cyan-400"
                  animate={{ scale: [1,1.5,1], opacity: [0.4,1,0.4] }}
                  transition={{ duration: 1, repeat: Infinity, delay: i*0.2 }} />
              ))}
            </div>
          </div>
        )}

        {/* Empty state */}
        {!isLoading && displayClubs.length === 0 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-24">
            <div className="text-6xl mb-4 opacity-20">⬡</div>
            <p className="text-gray-500 font-mono text-sm mb-2">No clubs indexed yet</p>
            <p className="text-gray-600 text-xs mb-6">Run the Nexus Agent to populate your club intelligence database</p>
            <button onClick={() => setShowCrawlPanel(true)}
              className="px-6 py-3 rounded-lg text-sm font-mono"
              style={{ background: "linear-gradient(135deg, #00d4ff22, #a855f722)", border: "1px solid #00d4ff44", color: "#00d4ff" }}>
              Launch Nexus Agent →
            </button>
          </motion.div>
        )}

        {/* ── SECTIONS ── */}
        {!isLoading && displayClubs.length > 0 && (
          <>
            {/* Home IIT Section */}
            {homeClubs.length > 0 && (
              <ClubSection
                title={`${homeIITName || "Your College"} Clubs`}
                subtitle="Your home institution — default view"
                clubs={homeClubs}
                accentColor={homeColor}
                isHome
                onClubClick={handleClubClick}
              />
            )}

            {/* Horizontal divider if both sections exist */}
            {homeClubs.length > 0 && otherClubsByIIT.length > 0 && (
              <div className="flex items-center gap-4 mb-8">
                <div className="flex-1 h-px bg-[#21262d]" />
                <span className="text-xs font-mono text-gray-600 px-3">OTHER IITs</span>
                <div className="flex-1 h-px bg-[#21262d]" />
              </div>
            )}

            {/* Other IIT sections */}
            {otherClubsByIIT.map(({ iit, clubs: iitClubs }) => (
              <ClubSection
                key={iit.id}
                title={`${iit.label} Clubs`}
                subtitle={`${iitClubs.length} clubs indexed`}
                clubs={iitClubs}
                accentColor={iit.color}
                onClubClick={handleClubClick}
              />
            ))}

            {/* Ungrouped (no homeIIT set) */}
            {!homeIIT && displayClubs.length > 0 && (
              <ClubSection
                title="All Indexed Clubs"
                subtitle="Set your university in Profile to see your home IIT first"
                clubs={displayClubs}
                accentColor="#a855f7"
                onClubClick={handleClubClick}
              />
            )}
          </>
        )}
      </div>

      <AnimatePresence>
        {showCrawlPanel && (
          <NexusCrawlPanel
            onClose={() => setShowCrawlPanel(false)}
            onComplete={fetchClubs}
            iitOptions={IIT_OPTIONS}
            homeIIT={homeIIT}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
