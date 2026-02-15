"use client";

import { useState, useCallback, useRef } from "react";
import { runCopilotCycle, createInitialState, type CopilotState, type CopilotStage, type CopilotEvent } from "@/lib/ai/copilot-orchestrator";
import { getUserContext } from "@/app/actions/profile-actions";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
    Brain, Map, Search, BookOpen, Route, Swords,
    BarChart3, Calendar, Unlock, CheckCircle, Loader2,
    AlertTriangle, Zap, Play, RotateCcw
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const STAGE_CONFIG: Record<CopilotStage, { label: string; icon: any; color: string; step: number }> = {
    idle: { label: "Ready", icon: Play, color: "text-white/40", step: 0 },
    profiling: { label: "Neural Profiling", icon: Brain, color: "text-violet-400", step: 1 },
    mapping: { label: "Concept Mapping", icon: Map, color: "text-blue-400", step: 2 },
    analyzing: { label: "Gap Analysis", icon: Search, color: "text-amber-400", step: 3 },
    curating: { label: "Content Curation", icon: BookOpen, color: "text-emerald-400", step: 4 },
    building: { label: "Roadmap Build", icon: Route, color: "text-cyan-400", step: 5 },
    testing: { label: "Challenge Gen", icon: Swords, color: "text-red-400", step: 6 },
    evaluating: { label: "Evaluation", icon: BarChart3, color: "text-purple-400", step: 7 },
    adapting: { label: "Adaptive Plan", icon: Calendar, color: "text-orange-400", step: 8 },
    unlocking: { label: "Threshold Check", icon: Unlock, color: "text-yellow-400", step: 9 },
    complete: { label: "Cycle Complete", icon: CheckCircle, color: "text-emerald-400", step: 10 },
    error: { label: "Error", icon: AlertTriangle, color: "text-red-500", step: -1 },
};

const TOTAL_STAGES = 9;

interface CopilotRunnerProps {
    onCycleComplete?: (state: CopilotState) => void;
}

export function CopilotRunner({ onCycleComplete }: CopilotRunnerProps) {
    const [state, setState] = useState<CopilotState>(createInitialState);
    const [events, setEvents] = useState<CopilotEvent[]>([]);
    const [isRunning, setIsRunning] = useState(false);
    const [domainInput, setDomainInput] = useState("");
    const stateRef = useRef(state);

    // Keep stateRef in sync so re-runs always see fresh state
    stateRef.current = state;

    const handleEvent = useCallback((event: CopilotEvent) => {
        setEvents(prev => [...prev, event]);
        if (event.type === "STAGE_START") {
            setState(prev => ({ ...prev, stage: event.stage }));
        }
        if (event.type === "STAGE_COMPLETE") {
            // Update with result data
            setState(prev => {
                const next = { ...prev };
                switch (event.stage) {
                    case "profiling": next.profile = event.data; break;
                    case "mapping": next.roadmapGraph = event.data; break;
                    case "analyzing": next.gapAnalysis = event.data; break;
                    case "curating": next.curatedPath = event.data; break;
                    case "building": next.adaptiveRoadmap = event.data; break;
                    case "testing": next.challenges = event.data; break;
                    case "evaluating":
                        next.progressEval = event.data.progressEval;
                        next.careerEval = event.data.careerEval;
                        break;
                    case "adapting": next.masteryPlan = event.data; break;
                    case "unlocking": next.threshold = event.data; break;
                }
                return next;
            });
        }
        if (event.type === "CYCLE_COMPLETE") {
            setState(prev => ({ ...prev, stage: "complete" }));
        }
        if (event.type === "STAGE_ERROR") {
            setState(prev => ({ ...prev, stage: "error", error: event.error }));
        }
    }, []);

    const runLoop = async () => {
        if (!domainInput.trim()) return;
        setIsRunning(true);
        setEvents([]);
        setState(createInitialState());

        // Dynamically fetch user context from DB (documents, tasks, etc.)
        let userHistory: string;
        try {
            const ctx = await getUserContext();
            userHistory = ctx || "New learner — no prior history available.";
        } catch {
            userHistory = "New learner — no prior history available.";
        }

        const finalState = await runCopilotCycle(userHistory, domainInput.trim(), handleEvent, stateRef.current);
        setState(finalState);
        setIsRunning(false);
        onCycleComplete?.(finalState);
    };

    const currentStep = STAGE_CONFIG[state.stage]?.step || 0;
    const progress = state.stage === "complete" ? 100 : Math.round((Math.max(0, currentStep) / TOTAL_STAGES) * 100);
    const currentConfig = STAGE_CONFIG[state.stage];
    const Icon = currentConfig.icon;

    return (
        <div className="space-y-4">
            {/* Header with Run Button */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="bg-gradient-to-br from-violet-500/20 to-cyan-500/20 p-2 rounded-lg border border-violet-500/10">
                        <Zap className="h-5 w-5 text-violet-400" />
                    </div>
                    <div>
                        <h3 className="text-sm font-semibold text-white">Intelligence Loop</h3>
                        <p className="text-xs text-muted-foreground">
                            {state.stage === "idle"
                                ? "PROFILE → MAP → ANALYZE → CURATE → BUILD → TEST → EVALUATE → ADAPT → UNLOCK"
                                : `Cycle #${state.cycleCount}`}
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <Input
                        placeholder="Domain (e.g. Distributed Systems)"
                        value={domainInput}
                        onChange={(e) => setDomainInput(e.target.value)}
                        disabled={isRunning}
                        className="w-56 h-8 text-xs bg-black/50 border-violet-500/30 text-violet-100 placeholder:text-violet-500/40"
                        onKeyDown={(e) => { if (e.key === "Enter") runLoop(); }}
                    />
                    <Button
                        size="sm"
                        onClick={runLoop}
                        disabled={isRunning || !domainInput.trim()}
                        className="bg-gradient-to-r from-violet-600 to-cyan-600 hover:from-violet-500 hover:to-cyan-500 text-white text-xs h-8"
                    >
                    {isRunning ? (
                        <><Loader2 className="h-3 w-3 mr-1.5 animate-spin" /> Running...</>
                    ) : state.stage === "complete" ? (
                        <><RotateCcw className="h-3 w-3 mr-1.5" /> Re-Optimize</>
                    ) : (
                        <><Play className="h-3 w-3 mr-1.5" /> Run Cycle</>
                    )}
                    </Button>
                </div>
            </div>

            {/* Progress Bar */}
            <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                    <span className={`flex items-center gap-1.5 font-medium ${currentConfig.color}`}>
                        <Icon className="h-3.5 w-3.5" />
                        {currentConfig.label}
                    </span>
                    <span className="text-muted-foreground">{progress}%</span>
                </div>
                <Progress
                    value={progress}
                    className="h-2 bg-white/5"
                />
            </div>

            {/* Pipeline Visualization */}
            <div className="grid grid-cols-9 gap-1">
                {(["profiling", "mapping", "analyzing", "curating", "building", "testing", "evaluating", "adapting", "unlocking"] as CopilotStage[]).map((stage, i) => {
                    const config = STAGE_CONFIG[stage];
                    const StageIcon = config.icon;
                    const isActive = state.stage === stage;
                    const isDone = currentStep > config.step;
                    const isPending = currentStep < config.step;

                    return (
                        <motion.div
                            key={stage}
                            initial={{ opacity: 0, y: 5 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.05 }}
                            className={`
                                flex flex-col items-center gap-1 p-2 rounded-lg border text-center
                                transition-all duration-300
                                ${isActive ? `border-white/20 bg-white/5 ${config.color}` : ""}
                                ${isDone ? "border-emerald-500/20 bg-emerald-500/5 text-emerald-400" : ""}
                                ${isPending ? "border-white/5 bg-black/20 text-white/20" : ""}
                            `}
                        >
                            {isActive && isRunning ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : isDone ? (
                                <CheckCircle className="h-3.5 w-3.5" />
                            ) : (
                                <StageIcon className="h-3.5 w-3.5" />
                            )}
                            <span className="text-[9px] leading-tight font-medium">
                                {config.label.split(" ")[0]}
                            </span>
                        </motion.div>
                    );
                })}
            </div>

            {/* Results Summary (After Completion) */}
            <AnimatePresence>
                {state.stage === "complete" && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                    >
                        <Card className="bg-black/40 border-emerald-500/20 p-4 space-y-3">
                            <h4 className="text-sm font-semibold text-emerald-400 flex items-center gap-2">
                                <CheckCircle className="h-4 w-4" /> Cycle #{state.cycleCount} Complete
                            </h4>

                            <div className="grid grid-cols-2 gap-3 text-xs">
                                {state.profile && (
                                    <div className="bg-violet-500/5 border border-violet-500/10 rounded p-2">
                                        <span className="text-violet-400 font-medium">Level</span>
                                        <p className="text-white/80 mt-0.5">{state.profile.level}</p>
                                    </div>
                                )}
                                {state.gapAnalysis && (
                                    <div className="bg-amber-500/5 border border-amber-500/10 rounded p-2">
                                        <span className="text-amber-400 font-medium">Bottlenecks</span>
                                        <p className="text-white/80 mt-0.5">{state.gapAnalysis.bottleneck_concepts.length} found</p>
                                    </div>
                                )}
                                {state.careerEval && (
                                    <div className="bg-purple-500/5 border border-purple-500/10 rounded p-2">
                                        <span className="text-purple-400 font-medium">Career Score</span>
                                        <p className="text-white/80 mt-0.5">{state.careerEval.overall.internship_readiness_score}/100</p>
                                    </div>
                                )}
                                {state.threshold && (
                                    <div className={`border rounded p-2 ${state.threshold.advanced_unlocked ? "bg-emerald-500/5 border-emerald-500/10" : "bg-red-500/5 border-red-500/10"}`}>
                                        <span className={state.threshold.advanced_unlocked ? "text-emerald-400 font-medium" : "text-red-400 font-medium"}>
                                            Advanced
                                        </span>
                                        <p className="text-white/80 mt-0.5">
                                            {state.threshold.advanced_unlocked ? `🔓 ${state.threshold.new_learning_tier}` : "🔒 Locked"}
                                        </p>
                                    </div>
                                )}
                            </div>

                            {state.adaptiveRoadmap && (
                                <div className="text-xs text-muted-foreground">
                                    <span className="text-white/60">Roadmap generated: </span>
                                    Week 1: {state.adaptiveRoadmap.week_1.focus} → Week 4: {state.adaptiveRoadmap.week_4.focus}
                                </div>
                            )}
                        </Card>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Error State */}
            {state.stage === "error" && (
                <Card className="bg-red-950/20 border-red-500/20 p-3">
                    <p className="text-xs text-red-400 flex items-center gap-2">
                        <AlertTriangle className="h-3.5 w-3.5" />
                        {state.error}
                    </p>
                </Card>
            )}
        </div>
    );
}
