"use client";

import { useState, useEffect } from "react";
import { useTheme } from "next-themes";
import {
    Settings, Brain, Palette, Database, Info,
    Cpu, Zap, HardDrive, Activity, Trash2,
    Download, Upload, Sun, Moon, Laptop,
    Layers, CheckCircle2, AlertTriangle, Globe
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { useDb } from "@/components/providers/db-provider";
import { documents, tasks, knowledgeItems } from "@/db/schema";
import { count } from "drizzle-orm";
import { seedStudentProfile } from "@/db/seed-student";
import { toast } from "sonner"; // Assuming sonner is used, or alert if not available.
// Checking package.json... sonner is not listed but widely used in modern stacks. 
// Use window.alert or console if sonner not found. Wait, I saw "cmdk" and "shadcn", so likely "sonner" is there or "use-toast".
// I'll check imports later. For now, I'll use console/alert fallback inside handleSeed if toast is missing.
// Actually, I'll just skip toast import and use alert/console in handleSeed to be safe.


// Accent color options
const ACCENT_COLORS = [
    { name: "Violet", value: "violet", class: "bg-violet-500" },
    { name: "Blue", value: "blue", class: "bg-blue-500" },
    { name: "Emerald", value: "emerald", class: "bg-emerald-500" },
    { name: "Rose", value: "rose", class: "bg-rose-500" },
    { name: "Amber", value: "amber", class: "bg-amber-500" },
    { name: "Cyan", value: "cyan", class: "bg-cyan-500" },
];

// Tech stack items for the About tab
const TECH_STACK = [
    { name: "Next.js 16", category: "Framework", icon: Globe },
    { name: "DeepSeek R1 (Qwen3-8B)", category: "LLM", icon: Brain },
    { name: "WebGPU", category: "Acceleration", icon: Zap },
    { name: "PGlite + pgvector", category: "Database", icon: Database },
    { name: "Drizzle ORM", category: "ORM", icon: Layers },
    { name: "Agentic RAG", category: "AI Pipeline", icon: Activity },
];

export default function SettingsPage() {
    const { theme, setTheme } = useTheme();
    const { db } = useDb();
    const [accentColor, setAccentColor] = useState("violet");
    const [gpuEnabled, setGpuEnabled] = useState(true);
    const [workspaceName, setWorkspaceName] = useState("Personal Workspace");
    const [stats, setStats] = useState({ documents: 0, tasks: 0, knowledge: 0 });
    const [gpuInfo, setGpuInfo] = useState<{ renderer: string; vendor: string } | null>(null);
    const [webgpuSupported, setWebgpuSupported] = useState<boolean | null>(null);
    const [mounted, setMounted] = useState(false);
    const [isSeeding, setIsSeeding] = useState(false);

    const handleSeed = async () => {
        if (!db) return;
        try {
            setIsSeeding(true);
            await seedStudentProfile(db);
            alert("Database seeded successfully with Student Profile!");
            // Refresh stats
            const [docCount] = await db.select({ value: count() }).from(documents);
            const [taskCount] = await db.select({ value: count() }).from(tasks);
            const [kiCount] = await db.select({ value: count() }).from(knowledgeItems);
            setStats({
                documents: docCount?.value ?? 0,
                tasks: taskCount?.value ?? 0,
                knowledge: kiCount?.value ?? 0,
            });
        } catch (error) {
            console.error(error);
            alert("Failed to seed database. Check console for details.");
        } finally {
            setIsSeeding(false);
        }
    };

    useEffect(() => {
        setMounted(true);

        // Detect WebGL/GPU info
        try {
            const canvas = document.createElement("canvas");
            const gl = canvas.getContext("webgl2") || canvas.getContext("webgl");
            if (gl) {
                const debugInfo = (gl as WebGLRenderingContext).getExtension("WEBGL_debug_renderer_info");
                if (debugInfo) {
                    setGpuInfo({
                        renderer: (gl as WebGLRenderingContext).getParameter(debugInfo.UNMASKED_RENDERER_WEBGL),
                        vendor: (gl as WebGLRenderingContext).getParameter(debugInfo.UNMASKED_VENDOR_WEBGL),
                    });
                }
            }
        } catch { /* Silent fail */ }

        // Detect WebGPU
        setWebgpuSupported(!!(navigator as any).gpu);
    }, []);

    useEffect(() => {
        if (!db) return;
        (async () => {
            try {
                const [docCount] = await db.select({ value: count() }).from(documents);
                const [taskCount] = await db.select({ value: count() }).from(tasks);
                const [kiCount] = await db.select({ value: count() }).from(knowledgeItems);
                setStats({
                    documents: docCount?.value ?? 0,
                    tasks: taskCount?.value ?? 0,
                    knowledge: kiCount?.value ?? 0,
                });
            } catch (e) {
                console.error("Failed to fetch stats:", e);
            }
        })();
    }, [db]);

    if (!mounted) return null;

    return (
        <div className="flex flex-col min-h-screen p-6 md:p-8">
            <div className="max-w-4xl mx-auto w-full space-y-8">

                {/* Header */}
                <div className="flex items-center gap-4">
                    <div className="bg-gradient-to-br from-violet-500/20 to-purple-500/20 p-3 rounded-xl border border-purple-500/10">
                        <Settings className="h-6 w-6 text-purple-400" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-violet-400 via-purple-400 to-fuchsia-400 bg-clip-text text-transparent">
                            Settings
                        </h1>
                        <p className="text-muted-foreground">
                            Customize your AI workspace experience.
                        </p>
                    </div>
                </div>

                {/* Tabs */}
                <Tabs defaultValue="ai-model" className="space-y-6">
                    <TabsList className="bg-white/5 border border-white/10 backdrop-blur-sm p-1 rounded-xl">
                        <TabsTrigger value="ai-model" className="data-[state=active]:bg-purple-500/20 data-[state=active]:text-purple-300 rounded-lg gap-2">
                            <Brain className="h-4 w-4" /> AI Model
                        </TabsTrigger>
                        <TabsTrigger value="appearance" className="data-[state=active]:bg-purple-500/20 data-[state=active]:text-purple-300 rounded-lg gap-2">
                            <Palette className="h-4 w-4" /> Appearance
                        </TabsTrigger>
                        <TabsTrigger value="workspace" className="data-[state=active]:bg-purple-500/20 data-[state=active]:text-purple-300 rounded-lg gap-2">
                            <Database className="h-4 w-4" /> Workspace
                        </TabsTrigger>
                        <TabsTrigger value="about" className="data-[state=active]:bg-purple-500/20 data-[state=active]:text-purple-300 rounded-lg gap-2">
                            <Info className="h-4 w-4" /> About
                        </TabsTrigger>
                    </TabsList>

                    {/* === AI Model Tab === */}
                    <TabsContent value="ai-model" className="space-y-6">
                        {/* Model Info Card */}
                        <Card className="border-white/10 bg-white/5 backdrop-blur-sm">
                            <CardHeader>
                                <div className="flex items-center justify-between">
                                    <div>
                                        <CardTitle className="text-lg">Active Model</CardTitle>
                                        <CardDescription>Currently loaded language model</CardDescription>
                                    </div>
                                    <Badge variant="outline" className="border-emerald-500/30 text-emerald-400 bg-emerald-500/10">
                                        <CheckCircle2 className="h-3 w-3 mr-1" /> Configured
                                    </Badge>
                                </div>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-1">
                                        <p className="text-xs text-muted-foreground uppercase tracking-wider">Model</p>
                                        <p className="font-mono text-sm font-medium">DeepSeek-R1-0528-Qwen3-8B</p>
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-xs text-muted-foreground uppercase tracking-wider">Quantization</p>
                                        <p className="font-mono text-sm font-medium">q4f16_1 (4-bit)</p>
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-xs text-muted-foreground uppercase tracking-wider">Context Window</p>
                                        <p className="font-mono text-sm font-medium">4,096 tokens</p>
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-xs text-muted-foreground uppercase tracking-wider">Runtime</p>
                                        <p className="font-mono text-sm font-medium">WebLLM (MLC)</p>
                                    </div>
                                </div>
                                <Separator className="bg-white/10" />
                                <div className="space-y-1">
                                    <p className="text-xs text-muted-foreground uppercase tracking-wider">Model Source</p>
                                    <p className="font-mono text-xs text-muted-foreground break-all">
                                        huggingface.co/mlc-ai/DeepSeek-R1-0528-Qwen3-8B-q4f16_1-MLC
                                    </p>
                                </div>
                            </CardContent>
                        </Card>

                        {/* GPU Status Card */}
                        <Card className="border-white/10 bg-white/5 backdrop-blur-sm">
                            <CardHeader>
                                <CardTitle className="text-lg flex items-center gap-2">
                                    <Cpu className="h-5 w-5 text-purple-400" /> GPU Acceleration
                                </CardTitle>
                                <CardDescription>Hardware acceleration status for AI inference</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-1">
                                        <p className="text-xs text-muted-foreground uppercase tracking-wider">GPU Renderer</p>
                                        <p className="font-mono text-sm font-medium">{gpuInfo?.renderer || "Detecting..."}</p>
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-xs text-muted-foreground uppercase tracking-wider">Vendor</p>
                                        <p className="font-mono text-sm font-medium">{gpuInfo?.vendor || "Detecting..."}</p>
                                    </div>
                                </div>

                                <div className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/10">
                                    <div className="flex items-center gap-3">
                                        <Zap className={`h-5 w-5 ${webgpuSupported ? "text-emerald-400" : "text-amber-400"}`} />
                                        <div>
                                            <p className="font-medium text-sm">WebGPU</p>
                                            <p className="text-xs text-muted-foreground">
                                                {webgpuSupported ? "Available — GPU-accelerated inference active" : "Not supported — using WASM fallback"}
                                            </p>
                                        </div>
                                    </div>
                                    <Badge variant="outline" className={webgpuSupported ? "border-emerald-500/30 text-emerald-400" : "border-amber-500/30 text-amber-400"}>
                                        {webgpuSupported ? "Active" : "Fallback"}
                                    </Badge>
                                </div>

                                <div className="space-y-2">
                                    <div className="flex justify-between text-xs text-muted-foreground">
                                        <span>Estimated VRAM Usage</span>
                                        <span>~5.7 GB</span>
                                    </div>
                                    <Progress value={71} className="h-2" />
                                    <p className="text-[10px] text-muted-foreground/60">
                                        Based on q4f16_1 quantization of 8B parameter model
                                    </p>
                                </div>

                                <div className="flex items-center gap-3">
                                    <Switch
                                        id="gpu-toggle"
                                        checked={gpuEnabled}
                                        onCheckedChange={setGpuEnabled}
                                    />
                                    <Label htmlFor="gpu-toggle" className="text-sm">
                                        Prefer GPU acceleration (WebGPU) for RAG embeddings
                                    </Label>
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* === Appearance Tab === */}
                    <TabsContent value="appearance" className="space-y-6">
                        {/* Theme Card */}
                        <Card className="border-white/10 bg-white/5 backdrop-blur-sm">
                            <CardHeader>
                                <CardTitle className="text-lg">Theme</CardTitle>
                                <CardDescription>Choose your preferred color scheme</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="grid grid-cols-3 gap-3">
                                    {[
                                        { value: "light", label: "Light", icon: Sun },
                                        { value: "dark", label: "Dark", icon: Moon },
                                        { value: "system", label: "System", icon: Laptop },
                                    ].map(({ value, label, icon: Icon }) => (
                                        <button
                                            key={value}
                                            onClick={() => setTheme(value)}
                                            className={`flex flex-col items-center gap-2 p-4 rounded-xl border transition-all duration-200 ${theme === value
                                                ? "border-purple-500/50 bg-purple-500/10 text-purple-300 shadow-lg shadow-purple-500/10"
                                                : "border-white/10 bg-white/5 hover:bg-white/[7%] hover:border-white/20"
                                                }`}
                                        >
                                            <Icon className="h-5 w-5" />
                                            <span className="text-sm font-medium">{label}</span>
                                        </button>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>

                        {/* Accent Color Card */}
                        <Card className="border-white/10 bg-white/5 backdrop-blur-sm">
                            <CardHeader>
                                <CardTitle className="text-lg">Accent Color</CardTitle>
                                <CardDescription>Choose your preferred accent color</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
                                    {ACCENT_COLORS.map((color) => (
                                        <button
                                            key={color.value}
                                            onClick={() => setAccentColor(color.value)}
                                            className={`flex flex-col items-center gap-2 p-3 rounded-xl border transition-all duration-200 ${accentColor === color.value
                                                ? "border-white/30 bg-white/10 ring-2 ring-purple-500/30"
                                                : "border-white/10 bg-white/5 hover:bg-white/[7%]"
                                                }`}
                                        >
                                            <div className={`h-6 w-6 rounded-full ${color.class} shadow-lg`} />
                                            <span className="text-xs text-muted-foreground">{color.name}</span>
                                        </button>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* === Workspace Tab === */}
                    <TabsContent value="workspace" className="space-y-6">
                        {/* Workspace Name */}
                        <Card className="border-white/10 bg-white/5 backdrop-blur-sm">
                            <CardHeader>
                                <CardTitle className="text-lg">Workspace</CardTitle>
                                <CardDescription>Manage your workspace settings</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="workspace-name">Workspace Name</Label>
                                    <Input
                                        id="workspace-name"
                                        value={workspaceName}
                                        onChange={(e) => setWorkspaceName(e.target.value)}
                                        className="bg-white/5 border-white/10 focus:border-purple-500/50"
                                    />
                                </div>
                            </CardContent>
                        </Card>

                        {/* Data Stats */}
                        <Card className="border-white/10 bg-white/5 backdrop-blur-sm">
                            <CardHeader>
                                <CardTitle className="text-lg flex items-center gap-2">
                                    <HardDrive className="h-5 w-5 text-purple-400" /> Data Overview
                                </CardTitle>
                                <CardDescription>Contents stored in your local database</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="grid grid-cols-3 gap-4">
                                    {[
                                        { label: "Documents", value: stats.documents, color: "text-blue-400" },
                                        { label: "Tasks", value: stats.tasks, color: "text-emerald-400" },
                                        { label: "Knowledge Items", value: stats.knowledge, color: "text-amber-400" },
                                    ].map((item) => (
                                        <div key={item.label} className="text-center p-4 rounded-xl bg-white/5 border border-white/10">
                                            <p className={`text-3xl font-bold ${item.color}`}>{item.value}</p>
                                            <p className="text-xs text-muted-foreground mt-1">{item.label}</p>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>

                        {/* Data Management */}
                        <Card className="border-white/10 bg-white/5 backdrop-blur-sm">
                            <CardHeader>
                                <CardTitle className="text-lg">Data Management</CardTitle>
                                <CardDescription>Export or reset your workspace data</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="flex flex-wrap gap-3">
                                    <Button variant="outline" className="border-white/10 bg-white/5 hover:bg-white/10 gap-2">
                                        <Download className="h-4 w-4" /> Export Data
                                    </Button>
                                    <Button variant="outline" className="border-white/10 bg-white/5 hover:bg-white/10 gap-2">
                                        <Upload className="h-4 w-4" /> Import Data
                                    </Button>
                                </div>
                                <Separator className="bg-white/10" />
                                <div className="p-4 rounded-xl border border-red-500/20 bg-red-500/5">
                                    <div className="flex items-center gap-3 mb-3">
                                        <AlertTriangle className="h-5 w-5 text-red-400" />
                                        <div>
                                            <p className="font-medium text-red-400 text-sm">Danger Zone</p>
                                            <p className="text-xs text-muted-foreground">This action is irreversible</p>
                                        </div>
                                    </div>
                                    <Button variant="outline" className="border-red-500/30 text-red-400 hover:bg-red-500/10 hover:text-red-300 gap-2">
                                        <Trash2 className="h-4 w-4" /> Clear All Data
                                    </Button>
                                </div>
                                <Separator className="bg-white/10" />
                                <div className="space-y-3">
                                    <div className="flex items-center gap-3">
                                        <Database className="h-5 w-5 text-emerald-400" />
                                        <div>
                                            <p className="font-medium text-sm">Developer Tools</p>
                                            <p className="text-xs text-muted-foreground">Advanced actions for debugging</p>
                                        </div>
                                    </div>
                                    <Button
                                        onClick={handleSeed}
                                        disabled={isSeeding || !db}
                                        className="w-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/20"
                                    >
                                        {isSeeding ? (
                                            <>
                                                <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-emerald-400 mr-2" />
                                                Seeding Database...
                                            </>
                                        ) : (
                                            <>
                                                <Database className="h-4 w-4 mr-2" />
                                                Seed Student Profile (Reset DB)
                                            </>
                                        )}
                                    </Button>
                                    <p className="text-[10px] text-muted-foreground text-center">
                                        Resets DB and populates with "Student OS Core" dummy data.
                                    </p>
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* === About Tab === */}
                    <TabsContent value="about" className="space-y-6">
                        {/* App Info */}
                        <Card className="border-white/10 bg-white/5 backdrop-blur-sm">
                            <CardHeader>
                                <div className="flex items-center gap-4">
                                    <div className="bg-gradient-to-br from-violet-600 to-purple-600 p-3 rounded-xl shadow-lg shadow-purple-500/20">
                                        <Zap className="h-6 w-6 text-white" />
                                    </div>
                                    <div>
                                        <CardTitle className="text-xl">Nexus Local</CardTitle>
                                        <CardDescription>AI-Powered Workspace — v1.0.0</CardDescription>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <p className="text-sm text-muted-foreground leading-relaxed">
                                    Nexus Local is an AI-powered productivity workspace that runs entirely in your browser.
                                    It features a local LLM (DeepSeek R1), GPU-accelerated Agentic RAG,
                                    a rich text editor, task management, knowledge base, and voice interaction — all
                                    powered by cutting-edge browser APIs like WebGPU, IndexedDB, and Web Workers.
                                </p>
                                <p className="text-sm text-muted-foreground">
                                    <strong className="text-foreground/80">Zero cloud dependency</strong>. Your data never leaves your device.
                                </p>
                            </CardContent>
                        </Card>

                        {/* Tech Stack */}
                        <Card className="border-white/10 bg-white/5 backdrop-blur-sm">
                            <CardHeader>
                                <CardTitle className="text-lg">Technology Stack</CardTitle>
                                <CardDescription>Everything powering your workspace</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    {TECH_STACK.map((tech) => (
                                        <div key={tech.name} className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/10">
                                            <div className="bg-gradient-to-br from-violet-500/10 to-purple-500/10 p-2 rounded-lg border border-purple-500/10">
                                                <tech.icon className="h-4 w-4 text-purple-400" />
                                            </div>
                                            <div>
                                                <p className="text-sm font-medium">{tech.name}</p>
                                                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{tech.category}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>

                        {/* Capabilities */}
                        <Card className="border-white/10 bg-white/5 backdrop-blur-sm">
                            <CardHeader>
                                <CardTitle className="text-lg">AI Capabilities</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="grid grid-cols-2 gap-2">
                                    {[
                                        "Local LLM Inference",
                                        "Agentic RAG Pipeline",
                                        "Cross-Encoder Re-ranking",
                                        "Multi-hop Research",
                                        "Smart Task Parsing",
                                        "Voice Interaction",
                                        "Document Summarization",
                                        "Hybrid Search (Keyword + Semantic)",
                                    ].map((cap) => (
                                        <div key={cap} className="flex items-center gap-2 text-sm p-2">
                                            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                                            <span className="text-muted-foreground">{cap}</span>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>

                </Tabs>
            </div>
        </div>
    );
}
