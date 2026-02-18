"use client";

import { useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";

// ─── Search Bar ──────────────────────────────────────────────────────────────

interface NexusSearchBarProps {
  onSearch: (query: string) => void;
  isLoading: boolean;
  accentColor: string;
}

const EXAMPLE_QUERIES = [
  "Which clubs are recruiting first-year students?",
  "Robotics clubs across IITs",
  "What projects has E-Cell done?",
  "Clubs with open source GitHub repos",
  "AI and ML clubs IITB",
];

export function NexusSearchBar({ onSearch, isLoading, accentColor }: NexusSearchBarProps) {
  const [query, setQuery] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = useCallback(
    (q: string) => {
      const trimmed = q.trim();
      setQuery(trimmed);
      onSearch(trimmed);
    },
    [onSearch]
  );

  return (
    <div className="relative">
      <motion.div
        animate={isFocused ? { scale: 1.005 } : { scale: 1 }}
        className="relative flex items-center rounded-xl overflow-hidden"
        style={{
          border: `1px solid ${isFocused ? accentColor + "55" : "#30363d"}`,
          background: "#161b22",
          boxShadow: isFocused ? `0 0 20px ${accentColor}15` : "none",
          transition: "border-color 0.2s, box-shadow 0.2s",
        }}
      >
        {/* Icon */}
        <div className="pl-4 pr-2 text-gray-600">
          {isLoading ? (
            <motion.span
              animate={{ rotate: 360 }}
              transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
              style={{ color: accentColor, display: "block" }}
            >
              ◈
            </motion.span>
          ) : (
            <span>◈</span>
          )}
        </div>

        {/* Input */}
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          onKeyDown={(e) => e.key === "Enter" && handleSubmit(query)}
          placeholder="Ask Nexus anything about IIT clubs..."
          className="flex-1 py-3.5 bg-transparent text-white text-sm outline-none placeholder-gray-600 font-mono"
        />

        {/* Clear */}
        {query && (
          <button
            onClick={() => {
              setQuery("");
              onSearch("");
              inputRef.current?.focus();
            }}
            className="pr-2 text-gray-600 hover:text-gray-400 transition-colors"
          >
            ×
          </button>
        )}

        {/* Search button */}
        <button
          onClick={() => handleSubmit(query)}
          className="m-1.5 px-4 py-2 rounded-lg text-xs font-mono font-semibold transition-all"
          style={{
            background: query.trim() ? `${accentColor}22` : "#21262d",
            color: query.trim() ? accentColor : "#6e7681",
            border: `1px solid ${query.trim() ? accentColor + "44" : "#30363d"}`,
          }}
        >
          Search
        </button>
      </motion.div>

      {/* Example queries */}
      <AnimatePresence>
        {isFocused && !query && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            className="absolute top-full left-0 right-0 mt-2 p-3 rounded-xl z-20"
            style={{ background: "#161b22", border: "1px solid #30363d" }}
          >
            <p className="text-[10px] font-mono text-gray-600 mb-2">TRY ASKING</p>
            <div className="flex flex-wrap gap-2">
              {EXAMPLE_QUERIES.map((q) => (
                <button
                  key={q}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    setQuery(q);
                    handleSubmit(q);
                  }}
                  className="text-xs font-mono px-2.5 py-1.5 rounded-full border border-[#30363d] text-gray-500 hover:text-gray-300 hover:border-gray-500 transition-colors text-left"
                >
                  {q}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── IIT Filter Bar ───────────────────────────────────────────────────────────

interface IITFilterBarProps {
  options: Array<{ id: string; label: string; color: string }>;
  selected: string;
  onSelect: (id: string) => void;
}

export function IITFilterBar({ options, selected, onSelect }: IITFilterBarProps) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
      {options.map((option) => {
        const isSelected = selected === option.id;
        return (
          <motion.button
            key={option.id}
            whileTap={{ scale: 0.95 }}
            onClick={() => onSelect(option.id)}
            className="flex-shrink-0 px-4 py-2 rounded-full text-xs font-mono font-semibold transition-all border"
            style={
              isSelected
                ? {
                    background: `${option.color}22`,
                    borderColor: `${option.color}55`,
                    color: option.color,
                    boxShadow: `0 0 12px ${option.color}25`,
                  }
                : {
                    background: "#161b22",
                    borderColor: "#30363d",
                    color: "#6e7681",
                  }
            }
          >
            {option.label}
          </motion.button>
        );
      })}
    </div>
  );
}
