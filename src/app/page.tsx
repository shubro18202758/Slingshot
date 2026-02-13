"use client";

import { DashboardHeader } from "@/components/dashboard/header";
import { DashboardStats } from "@/components/dashboard/stats-cards";
import { RecentFiles } from "@/components/dashboard/recent-files";
import { ChatInterface } from "@/components/ai/chat-interface";
import { ActivityTimeline } from "@/components/dashboard/activity-timeline";
import { AiBriefing } from "@/components/dashboard/ai-briefing";
import { TaskReminders } from "@/components/tasks/task-reminders";
import { Sparkles } from "lucide-react";

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen p-6 md:p-8">
      <div className="max-w-7xl mx-auto w-full space-y-8">

        {/* 1. Header Section */}
        <DashboardHeader />

        {/* 2. AI Daily Briefing */}
        <AiBriefing />

        {/* 2.5 Task Reminders */}
        <TaskReminders />

        {/* 3. Key Metrics */}
        <DashboardStats />

        {/* 2.75 Live Events Banner */}
        <div className="bg-gradient-to-r from-green-900/20 to-cyan-900/20 border border-green-500/20 p-4 rounded-xl flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
            </span>
            <div>
              <h3 className="font-semibold text-white">Live Event Feed Active</h3>
              <p className="text-xs text-muted-foreground">WhatsApp & Telegram listeners are running.</p>
            </div>
          </div>
          <a href="/events" className="text-sm font-bold text-cyan-400 hover:text-cyan-300 flex items-center gap-1">
            View Feed <span aria-hidden="true">&rarr;</span>
          </a>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 4. Main Content Area */}
          <div className="lg:col-span-2 space-y-6">
            <RecentFiles />

            {/* Activity Timeline (replaces Schedule placeholder) */}
            <ActivityTimeline />
          </div>

          {/* 5. Sidebar (AI Assistant) */}
          <div className="lg:col-span-1">
            <div className="lg:sticky lg:top-20 h-[600px] rounded-xl border border-white/10 bg-white/5 backdrop-blur-sm shadow-lg shadow-purple-500/5 overflow-hidden flex flex-col">
              <div className="p-3 border-b border-white/5 bg-white/5">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-purple-400" />
                  <h2 className="font-semibold text-sm">Nexus AI Assistant</h2>
                </div>
              </div>
              <ChatInterface />
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
