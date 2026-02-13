"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Radio, Play } from "lucide-react";
import { toast } from "sonner";
import { processBatch } from "@/app/actions/process-batch";
import { EventCard } from "@/components/dashboard/event-card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CalendarView } from "@/components/events/calendar-view";
import { HistoryImporter } from "@/components/events/history-importer";

export default function EventsPage() {
    const [events, setEvents] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedEvents, setSelectedEvents] = useState<Set<string>>(new Set());
    const [batchCommand, setBatchCommand] = useState("");
    const [isProcessing, setIsProcessing] = useState(false);

    const fetchEvents = async () => {
        try {
            const res = await fetch("/api/events");
            const data = await res.json();
            if (data.events) {
                setEvents(data.events);
            }
        } catch (error) {
            console.error("Failed to fetch events", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchEvents();
        const interval = setInterval(fetchEvents, 1000); // Poll every 1 second (Turbo Mode)
        return () => clearInterval(interval);
    }, []);

    const toggleSelection = (id: string, checked: boolean) => {
        const newSet = new Set(selectedEvents);
        if (checked === true) {
            newSet.add(id);
        } else {
            newSet.delete(id);
        }
        setSelectedEvents(newSet);
    };

    const handleBatchProcess = async () => {
        if (selectedEvents.size === 0) return;
        setIsProcessing(true);
        try {
            const result = await processBatch(Array.from(selectedEvents), batchCommand);
            if (result.success) {
                toast.success("Batch processing started!");
                setSelectedEvents(new Set());
                setBatchCommand("");
                fetchEvents(); // Immediate refresh
            } else {
                toast.error(result.error || "Batch processing failed");
            }
        } catch (error) {
            toast.error("An error occurred");
        } finally {
            setIsProcessing(false);
        }
    };

    if (loading && events.length === 0) {
        return <div className="flex h-screen items-center justify-center"><Loader2 className="animate-spin text-cyan-400" /></div>;
    }

    return (
        <div className="flex flex-col min-h-screen p-6 md:p-8 space-y-8 pb-32">
            <header className="flex items-center justify-between border-b border-white/10 pb-6">
                <div>
                    <h1 className="text-3xl font-bold bg-gradient-to-r from-green-400 to-cyan-400 bg-clip-text text-transparent">
                        Global Event Feed
                    </h1>
                    <p className="text-muted-foreground text-sm mt-1">
                        Real-time opportunities from your connected apps. <span className="text-xs bg-zinc-800 px-2 py-0.5 rounded border border-white/10 ml-2" title="Check your terminal for detailed logs">ℹ️ Logger: Terminal</span>
                    </p>
                </div>


                // ... inside EventsPage component ...

                <div className="flex flex-col items-end gap-2">
                    <div className="flex items-center gap-2">
                        <HistoryImporter />
                        <div className="flex items-center gap-2 bg-green-500/10 px-3 py-1 rounded-full border border-green-500/20 h-10">
                            <span className="flex h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                            <span className="text-xs text-green-400 font-mono font-bold">WHATSAPP CONNECTED</span>
                        </div>
                    </div>
                </div>
            </header>

            <Tabs defaultValue="calendar" className="w-full">
                <div className="flex items-center justify-between mb-6">
                    <TabsList className="bg-zinc-900 border border-white/10">
                        <TabsTrigger value="feed" className="data-[state=active]:bg-cyan-950/50 data-[state=active]:text-cyan-400">
                            Feed View
                        </TabsTrigger>
                        <TabsTrigger value="calendar" className="data-[state=active]:bg-cyan-950/50 data-[state=active]:text-cyan-400">
                            Calendar View
                        </TabsTrigger>
                    </TabsList>

                    {/* Filter Tabs (only show for feed or both? let's keep visible) */}
                    <div className="flex gap-2">
                        {["All", "WhatsApp", "Telegram", "Web"].map((source) => (
                            <Button
                                key={source}
                                variant="ghost"
                                size="sm"
                                className="text-xs uppercase tracking-wider text-muted-foreground hover:text-white hover:bg-white/5"
                            >
                                {source}
                            </Button>
                        ))}
                    </div>
                </div>

                <TabsContent value="feed" className="animate-in fade-in slide-in-from-bottom-5 duration-300">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {events.map((event) => (
                            <EventCard
                                key={event.id}
                                event={event}
                                isSelected={selectedEvents.has(event.id)}
                                onToggle={(checked) => toggleSelection(event.id, checked)}
                            />
                        ))}

                        {events.length === 0 && (
                            <div className="col-span-full flex flex-col items-center justify-center h-64 border border-dashed border-white/10 rounded-xl">
                                <Radio className="h-8 w-8 text-muted-foreground mb-4 opacity-50" />
                                <p className="text-muted-foreground">Waiting for events...</p>
                            </div>
                        )}
                    </div>
                </TabsContent>

                <TabsContent value="calendar" className="animate-in fade-in slide-in-from-bottom-5 duration-300">
                    <CalendarView events={events} />
                </TabsContent>
            </Tabs>

            {/* Batch Action Bar (Only in Feed view ideally, but logic persists) */}
            {selectedEvents.size > 0 && (
                <div className="fixed bottom-6 left-1/2 -translate-x-1/2 w-full max-w-3xl bg-zinc-900/90 backdrop-blur-md border border-white/10 rounded-2xl p-4 shadow-2xl flex items-center gap-4 z-50 animate-in slide-in-from-bottom-10 fade-in duration-300">
                    <div className="flex-1">
                        <label className="text-xs text-cyan-400 font-bold ml-1 mb-1 block">
                            BATCH AGENT COMMAND ({selectedEvents.size} SELECTED)
                        </label>
                        <Input
                            value={batchCommand}
                            onChange={(e) => setBatchCommand(e.target.value)}
                            placeholder="e.g. Register me for these using my Hackathon Team..."
                            className="bg-black/50 border-white/10 text-white focus-visible:ring-cyan-500/50"
                        />
                    </div>
                    <Button
                        onClick={handleBatchProcess}
                        disabled={isProcessing || !batchCommand.trim()}
                        className="bg-cyan-600 hover:bg-cyan-700 h-12 px-6"
                    >
                        {isProcessing ? <Loader2 className="animate-spin" /> : <Play className="fill-current" />}
                        <span className="ml-2">Execute Agent</span>
                    </Button>
                </div>
            )}
        </div>
    );
}

