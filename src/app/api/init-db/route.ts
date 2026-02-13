import { NextResponse } from "next/server";
import { client } from "@/lib/server-db";

export async function POST() {
    try {
        // Create enums
        const enums = [
            ["status", "'todo', 'in-progress', 'done'"],
            ["priority", "'low', 'medium', 'high'"],
            ["source", "'WhatsApp', 'Telegram'"],
            ["event_status", "'Detected', 'Queued', 'Applied', 'Processing', 'Failed'"],
            ["opportunity_status", "'pending', 'applied', 'rejected'"],
        ];

        for (const [name, vals] of enums) {
            await client.query(
                `DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = '${name}') THEN CREATE TYPE ${name} AS ENUM (${vals}); END IF; END $$;`
            );
        }

        // Create all tables
        await client.exec(`
            CREATE TABLE IF NOT EXISTS workspaces (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                name TEXT NOT NULL,
                icon TEXT,
                created_at TIMESTAMP DEFAULT NOW() NOT NULL
            );
            CREATE TABLE IF NOT EXISTS tasks (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
                title TEXT NOT NULL,
                description TEXT,
                status status DEFAULT 'todo' NOT NULL,
                priority priority DEFAULT 'medium' NOT NULL,
                due_date TIMESTAMP,
                created_at TIMESTAMP DEFAULT NOW() NOT NULL
            );
            CREATE TABLE IF NOT EXISTS documents (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
                title TEXT NOT NULL,
                content TEXT,
                created_at TIMESTAMP DEFAULT NOW() NOT NULL
            );
            CREATE TABLE IF NOT EXISTS knowledge_items (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
                title TEXT NOT NULL,
                type TEXT NOT NULL,
                file_name TEXT NOT NULL,
                file_size TEXT,
                created_at TIMESTAMP DEFAULT NOW() NOT NULL
            );
            CREATE TABLE IF NOT EXISTS knowledge_chunks (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                knowledge_item_id UUID NOT NULL REFERENCES knowledge_items(id) ON DELETE CASCADE,
                content TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT NOW() NOT NULL
            );
            CREATE TABLE IF NOT EXISTS students (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                name TEXT NOT NULL,
                email TEXT NOT NULL,
                phone TEXT,
                links JSONB,
                university TEXT,
                major TEXT,
                gpa TEXT,
                student_id TEXT,
                transcript TEXT,
                demographics JSONB,
                created_at TIMESTAMP DEFAULT NOW() NOT NULL
            );
            CREATE TABLE IF NOT EXISTS teammates (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
                name TEXT NOT NULL,
                email TEXT,
                role TEXT,
                relation TEXT,
                created_at TIMESTAMP DEFAULT NOW() NOT NULL
            );
            CREATE TABLE IF NOT EXISTS projects (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
                title TEXT NOT NULL,
                description TEXT NOT NULL,
                role TEXT,
                url TEXT,
                skills JSONB,
                created_at TIMESTAMP DEFAULT NOW() NOT NULL
            );
            CREATE TABLE IF NOT EXISTS experience (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
                company TEXT NOT NULL,
                role TEXT NOT NULL,
                duration TEXT,
                description TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT NOW() NOT NULL
            );
            CREATE TABLE IF NOT EXISTS events (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                source source NOT NULL,
                url TEXT UNIQUE,
                raw_context TEXT NOT NULL,
                status event_status DEFAULT 'Detected' NOT NULL,
                priority INTEGER,
                created_at TIMESTAMP DEFAULT NOW() NOT NULL
            );
            CREATE TABLE IF NOT EXISTS opportunities (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                url TEXT NOT NULL,
                source TEXT NOT NULL,
                content TEXT,
                ai_summary TEXT,
                relevance_score INTEGER,
                event_type TEXT,
                status opportunity_status DEFAULT 'pending' NOT NULL,
                created_at TIMESTAMP DEFAULT NOW() NOT NULL
            );
        `);

        // Add missing columns that Drizzle schema expects but CREATE TABLE IF NOT EXISTS won't add
        const alterStatements = [
            "ALTER TABLE documents ADD COLUMN embedding TEXT",
            "ALTER TABLE knowledge_chunks ADD COLUMN embedding TEXT",
            "ALTER TABLE projects ADD COLUMN embedding TEXT",
            "ALTER TABLE experience ADD COLUMN embedding TEXT",
        ];
        for (const stmt of alterStatements) {
            try { await client.query(stmt); } catch (_e) { /* column already exists */ }
        }

        // Seed student profile if none exists
        const existing = await client.query("SELECT id FROM students LIMIT 1");
        let seeded = false;
        if (existing.rows.length === 0) {
            await client.query(`
                INSERT INTO students (name, email, phone, university, major, gpa, links, transcript)
                VALUES (
                    'Sayan',
                    'sayan@example.com',
                    '+1234567890',
                    'MIT',
                    'Computer Science',
                    '3.9/4.0',
                    '{"linkedin": "linkedin.com/in/sayan", "github": "github.com/sayan", "portfolio": "sayan.dev"}'::jsonb,
                    'Interested in AI, Full-Stack Development, Hackathons, and Machine Learning research'
                );
            `);
            seeded = true;
        }

        // List tables
        const tables = await client.query(
            "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name"
        );

        return NextResponse.json({
            success: true,
            tables: tables.rows.map((r: any) => r.table_name),
            studentSeeded: seeded,
        });
    } catch (error) {
        console.error("DB Init Error:", error);
        return NextResponse.json({ error: String(error) }, { status: 500 });
    }
}
