import { NextResponse } from "next/server";
import { serverDb } from "@/lib/server-db";
import { events } from "@/db/schema";
import { desc, eq } from "drizzle-orm";

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const allEvents = await serverDb
            .select()
            .from(events)
            .orderBy(desc(events.createdAt));

        return NextResponse.json({ events: allEvents });
    } catch (error) {
        console.error("Fetch Events Error:", error);
        return NextResponse.json(
            { error: "Failed to fetch events", details: String(error) },
            { status: 500 }
        );
    }
}

export async function PATCH(req: Request) {
    try {
        const body = await req.json();
        const { id, status } = body;

        if (!id || !status) {
            return NextResponse.json({ error: "Missing id or status" }, { status: 400 });
        }

        const [updatedEvent] = await serverDb
            .update(events)
            .set({ status })
            .where(eq(events.id, id))
            .returning();

        return NextResponse.json({ success: true, event: updatedEvent });
    } catch (error) {
        console.error("Update Event Error:", error);
        return NextResponse.json(
            { error: "Failed to update event", details: String(error) },
            { status: 500 }
        );
    }
}
