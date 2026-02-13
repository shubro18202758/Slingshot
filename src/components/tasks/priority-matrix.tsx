"use client";

import { useState } from "react";
import type { Task } from "@/db/schema";
import { useDb } from "@/components/providers/db-provider";
import { tasks } from "@/db/schema";
import { eq } from "drizzle-orm";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { AlertTriangle, Target, Clock, Inbox } from "lucide-react";

interface PriorityMatrixProps {
    tasks: Task[];
    onUpdate: () => void;
}

type Quadrant = "urgent-important" | "important" | "urgent" | "neither";

function classifyTask(task: Task): Quadrant {
    const isHighPriority = task.priority === "high";
    const isUrgent = task.dueDate
        ? new Date(task.dueDate).getTime() - Date.now() < 3 * 24 * 60 * 60 * 1000 // within 3 days
        : false;

    if (isHighPriority && isUrgent) return "urgent-important";
    if (isHighPriority) return "important";
    if (isUrgent) return "urgent";
    return "neither";
}

const QUADRANTS = [
    {
        key: "urgent-important" as Quadrant,
        label: "Do First",
        subtitle: "Urgent & Important",
        icon: AlertTriangle,
        color: "text-red-400",
        bg: "bg-red-500/5 border-red-500/20 hover:border-red-500/40",
        badge: "bg-red-500/20 text-red-300",
    },
    {
        key: "important" as Quadrant,
        label: "Schedule",
        subtitle: "Important, Not Urgent",
        icon: Target,
        color: "text-blue-400",
        bg: "bg-blue-500/5 border-blue-500/20 hover:border-blue-500/40",
        badge: "bg-blue-500/20 text-blue-300",
    },
    {
        key: "urgent" as Quadrant,
        label: "Delegate",
        subtitle: "Urgent, Not Important",
        icon: Clock,
        color: "text-amber-400",
        bg: "bg-amber-500/5 border-amber-500/20 hover:border-amber-500/40",
        badge: "bg-amber-500/20 text-amber-300",
    },
    {
        key: "neither" as Quadrant,
        label: "Eliminate",
        subtitle: "Neither Urgent Nor Important",
        icon: Inbox,
        color: "text-slate-400",
        bg: "bg-slate-500/5 border-slate-500/20 hover:border-slate-500/40",
        badge: "bg-slate-500/20 text-slate-300",
    },
];

export function PriorityMatrix({ tasks: taskList, onUpdate }: PriorityMatrixProps) {
    const { db } = useDb();

    const activeTasks = taskList.filter((t) => t.status !== "done");

    const grouped = QUADRANTS.map((q) => ({
        ...q,
        items: activeTasks.filter((t) => classifyTask(t) === q.key),
    }));

    const handleStatusToggle = async (task: Task) => {
        if (!db) return;
        const newStatus = task.status === "done" ? "todo" : "done";
        await db.update(tasks).set({ status: newStatus }).where(eq(tasks.id, task.id));
        onUpdate();
    };

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {grouped.map((quadrant, qi) => (
                <motion.div
                    key={quadrant.key}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: qi * 0.08 }}
                    className={cn(
                        "rounded-xl border p-4 transition-all min-h-[180px]",
                        quadrant.bg
                    )}
                >
                    <div className="flex items-center gap-2 mb-3">
                        <quadrant.icon className={cn("h-4 w-4", quadrant.color)} />
                        <div>
                            <h4 className={cn("font-semibold text-sm", quadrant.color)}>{quadrant.label}</h4>
                            <p className="text-[10px] text-muted-foreground">{quadrant.subtitle}</p>
                        </div>
                        <span className={cn("ml-auto text-xs font-mono px-2 py-0.5 rounded-full", quadrant.badge)}>
                            {quadrant.items.length}
                        </span>
                    </div>

                    {quadrant.items.length === 0 ? (
                        <p className="text-xs text-muted-foreground/50 text-center py-6">No tasks</p>
                    ) : (
                        <div className="space-y-1.5">
                            {quadrant.items.map((task) => (
                                <div
                                    key={task.id}
                                    className="flex items-center gap-2 p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors group cursor-pointer"
                                    onClick={() => handleStatusToggle(task)}
                                >
                                    <div className={cn(
                                        "h-3.5 w-3.5 rounded-full border-2 shrink-0 transition-colors",
                                        task.status === "done" ? "bg-emerald-500 border-emerald-500" : `border-current ${quadrant.color}`
                                    )} />
                                    <span className={cn(
                                        "text-sm truncate flex-1",
                                        task.status === "done" && "line-through text-muted-foreground"
                                    )}>
                                        {task.title}
                                    </span>
                                    {task.dueDate && (
                                        <span className="text-[10px] text-muted-foreground shrink-0">
                                            {new Date(task.dueDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                                        </span>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </motion.div>
            ))}
        </div>
    );
}
