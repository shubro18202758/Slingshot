"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface CrawlEvent {
  type: string;
  stage?: string;
  iitId?: string;
  clubName?: string;
  progress?: number;
  message: string;
  data?: unknown;
}

interface IITOption {
  id: string;
  label: string;
  color: string;
}

interface NexusCrawlPanelProps {
  onClose: () => void;
  onComplete: () => void;
  iitOptions: IITOption[];
}

const STAGE_LABELS: Record<string, string> = {
  discovery: "Discovery",
  profile:   "Profiling",
  knowledge: "Knowledge",
  embed:     "Embedding",
  done:      "Complete",
  pipeline:  "Pipeline",
  persist:   "Persisting",
};

const STAGE_ICONS: Record<string, string> = {
  discovery: "🔭",
  profile:   "📋",
  knowledge: "🧠",
  embed:     "⬡",
  done:      "✓",
  pipeline:  "⚡",
  persist:   "💾",
};

export function NexusCrawlPanel({ onClose, onComplete, iitOptions }: NexusCrawlPanelProps) {
  const [selectedIITs, setSelectedIITs] = useState<string[]>(["iitb"]);
  const [selectedStages, setSelectedStages] = useState<string[]>(["discovery", "profile", "knowledge"]);
  const [maxClubs, setMaxClubs] = useState(15);
  const [preview, setPreview] = useState(false);
  const [isCrawling, setIsCrawling] = useState(false);
  const [events, setEvents] = useState<CrawlEvent[]>([]);
  const [overallProgress, setOverallProgress] = useState(0);
  const [currentIIT, setCurrentIIT] = useState<string>("");
  const [clubsFound, setClubsFound] = useState(0);
  const [knowledgeExtracted, setKnowledgeExtracted] = useState(0);
  const [phase, setPhase] = useState<"config" | "running" | "done">("config");

  const logRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Auto-scroll log
  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [events]);

  const toggleIIT = (id: string) => {
    setSelectedIITs((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const toggleStage = (stage: string) => {
    setSelectedStages((prev) =>
      prev.includes(stage) ? prev.filter((s) => s !== stage) : [...prev, stage]
    );
  };

  const startCrawl = useCallback(async () => {
    setIsCrawling(true);
    setEvents([]);
    setOverallProgress(0);
    setClubsFound(0);
    setKnowledgeExtracted(0);
    setPhase("running");

    abortRef.current = new AbortController();

    try {
      const response = await fetch("/api/clubs/crawl", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          iitIds: selectedIITs,
          maxClubsPerIIT: maxClubs,
          preview,
          stages: selectedStages,
        }),
        signal: abortRef.current.signal,
      });

      const reader = response.body?.getReader();
      if (!reader) throw new Error("No response stream");

      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          try {
            const event: CrawlEvent = JSON.parse(line.slice(6));
            setEvents((prev) => [...prev.slice(-100), event]); // keep last 100

            // Update progress indicators
            if (event.iitId && event.iitId !== "all") {
              setCurrentIIT(event.iitId);
            }
            if (event.progress !== undefined) {
              setOverallProgress(event.progress);
            }
            if (event.stage === "discovery" && event.type === "result") {
              const clubs = (event.data as { length?: number })?.length ?? 0;
              setClubsFound((p) => p + clubs);
            }
            if (event.stage === "knowledge" && event.type === "result") {
              setKnowledgeExtracted((p) => p + 1);
            }
            if (event.type === "complete" || event.type === "done") {
              setPhase("done");
              onComplete();
            }
          } catch {}
        }
      }
    } catch (err: unknown) {
      if ((err as Error).name !== "AbortError") {
        setEvents((prev) => [
          ...prev,
          { type: "error", message: `Pipeline error: ${String(err)}` },
        ]);
      }
    } finally {
      setIsCrawling(false);
      if (phase !== "done") setPhase("done");
    }
  }, [selectedIITs, maxClubs, preview, selectedStages, onComplete, phase]);

  const stopCrawl = () => {
    abortRef.current?.abort();
    setIsCrawling(false);
    setPhase("done");
  };

  const accentColor = "#00d4ff";

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.85)", backdropFilter: "blur(12px)" }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        initial={{ scale: 0.95, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.95, y: 20 }}
        className="w-full max-w-3xl rounded-2xl overflow-hidden"
        style={{
          background: "#0d1117",
          border: "1px solid #30363d",
          boxShadow: `0 0 60px ${accentColor}22`,
        }}
      >
        {/* Header */}
        <div
          className="px-6 py-4 flex items-center justify-between"
          style={{
            background: "linear-gradient(90deg, #00d4ff08, #a855f708)",
            borderBottom: "1px solid #21262d",
          }}
        >
          <div>
            <h2 className="text-lg font-black text-white tracking-tight">
              ⬡ NEXUS AGENT
            </h2>
            <p className="text-xs font-mono text-gray-500 mt-0.5">
              Multi-stage IIT Club Intelligence Crawler
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-white transition-colors text-xl"
          >
            ×
          </button>
        </div>

        <div className="p-6">
          <AnimatePresence mode="wait">
            {phase === "config" && (
              <motion.div
                key="config"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="space-y-6"
              >
                {/* IIT Selection */}
                <div>
                  <label className="text-xs font-mono text-gray-400 mb-2 block">
                    SELECT IITs TO CRAWL
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {iitOptions.filter((i) => i.id !== "all").map((iit) => (
                      <button
                        key={iit.id}
                        onClick={() => toggleIIT(iit.id)}
                        className="px-3 py-2 rounded-lg text-xs font-mono border transition-all"
                        style={
                          selectedIITs.includes(iit.id)
                            ? {
                                background: `${iit.color}22`,
                                borderColor: `${iit.color}66`,
                                color: iit.color,
                              }
                            : {
                                background: "#161b22",
                                borderColor: "#30363d",
                                color: "#6e7681",
                              }
                        }
                      >
                        {iit.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Pipeline Stages */}
                <div>
                  <label className="text-xs font-mono text-gray-400 mb-2 block">
                    PIPELINE STAGES
                  </label>
                  <div className="flex gap-2">
                    {["discovery", "profile", "knowledge"].map((stage) => (
                      <button
                        key={stage}
                        onClick={() => toggleStage(stage)}
                        className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-mono border transition-all"
                        style={
                          selectedStages.includes(stage)
                            ? {
                                background: "#00d4ff22",
                                borderColor: "#00d4ff66",
                                color: "#00d4ff",
                              }
                            : {
                                background: "#161b22",
                                borderColor: "#30363d",
                                color: "#6e7681",
                              }
                        }
                      >
                        {STAGE_ICONS[stage]} {STAGE_LABELS[stage]}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Options row */}
                <div className="flex items-center gap-6">
                  <div>
                    <label className="text-xs font-mono text-gray-400 mb-2 block">
                      MAX CLUBS / IIT
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="range"
                        min={5}
                        max={50}
                        value={maxClubs}
                        onChange={(e) => setMaxClubs(parseInt(e.target.value))}
                        className="w-32 accent-cyan-400"
                      />
                      <span className="text-sm font-mono text-white w-8">{maxClubs}</span>
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-mono text-gray-400 mb-2 block">
                      PREVIEW MODE
                    </label>
                    <button
                      onClick={() => setPreview(!preview)}
                      className="px-3 py-1.5 rounded-lg text-xs font-mono border transition-all"
                      style={
                        preview
                          ? { background: "#f59e0b22", borderColor: "#f59e0b66", color: "#f59e0b" }
                          : { background: "#161b22", borderColor: "#30363d", color: "#6e7681" }
                      }
                    >
                      {preview ? "● Preview only" : "○ Save to DB"}
                    </button>
                  </div>
                </div>

                {/* Estimate */}
                <div
                  className="p-3 rounded-lg text-xs font-mono text-gray-500"
                  style={{ background: "#161b22", border: "1px solid #21262d" }}
                >
                  ⏱ Estimated time: ~{Math.ceil((selectedIITs.length * maxClubs * 5) / 60)} min for {selectedIITs.length} IIT(s) × {maxClubs} clubs · Groq: llama-3.3-70b-versatile
                </div>

                {/* Launch button */}
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={startCrawl}
                  disabled={selectedIITs.length === 0}
                  className="w-full py-4 rounded-xl font-mono font-bold text-sm tracking-wider disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                  style={{
                    background: "linear-gradient(135deg, #00d4ff22, #a855f722)",
                    border: "1px solid #00d4ff44",
                    color: "#00d4ff",
                  }}
                >
                  ⬡ LAUNCH NEXUS PIPELINE
                </motion.button>
              </motion.div>
            )}

            {(phase === "running" || phase === "done") && (
              <motion.div
                key="running"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="space-y-4"
              >
                {/* Progress header */}
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-mono text-gray-500">
                      {isCrawling ? (
                        <>
                          <motion.span
                            animate={{ opacity: [1, 0.3, 1] }}
                            transition={{ duration: 1.5, repeat: Infinity }}
                            style={{ color: accentColor }}
                          >
                            ●
                          </motion.span>{" "}
                          NEXUS ACTIVE — {currentIIT?.toUpperCase()}
                        </>
                      ) : (
                        <span style={{ color: "#22c55e" }}>✓ PIPELINE COMPLETE</span>
                      )}
                    </p>
                  </div>
                  <div className="flex items-center gap-4 text-xs font-mono">
                    <span>
                      <span style={{ color: accentColor }}>{clubsFound}</span>{" "}
                      <span className="text-gray-600">clubs found</span>
                    </span>
                    <span>
                      <span style={{ color: "#a855f7" }}>{knowledgeExtracted}</span>{" "}
                      <span className="text-gray-600">knowledge items</span>
                    </span>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="w-full bg-[#21262d] rounded-full h-1.5 overflow-hidden">
                  <motion.div
                    className="h-full rounded-full"
                    style={{
                      background: `linear-gradient(90deg, ${accentColor}, #a855f7)`,
                    }}
                    animate={{ width: `${overallProgress}%` }}
                    transition={{ duration: 0.5 }}
                  />
                </div>

                {/* Event log */}
                <div
                  ref={logRef}
                  className="h-72 overflow-y-auto rounded-xl p-3 space-y-1.5 scroll-smooth"
                  style={{ background: "#010409", border: "1px solid #21262d" }}
                >
                  {events.map((event, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="flex items-start gap-2 text-xs font-mono"
                    >
                      <span
                        className="flex-shrink-0 mt-0.5"
                        style={{
                          color:
                            event.type === "error" || event.type === "fatal_error"
                              ? "#ef4444"
                              : event.type === "complete" || event.type === "done"
                              ? "#22c55e"
                              : event.type === "result"
                              ? "#a855f7"
                              : accentColor,
                        }}
                      >
                        {STAGE_ICONS[event.stage ?? ""] ?? "·"}
                      </span>
                      <span
                        className="text-gray-600 flex-shrink-0"
                        style={{ fontSize: "10px" }}
                      >
                        {event.iitId?.toUpperCase()}
                        {event.clubName ? `/${event.clubName}` : ""}
                      </span>
                      <span
                        className={
                          event.type === "error" || event.type === "fatal_error"
                            ? "text-red-400"
                            : event.type === "complete" || event.type === "done"
                            ? "text-green-400"
                            : "text-gray-400"
                        }
                      >
                        {event.message}
                      </span>
                    </motion.div>
                  ))}
                  {isCrawling && (
                    <div className="flex items-center gap-1 text-xs font-mono text-gray-600">
                      <motion.span
                        animate={{ opacity: [0, 1, 0] }}
                        transition={{ duration: 1, repeat: Infinity }}
                      >
                        _
                      </motion.span>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex gap-3">
                  {isCrawling ? (
                    <button
                      onClick={stopCrawl}
                      className="flex-1 py-3 rounded-xl font-mono text-sm border border-red-900 text-red-400 hover:bg-red-900/20 transition-colors"
                    >
                      ■ ABORT PIPELINE
                    </button>
                  ) : (
                    <>
                      <button
                        onClick={() => setPhase("config")}
                        className="flex-1 py-3 rounded-xl font-mono text-sm border border-[#30363d] text-gray-400 hover:text-white transition-colors"
                      >
                        ← Run Again
                      </button>
                      <button
                        onClick={onClose}
                        className="flex-1 py-3 rounded-xl font-mono text-sm transition-all"
                        style={{
                          background: "#00d4ff22",
                          border: "1px solid #00d4ff44",
                          color: "#00d4ff",
                        }}
                      >
                        View Clubs →
                      </button>
                    </>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </motion.div>
  );
}
