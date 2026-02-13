"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, FileText, Clock, TrendingUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useDb } from "@/components/providers/db-provider";
import { tasks, documents } from "@/db/schema";
import { eq, isNull } from "drizzle-orm";

export function DashboardStats() {
    const { db } = useDb();
    const [taskCount, setTaskCount] = useState(0);
    const [docCount, setDocCount] = useState(0);

    useEffect(() => {
        const fetchData = async () => {
            if (!db) return;
            try {
                const t = await db.select().from(tasks).where(eq(tasks.status, "todo"));
                const d = await db.select().from(documents);
                setTaskCount(t.length);
                setDocCount(d.length);
            } catch (e) {
                console.error("Failed to fetch stats", e);
            }
        };
        fetchData();
    }, [db]);

    return (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Pending Tasks</CardTitle>
                    <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{taskCount}</div>
                    <p className="text-xs text-muted-foreground">items to complete</p>
                </CardContent>
            </Card>

            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Documents</CardTitle>
                    <FileText className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{docCount}</div>
                    <p className="text-xs text-muted-foreground">notes & research files</p>
                </CardContent>
            </Card>

            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Focus Time</CardTitle>
                    <Clock className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">2.5h</div>
                    <p className="text-xs text-muted-foreground">tracked today</p>
                </CardContent>
            </Card>

            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Productivity</CardTitle>
                    <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">+12%</div>
                    <p className="text-xs text-muted-foreground">from last week</p>
                </CardContent>
            </Card>
        </div>
    );
}
