import type { InferInsertModel, InferSelectModel } from "drizzle-orm";
import { customType, jsonb, pgEnum, pgTable, text, timestamp, uuid, integer } from "drizzle-orm/pg-core";

// Define the Status enum for Tasks
export const statusEnum = pgEnum("status", ["todo", "in-progress", "done"]);

// Custom Vector Type (handled as array for now, compatible with pgvector)
const vector = customType<{ data: number[] }>({
  dataType() {
    return "vector(1536)";
  },
  toDriver(value: number[]): string {
    return JSON.stringify(value);
  },
  fromDriver(value: unknown): number[] {
    return JSON.parse(value as string);
  },
});

// Workspaces Table
export const workspaces = pgTable("workspaces", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  icon: text("icon"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Define the Priority enum
export const priorityEnum = pgEnum("priority", ["low", "medium", "high"]);

// Tasks Table
export const tasks = pgTable("tasks", {
  id: uuid("id").primaryKey().defaultRandom(),
  workspaceId: uuid("workspace_id")
    .references(() => workspaces.id, { onDelete: "cascade" })
    .notNull(),
  title: text("title").notNull(),
  description: text("description"),
  status: statusEnum("status").default("todo").notNull(),
  priority: priorityEnum("priority").default("medium").notNull(),
  // tags: text("tags").array(), // Array support in PGlite/Drizzle can be tricky, let's skip for V1 or use JSON
  dueDate: timestamp("due_date"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Documents Table
export const documents = pgTable("documents", {
  id: uuid("id").primaryKey().defaultRandom(),
  workspaceId: uuid("workspace_id")
    .references(() => workspaces.id, { onDelete: "cascade" })
    .notNull(),
  title: text("title").notNull(),
  content: text("content"),
  // Using custom vector type, nullable as it might be generated async
  embedding: vector("embedding"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Inferred Types
export type Workspace = InferSelectModel<typeof workspaces>;
export type NewWorkspace = InferInsertModel<typeof workspaces>;

export type Task = InferSelectModel<typeof tasks>;
export type NewTask = InferInsertModel<typeof tasks>;

export type Document = InferSelectModel<typeof documents>;
export type NewDocument = InferInsertModel<typeof documents>;

// Knowledge Items Table (for RAG)
export const knowledgeItems = pgTable("knowledge_items", {
  id: uuid("id").primaryKey().defaultRandom(),
  workspaceId: uuid("workspace_id")
    .references(() => workspaces.id, { onDelete: "cascade" })
    .notNull(),
  title: text("title").notNull(),
  type: text("type").notNull(), // 'pdf', 'md', 'txt'
  fileName: text("file_name").notNull(),
  fileSize: text("file_size"), // Store as string for simplicity or integer
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type KnowledgeItem = InferSelectModel<typeof knowledgeItems>;
export type NewKnowledgeItem = InferInsertModel<typeof knowledgeItems>;

// Knowledge Chunks Table (for RAG vectors)
// Custom Vector Type for smaller models (e.g., all-MiniLM-L6-v2)
const vector384 = customType<{ data: number[] }>({
  dataType() {
    return "vector(384)";
  },
  toDriver(value: number[]): string {
    return JSON.stringify(value);
  },
  fromDriver(value: unknown): number[] {
    return JSON.parse(value as string);
  },
});

export const knowledgeChunks = pgTable("knowledge_chunks", {
  id: uuid("id").primaryKey().defaultRandom(),
  knowledgeItemId: uuid("knowledge_item_id")
    .references(() => knowledgeItems.id, { onDelete: "cascade" })
    .notNull(),
  content: text("content").notNull(),
  embedding: vector("embedding"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type KnowledgeChunk = InferSelectModel<typeof knowledgeChunks>;
export type NewKnowledgeChunk = InferInsertModel<typeof knowledgeChunks>;

// ==========================================
// Student OS Core Schema
// ==========================================

// Students Table (Identity, Education, Demographics)
export const students = pgTable("students", {
  id: uuid("id").primaryKey().defaultRandom(),
  // Identity
  name: text("name").notNull(),
  email: text("email").notNull(),
  phone: text("phone"),
  links: jsonb("links"), // { linkedin: string, github: string, portfolio: string }
  // Education
  university: text("university"),
  major: text("major"),
  gpa: text("gpa"), // Stored as text to allow precision or scales (e.g. "3.8/4.0")
  studentId: text("student_id"),
  transcript: text("transcript"), // Full text transcript
  // Demographics
  demographics: jsonb("demographics"), // { race: string, gender: string, veteran: boolean }
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Teammates Table (Team)
export const teammates = pgTable("teammates", {
  id: uuid("id").primaryKey().defaultRandom(),
  studentId: uuid("student_id")
    .references(() => students.id, { onDelete: "cascade" })
    .notNull(), // Linked to the student profile
  name: text("name").notNull(),
  email: text("email"),
  role: text("role"),
  relation: text("relation"), // e.g., "Co-founder", "Lab Partner"
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Projects Table (Semantic Search Enabled)
export const projects = pgTable("projects", {
  id: uuid("id").primaryKey().defaultRandom(),
  studentId: uuid("student_id")
    .references(() => students.id, { onDelete: "cascade" })
    .notNull(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  role: text("role"),
  url: text("url"),
  skills: jsonb("skills"), // ["React", "Node.js", "AI"]
  embedding: vector384("embedding"), // Semantic search vector
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Experience Table (Semantic Search Enabled)
export const experience = pgTable("experience", {
  id: uuid("id").primaryKey().defaultRandom(),
  studentId: uuid("student_id")
    .references(() => students.id, { onDelete: "cascade" })
    .notNull(),
  company: text("company").notNull(),
  role: text("role").notNull(),
  duration: text("duration"), // e.g., "Jan 2023 - Present"
  description: text("description").notNull(),
  embedding: vector384("embedding"), // Semantic search vector
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Inferred Types for Student Core
export type Student = InferSelectModel<typeof students>;
export type NewStudent = InferInsertModel<typeof students>;

export type Teammate = InferSelectModel<typeof teammates>;
export type NewTeammate = InferInsertModel<typeof teammates>;

export type Project = InferSelectModel<typeof projects>;
export type NewProject = InferInsertModel<typeof projects>;

export type Experience = InferSelectModel<typeof experience>;
export type NewExperience = InferInsertModel<typeof experience>;

// ==========================================
// Event Ingestion Engine Schema
// ==========================================

export const sourceEnum = pgEnum("source", ["WhatsApp", "Telegram"]);
export const eventStatusEnum = pgEnum("event_status", ["Detected", "Queued", "Applied", "Processing", "Failed"]);

export const events = pgTable("events", {
  id: uuid("id").primaryKey().defaultRandom(),
  source: sourceEnum("source").notNull(),
  title: text("title"),
  description: text("description"),
  eventDate: timestamp("event_date"),
  url: text("url"), // unique removed to allow multiple events from same link if needed, or keep it? Let's keep unique for dedup? No, multiple messages might share a link.
  rawContext: text("raw_context").notNull(),
  metadata: jsonb("metadata"), // { groupName: string, author: string, messageId: string }
  status: eventStatusEnum("status").default("Detected").notNull(),
  priority: integer("priority"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type Event = InferSelectModel<typeof events>;
export type NewEvent = InferInsertModel<typeof events>;

// ==========================================
// Intelligent Ingestion Schema
// ==========================================

export const opportunityStatusEnum = pgEnum("opportunity_status", ["pending", "applied", "rejected"]);

export const opportunities = pgTable("opportunities", {
  id: uuid("id").primaryKey().defaultRandom(),
  url: text("url").notNull(),
  source: text("source").notNull(), // 'WhatsApp', 'Telegram'
  content: text("content"), // Original message content
  aiSummary: text("ai_summary"),
  relevanceScore: integer("relevance_score"),
  eventType: text("event_type"), // 'hackathon', 'workshop', 'other'
  status: opportunityStatusEnum("status").default("pending").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type Opportunity = InferSelectModel<typeof opportunities>;
export type NewOpportunity = InferInsertModel<typeof opportunities>;
