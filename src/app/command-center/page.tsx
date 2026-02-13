"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useDb } from "@/components/providers/db-provider";
import { documents, tasks, knowledgeItems, type Document, type Task, type KnowledgeItem } from "@/db/schema";
import { desc, eq, not } from "drizzle-orm";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
    LayoutDashboard, FileText, CheckCircle2, Brain,
    Plus, Search, Upload, Zap, ArrowRight,
    Clock, AlertTriangle, Sparkles
} from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

export default function CommandCenterPage() {
    const router = useRouter();
    const { db } = useDb();
    const [recentDocs, setRecentDocs] = useState<Document[]>([]);
    const [pendingTasks, setPendingTasks] = useState<Task[]>([]);
    const [kbItems, setKbItems] = useState<KnowledgeItem[]>([]);

    useEffect(() => {
        if (!db) return;
        const load = async () => {
            try {
                const [docs, tks, kb] = await Promise.all([
                    db.select().from(documents).orderBy(desc(documents.createdAt)).limit(5),
                    db.select().from(tasks).where(not(eq(tasks.status, "done"))).orderBy(desc(tasks.createdAt)).limit(8),
                    db.select().from(knowledgeItems).orderBy(desc(knowledgeItems.createdAt)).limit(4),
                ]);
                setRecentDocs(docs);
                setPendingTasks(tks);
                setKbItems(kb);
            } catch (e) {
                console.error("Command center load error:", e);
            }
        };
        load();
    }, [db]);

    const quickActions = [
        { label: "New Document", icon: FileText, color: "from-blue-600 to-cyan-600", href: "/documents" },
        { label: "Start Research", icon: Search, color: "from-cyan-600 to-teal-600", href: "/research" },
        { label: "Upload to KB", icon: Upload, color: "from-violet-600 to-purple-600", href: "/knowledge" },
        { label: "Create Task", icon: Plus, color: "from-amber-600 to-orange-600", href: "/tasks" },
    ];

    const overdueTasks = pendingTasks.filter(
        (t) => t.dueDate && new Date(t.dueDate) < new Date()
    );

    return (
        <div className="flex flex-col min-h-screen p-6 md:p-8">
            <div className="max-w-6xl mx-auto w-full space-y-8">
                {/* Header */}
                <div className="flex items-center gap-4">
                    <div className="bg-gradient-to-br from-amber-500/20 to-orange-500/20 p-3 rounded-xl border border-amber-500/10">
                        <LayoutDashboard className="h-6 w-6 text-amber-400" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-amber-400 via-orange-400 to-red-400 bg-clip-text text-transparent">
                            Command Center
                        </h1>
                        <p className="text-muted-foreground">
                            Your unified workspace — orchestrate everything from one place.
                        </p>
                    </div>
                </div>

                {/* Quick Actions */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {quickActions.map((action, i) => (
                        <motion.div
                            key={action.label}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.05 }}
                        >
                            <button
                                onClick={() => router.push(action.href)}
                                className={cn(
                                    "w-full flex items-center gap-3 p-4 rounded-xl border border-white/10",
                                    "bg-gradient-to-br opacity-90 hover:opacity-100 transition-all",
                                    "hover:scale-[1.02] hover:shadow-lg",
                                    action.color
                                )}
                            >
                                <action.icon className="h-5 w-5 text-white" />
                                <span className="text-sm font-medium text-white">{action.label}</span>
                            </button>
                        </motion.div>
                    ))}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Column 1: Focus (Pending Tasks) */}
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <h2 className="text-lg font-semibold flex items-center gap-2">
                                <Zap className="h-4 w-4 text-amber-400" /> Focus
                            </h2>
                            {overdueTasks.length > 0 && (
                                <Badge variant="outline" className="border-red-500/30 text-red-400 text-[10px]">
                                    {overdueTasks.length} overdue
                                </Badge>
                            )}
                        </div>

                        {pendingTasks.length === 0 ? (
                            <Card className="border-white/10 bg-white/5">
                                <CardContent className="p-6 text-center text-muted-foreground text-sm">
                                    <CheckCircle2 className="h-8 w-8 mx-auto mb-2 text-emerald-400" />
                                    All clear! No pending tasks.
                                </CardContent>
                            </Card>
                        ) : (
                            <div className="space-y-2">
                                {pendingTasks.map((task, i) => {
                                    const isOverdue = task.dueDate && new Date(task.dueDate) < new Date();
                                    return (
                                        <motion.div
                                            key={task.id}
                                            initial={{ opacity: 0, x: -10 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            transition={{ delay: i * 0.03 }}
                                        >
                                            <Card
                                                className={cn(
                                                    "border-white/10 bg-white/5 hover:bg-white/10 transition-all cursor-pointer",
                                                    isOverdue && "border-red-500/20"
                                                )}
                                                onClick={() => router.push("/tasks")}
                                            >
                                                <CardContent className="p-3 flex items-center gap-3">
                                                    <div className={cn(
                                                        "h-2 w-2 rounded-full shrink-0",
                                                        task.priority === "high" ? "bg-red-400" :
                                                            task.priority === "medium" ? "bg-amber-400" : "bg-blue-400"
                                                    )} />
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-sm font-medium truncate">{task.title}</p>
                                                        {task.dueDate && (
                                                            <p className={cn(
                                                                "text-[10px]",
                                                                isOverdue ? "text-red-400" : "text-muted-foreground"
                                                            )}>
                                                                {isOverdue ? "⚠ Overdue" : `Due ${new Date(task.dueDate).toLocaleDateString()}`}
                                                            </p>
                                                        )}
                                                    </div>
                                                    <Badge variant="outline" className="text-[10px] shrink-0">
                                                        {task.status}
                                                    </Badge>
                                                </CardContent>
                                            </Card>
                                        </motion.div>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    {/* Column 2: Recent Documents */}
                    <div className="space-y-4">
                        <h2 className="text-lg font-semibold flex items-center gap-2">
                            <FileText className="h-4 w-4 text-blue-400" /> Recent Documents
                        </h2>

                        {recentDocs.length === 0 ? (
                            <Card className="border-white/10 bg-white/5">
                                <CardContent className="p-6 text-center text-muted-foreground text-sm">
                                    No documents yet. Create one to get started.
                                </CardContent>
                            </Card>
                        ) : (
                            <div className="space-y-2">
                                {recentDocs.map((doc, i) => (
                                    <motion.div
                                        key={doc.id}
                                        initial={{ opacity: 0, x: -10 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: i * 0.03 }}
                                    >
                                        <Card
                                            className="border-white/10 bg-white/5 hover:bg-white/10 transition-all cursor-pointer"
                                            onClick={() => router.push(`/documents/${doc.id}`)}
                                        >
                                            <CardContent className="p-3 flex items-center gap-3">
                                                <FileText className="h-4 w-4 text-blue-400 shrink-0" />
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-medium truncate">{doc.title}</p>
                                                    <p className="text-[10px] text-muted-foreground">
                                                        {new Date(doc.createdAt).toLocaleDateString()}
                                                    </p>
                                                </div>
                                                <ArrowRight className="h-3 w-3 text-muted-foreground" />
                                            </CardContent>
                                        </Card>
                                    </motion.div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Column 3: Knowledge Base */}
                    <div className="space-y-4">
                        <h2 className="text-lg font-semibold flex items-center gap-2">
                            <Brain className="h-4 w-4 text-purple-400" /> Knowledge Base
                        </h2>

                        {kbItems.length === 0 ? (
                            <Card className="border-white/10 bg-white/5">
                                <CardContent className="p-6 text-center text-muted-foreground text-sm">
                                    No knowledge items. Upload documents to build your AI brain.
                                </CardContent>
                            </Card>
                        ) : (
                            <div className="space-y-2">
                                {kbItems.map((item, i) => (
                                    <motion.div
                                        key={item.id}
                                        initial={{ opacity: 0, x: -10 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: i * 0.03 }}
                                    >
                                        <Card
                                            className="border-white/10 bg-white/5 hover:bg-white/10 transition-all cursor-pointer"
                                            onClick={() => router.push("/knowledge")}
                                        >
                                            <CardContent className="p-3 flex items-center gap-3">
                                                <Brain className="h-4 w-4 text-purple-400 shrink-0" />
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-medium truncate">{item.title}</p>
                                                    <p className="text-[10px] text-muted-foreground">
                                                        {item.type.toUpperCase()} • {item.fileSize}
                                                    </p>
                                                </div>
                                                <Badge variant="outline" className="text-[10px] border-purple-500/30 text-purple-400">
                                                    {item.type}
                                                </Badge>
                                            </CardContent>
                                        </Card>
                                    </motion.div>
                                ))}
                            </div>
                        )}

                        {/* AI Status Card */}
                        <Card className="border-purple-500/20 bg-purple-500/5">
                            <CardContent className="p-4 flex items-center gap-3">
                                <Sparkles className="h-5 w-5 text-purple-400" />
                                <div className="flex-1">
                                    <p className="text-sm font-medium text-purple-300">AI Ready</p>
                                    <p className="text-[10px] text-muted-foreground">DeepSeek R1 • WebGPU Accelerated</p>
                                </div>
                                <div className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
        </div>
    );
}
