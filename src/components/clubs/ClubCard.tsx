"use client";

import { motion } from "framer-motion";
import type { Club } from "@/app/clubs/page";

const CATEGORY_ICONS: Record<string, string> = {
  technical:        "⚙",
  cultural:         "🎭",
  entrepreneurship: "🚀",
  research:         "🔬",
  sports:           "🏆",
  social:           "🤝",
  media:            "📡",
  hobby:            "✨",
  other:            "⬡",
};

const IIT_SHORT: Record<string, string> = {
  iitb:   "IITB",
  iitd:   "IITD",
  iitk:   "IITK",
  iitm:   "IITM",
  iitr:   "IITR",
  iith:   "IITH",
  iitg:   "IITG",
  iitbbs: "IITBBS",
};

interface ClubCardProps {
  club: Club;
  accentColor: string;
  isHomeClub?: boolean;
  view: "grid" | "list";
  onClick: () => void;
}

export function ClubCard({ club, accentColor, view, onClick, isHomeClub }: ClubCardProps) {
  const icon = CATEGORY_ICONS[club.category ?? "other"] ?? "⬡";
  const iitLabel = IIT_SHORT[club.iitId ?? ""] ?? club.iitId?.toUpperCase();
  const tags = (club.tags ?? []).slice(0, 3);

  if (view === "list") {
    return (
      <motion.button
        onClick={onClick}
        whileHover={{ x: 4 }}
        className="w-full text-left p-4 rounded-xl border transition-all flex items-center gap-4"
        style={{
          background: "#161b22",
          borderColor: "#30363d",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.borderColor = `${accentColor}44`;
          e.currentTarget.style.background = `${accentColor}08`;
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.borderColor = "#30363d";
          e.currentTarget.style.background = "#161b22";
        }}
      >
        {/* Icon */}
        <div
          className="w-10 h-10 rounded-lg flex items-center justify-center text-xl flex-shrink-0"
          style={{ background: `${accentColor}15` }}
        >
          {icon}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="font-semibold text-sm text-white truncate">{club.name}</span>
            {club.isRecruiting && (
              <span
                className="text-[10px] font-mono px-1.5 py-0.5 rounded-full flex-shrink-0"
                style={{ background: "#22c55e22", color: "#22c55e" }}
              >
                OPEN
              </span>
            )}
          </div>
          <p className="text-xs text-gray-500 truncate">{club.tagline || club.description}</p>
        </div>

        {/* IIT badge */}
        <span
          className="text-[10px] font-mono px-2 py-1 rounded-full flex-shrink-0"
          style={{ background: `${accentColor}15`, color: accentColor }}
        >
          {iitLabel}
        </span>
      </motion.button>
    );
  }

  // Grid view
  return (
    <motion.button
      onClick={onClick}
      whileHover={{ y: -2, scale: 1.01 }}
      whileTap={{ scale: 0.98 }}
      className="relative w-full text-left p-4 rounded-xl border overflow-hidden transition-all group"
      style={{
        background: "#161b22",
        borderColor: "#30363d",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = `${accentColor}55`;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = "#30363d";
      }}
    >
      {/* Glow on hover */}
      <div
        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
        style={{
          background: `radial-gradient(ellipse at top left, ${accentColor}12, transparent 60%)`,
        }}
      />

      {/* Corner decoration */}
      <div
        className="absolute top-0 right-0 w-12 h-12 opacity-20"
        style={{
          background: `conic-gradient(from 180deg at 100% 0%, ${accentColor}, transparent)`,
        }}
      />

      {/* Header: icon + IIT badge */}
      <div className="flex items-start justify-between mb-3 relative">
        <div
          className="w-9 h-9 rounded-lg flex items-center justify-center text-lg"
          style={{ background: `${accentColor}15` }}
        >
          {icon}
        </div>

        <div className="flex flex-col items-end gap-1">
          <span
            className="text-[9px] font-mono px-1.5 py-0.5 rounded"
            style={{ background: `${accentColor}15`, color: accentColor }}
          >
            {iitLabel}
          </span>
          {club.isRecruiting && (
            <motion.span
              animate={{ opacity: [1, 0.5, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="text-[9px] font-mono px-1.5 py-0.5 rounded"
              style={{ background: "#22c55e22", color: "#22c55e" }}
            >
              ● RECRUITING
            </motion.span>
          )}
        </div>
      </div>

      {/* Club name */}
      <h3 className="font-bold text-sm text-white mb-1 leading-tight line-clamp-2">
        {club.name}
      </h3>

      {/* Tagline or description */}
      <p className="text-xs text-gray-500 line-clamp-2 mb-3 leading-relaxed">
        {club.tagline || club.description || "No description available"}
      </p>

      {/* Tags */}
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-3">
          {tags.map((tag) => (
            <span
              key={tag}
              className="text-[9px] font-mono px-1.5 py-0.5 rounded-full border"
              style={{ borderColor: "#30363d", color: "#6e7681" }}
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      {/* Footer: member count + links */}
      <div className="flex items-center justify-between mt-auto pt-2 border-t border-[#21262d]">
        <span className="text-[10px] font-mono text-gray-600">
          {club.memberCount ? `${club.memberCount} members` : club.category}
        </span>
        <div className="flex items-center gap-2">
          {club.githubUrl && (
            <a
              href={club.githubUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="text-gray-600 hover:text-white transition-colors text-xs"
            >
              ⎋
            </a>
          )}
          <span className="text-[10px]" style={{ color: `${accentColor}88` }}>
            →
          </span>
        </div>
      </div>
    </motion.button>
  );
}
