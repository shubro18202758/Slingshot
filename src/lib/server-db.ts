import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import * as schema from "@/db/schema";
import path from "path";

// Singleton to prevent multiple instances in dev hot-reloading
const globalForDb = globalThis as unknown as {
    conn: PGlite | undefined;
};

import { vector } from "@electric-sql/pglite/vector";

// Use a file-based DB for the server functionality so it persists across restarts
// and can be shared between API routes.
const dbPath = path.resolve(process.cwd(), "nexus-server-db");

export const client = globalForDb.conn ?? new PGlite(dbPath, {
    extensions: { vector },
});

if (process.env.NODE_ENV !== "production") globalForDb.conn = client;

export const serverDb = drizzle(client, { schema });

// Force DB Refresh for Schema Updates
