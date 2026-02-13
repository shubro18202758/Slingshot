"use client";

import { useEffect, useState } from "react";
import { useDb } from "@/components/providers/db-provider";
import { tasks, type Task } from "@/db/schema";
import { SmartInput } from "@/components/tasks/smart-input";
import { TaskBoard } from "@/components/tasks/task-board";
import { PriorityMatrix } from "@/components/tasks/priority-matrix";
import { AiSuggestions } from "@/components/tasks/ai-suggestions";
import { FocusTimer } from "@/components/focus/focus-timer";
import { TaskReminders } from "@/components/tasks/task-reminders";
import { desc } from "drizzle-orm";
import { Loader2, Zap, LayoutGrid, List, Lightbulb } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type ViewMode = "board" | "matrix" | "ai";

export default function TasksPage() {
    const { db } = useDb();
    const [taskList, setTaskList] = useState<Task[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [viewMode, setViewMode] = useState<ViewMode>("board");

    const fetchTasks = async () => {
        if (!db) return;
        try {
            const result = await db.select().from(tasks).orderBy(desc(tasks.createdAt));
            setTaskList(result);
        } catch (error) {
            console.error("Failed to fetch tasks:", error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchTasks();
    }, [db]);

    const viewOptions: { key: ViewMode; label: string; icon: typeof List }[] = [
        { key: "board", label: "Board", icon: List },
        { key: "matrix", label: "Matrix", icon: LayoutGrid },
        { key: "ai", label: "AI Insights", icon: Lightbulb },
    ];

    return (
        <div className="h-screen flex flex-col p-6 space-y-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <div className="bg-gradient-to-br from-blue-500/20 to-cyan-500/20 p-3 rounded-xl border border-blue-500/10">
                        <Zap className="h-6 w-6 text-blue-400" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-blue-400 via-cyan-400 to-teal-400 bg-clip-text text-transparent">
                            Task Force
                        </h1>
                        <p className="text-muted-foreground">
                            Manage your projects with AI assistance.
                        </p>
                    </div>
                </div>

                {/* View Mode Toggle */}
                <div className="flex items-center gap-1 bg-white/5 border border-white/10 rounded-xl p-1">
                    {viewOptions.map((opt) => (
                        <Button
                            key={opt.key}
                            variant="ghost"
                            size="sm"
                            className={cn(
                                "h-8 text-xs gap-1.5 rounded-lg transition-all",
                                viewMode === opt.key
                                    ? "bg-purple-500/20 text-purple-300"
                                    : "text-muted-foreground hover:text-foreground"
                            )}
                            onClick={() => setViewMode(opt.key)}
                        >
                            <opt.icon className="h-3.5 w-3.5" />
                            {opt.label}
                        </Button>
                    ))}
                </div>
            </div>

            {/* Smart Reminders */}
            <TaskReminders />

            <div className="w-full max-w-4xl mx-auto z-10 flex flex-col md:flex-row gap-6 items-start">
                <div className="flex-1 w-full">
                    <SmartInput onSuccess={fetchTasks} />
                </div>
                <div className="w-full md:w-auto shrink-0">
                    <FocusTimer />
                </div>
            </div>

            <div className="flex-1 overflow-hidden">
                {isLoading ? (
                    <div className="h-full flex items-center justify-center">
                        <Loader2 className="h-8 w-8 animate-spin text-purple-400/50" />
                    </div>
                ) : viewMode === "board" ? (
                    <TaskBoard tasks={taskList} onUpdate={fetchTasks} />
                ) : viewMode === "matrix" ? (
                    <PriorityMatrix tasks={taskList} onUpdate={fetchTasks} />
                ) : (
                    <AiSuggestions onCreateTask={fetchTasks} />
                )}
            </div>
        </div>
    );
}
