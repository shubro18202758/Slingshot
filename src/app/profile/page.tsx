"use client";

import { ProfileForm } from "@/components/profile/profile-form";
import { LearningDNACard } from "@/components/profile/learning-dna-card";
import { RoadmapRenderer } from "@/components/knowledge/roadmap-renderer";
import { UserCheck } from "lucide-react";

export default function ProfilePage() {
    return (
        <div className="flex flex-col min-h-screen p-6 md:p-8 space-y-8">
            <header className="flex items-center gap-4 border-b border-white/10 pb-6">
                <div className="h-12 w-12 rounded-xl bg-purple-500/10 flex items-center justify-center border border-purple-500/20">
                    <UserCheck className="h-6 w-6 text-purple-400" />
                </div>
                <div>
                    <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-400 to-cyan-400 bg-clip-text text-transparent">
                        Profile Editor
                    </h1>
                    <p className="text-muted-foreground">
                        Update your identity, education, and portfolio for the Student OS Core.
                    </p>
                </div>
            </header>

            <div className="max-w-5xl mx-auto w-full space-y-8">
                <LearningDNACard />
                <RoadmapRenderer />
                <ProfileForm />
            </div>
        </div>
    );
}
