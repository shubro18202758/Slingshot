<div align="center">

<!-- Animated SVG Header -->
<img src="https://capsule-render.vercel.app/api?type=waving&color=0:0d1117,50:00d4ff,100:a855f7&height=300&section=header&text=🚀%20SLINGSHOT&fontSize=80&fontColor=ffffff&animation=fadeIn&fontAlignY=35&desc=The%20Cyberpunk%20Student%20OS&descAlignY=55&descSize=25&descColor=a855f7" width="100%"/>

<br/>

<!-- Animated Typing Effect -->
<a href="https://git.io/typing-svg"><img src="https://readme-typing-svg.demolab.com?font=Fira+Code&weight=600&size=22&duration=3000&pause=1000&color=00D4FF&center=true&vCenter=true&multiline=true&repeat=true&width=700&height=100&lines=%F0%9F%A7%A0+Local+AI+%7C+DeepSeek+R1+on+WebGPU;%F0%9F%94%97+Agentic+RAG+%7C+Cross-Encoder+Reranking;%F0%9F%A4%96+Autonomous+Agent+%7C+Human-in-the-Loop;%F0%9F%92%BE+In-Browser+Postgres+%7C+Zero+Latency" alt="Typing SVG" /></a>

<br/><br/>

<!-- Shields -->
[![Next.js](https://img.shields.io/badge/Next.js-16.1-000000?style=for-the-badge&logo=nextdotjs&logoColor=white)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-19.2-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev/)
[![DeepSeek R1](https://img.shields.io/badge/DeepSeek_R1-Qwen3_8B-a855f7?style=for-the-badge&logo=openai&logoColor=white)](https://huggingface.co/mlc-ai/DeepSeek-R1-0528-Qwen3-8B-q4f16_1-MLC)
[![WebGPU](https://img.shields.io/badge/WebGPU-Local_AI-ff6f00?style=for-the-badge&logo=google&logoColor=white)](https://www.w3.org/TR/webgpu/)
[![PGlite](https://img.shields.io/badge/PGlite-In_Browser_Postgres-336791?style=for-the-badge&logo=postgresql&logoColor=white)](https://electric-sql.com/)
[![Stagehand](https://img.shields.io/badge/Stagehand-AI_Agent-00d4ff?style=for-the-badge&logo=puppeteer&logoColor=white)](https://github.com/browserbasehq/stagehand)
[![License](https://img.shields.io/badge/License-MIT-22c55e?style=for-the-badge)](LICENSE)

<br/>

> *"The future is already here — it's just not evenly distributed."* — William Gibson

</div>

---

<img align="right" src="https://user-images.githubusercontent.com/74038190/212284100-561aa473-3905-4a80-b561-0d28506553ee.gif" width="350"/>

## 📡 What is Slingshot?

**Slingshot** is a **full-stack, AI-native operating system for students** — built to replace the chaos of 15 browser tabs, 3 note apps, and that WhatsApp group you keep forgetting to check.

It fuses **local AI reasoning** (DeepSeek R1 running on YOUR GPU), **agentic automation** (an AI that literally fills out event forms for you), and an **in-browser Postgres database** (zero backend needed) into a single, stunning cyberpunk interface.

### 🎯 The Problem
Students drown in fragmented tools. Hackathon links buried in WhatsApp. Notes scattered across apps. Event deadlines missed. Registration forms left half-filled at 2 AM.

### 💡 The Solution
One unified command center that:
- **Ingests** events from your WhatsApp groups automatically
- **Reasons** about your schedule using a local 8B parameter LLM
- **Applies** to events autonomously with human review
- **Organizes** your knowledge with vector search & AI tagging
- **Runs entirely local** — your data never leaves your machine

<br clear="right"/>

---

## 🧠 Neural Architecture — Deep Technical Dive

<div align="center">

<img src="https://user-images.githubusercontent.com/74038190/225813708-98b745f2-7d22-48cf-9150-083f15b36f93.gif" width="500"/>

</div>

### 🔮 The Reasoning Core: DeepSeek-R1-0528-Qwen3-8B

This is not a toy wrapper around an API. Slingshot runs a **full 8-billion parameter reasoning model** directly in your browser using WebGPU.

| Specification | Detail |
|:---|:---|
| **Model** | `DeepSeek-R1-0528-Qwen3-8B-q4f16_1-MLC` |
| **Origin** | DeepSeek R1 reasoning distilled into Qwen3-8B architecture |
| **Parameters** | 8.2B total, 6.95B non-embedding |
| **Architecture** | 36 Transformer layers, GQA (32 Q-heads / 8 KV-heads) |
| **Quantization** | 4-bit (`q4f16_1`) — fits in ~5.7GB VRAM |
| **Context Window** | 4,096 tokens (configurable up to 32K) |
| **Inference Runtime** | [MLC-AI WebLLM](https://github.com/mlc-ai/web-llm) via WebGPU WASM |
| **Hardware Requirement** | NVIDIA RTX 3060+ / RTX 4070 (8GB VRAM) |
| **Activation** | SwiGLU with Pre-RMSNorm |
| **Position Encoding** | Rotary Positional Embeddings (RoPE) in FP32 |
| **Privacy** | 🔒 **100% local inference — zero data exfiltration** |

```
┌─────────────────────────────────────────┐
│          YOUR BROWSER (WebGPU)          │
│  ┌───────────────────────────────────┐  │
│  │   DeepSeek-R1 → Qwen3-8B Distill │  │
│  │   ─────────────────────────────── │  │
│  │   36 Transformer Layers           │  │
│  │   4-bit Quantized (q4f16_1)       │  │
│  │   SwiGLU + RoPE + GQA             │  │
│  │   Context: 4096 tokens            │  │
│  └──────────┬────────────────────────┘  │
│             │ WebGPU WASM               │
│  ┌──────────▼────────────────────────┐  │
│  │        NVIDIA RTX 4070            │  │
│  │        8GB VRAM / CUDA Cores      │  │
│  └───────────────────────────────────┘  │
└─────────────────────────────────────────┘
         🔒 Nothing leaves your machine
```

### 📊 Agentic RAG Pipeline (Retrieval-Augmented Generation)

Slingshot implements a **state-of-the-art, two-stage Agentic RAG pipeline** — not basic keyword search, but GPU-accelerated semantic understanding with cross-encoder reranking.

**Stage 1 — Embedding & Indexing (WebGPU-Accelerated)**
| Component | Technology |
|:---|:---|
| **Embedding Model** | `Xenova/all-MiniLM-L6-v2` (384-dim dense vectors) |
| **Vector Store** | PGlite + `pgvector` extension (in-browser!) |
| **Batch Indexing** | Web Worker-based parallel processing |
| **Device** | Auto-detects WebGPU → fallback to WASM (CPU) |

**Stage 2 — Cross-Encoder Reranking**
| Component | Technology |
|:---|:---|
| **Reranker Model** | `Xenova/ms-marco-MiniLM-L-6-v2` (Cross-Encoder) |
| **Method** | Pairwise `[query, passage]` scoring |
| **Effect** | Dramatically improves retrieval precision over bi-encoder alone |

```
  Query: "When is the next hackathon?"
         │
         ▼
  ┌──────────────────┐
  │  Bi-Encoder       │  ← all-MiniLM-L6-v2
  │  (Fast Recall)    │
  │  Top-50 candidates│
  └────────┬─────────┘
           │
           ▼
  ┌──────────────────┐
  │  Cross-Encoder    │  ← ms-marco-MiniLM-L-6-v2
  │  (Precision)      │
  │  Reranked Top-10  │
  └────────┬─────────┘
           │
           ▼
  ┌──────────────────┐
  │  DeepSeek R1 LLM  │  ← Generates answer with context
  │  (Reasoning)      │
  └──────────────────┘
```

### 💽 The Memory Bank: PGlite (In-Browser Postgres)

We eliminated backend latency by running a **real PostgreSQL database inside the browser** via WebAssembly.

| Feature | Implementation |
|:---|:---|
| **Engine** | `@electric-sql/pglite` — Postgres compiled to WASM |
| **ORM** | Drizzle ORM with full type-safe schema |
| **Persistence** | IndexedDB-backed (survives page reload) |
| **Vector Search** | Native `pgvector` for embedding similarity |
| **Sync** | Real-time reactivity via `live.changes()` |
| **Schema** | Events, Documents, Knowledge Items, Chunks, Student Profiles, Teams, Projects, Experience |

### 🤖 The Autonomous Agent: Stagehand

An AI-powered browser agent that acts as your **digital twin** — it can navigate websites, fill forms, and apply to events on your behalf.

| Capability | Detail |
|:---|:---|
| **Engine** | `@browserbasehq/stagehand` v3 + Playwright |
| **Actions** | Navigate → Extract → Fill → Screenshot → Submit |
| **Human Review** | Preview mode captures screenshot before submission |
| **Mode: Review** | Dry-run: fills form, captures screenshot, returns to user |
| **Mode: Submit** | Full execution: fills and submits after human approval |

---

## ⚡ Feature Constellation

<div align="center">

<img src="https://user-images.githubusercontent.com/74038190/212284115-f47cd8ff-2ffb-4b04-b5bf-4d1c14c0247f.gif" width="500"/>

</div>

### 🖥️ 1. Global Command Center
> *Your academic life, rendered in real-time*
- **AI Daily Briefing** — LLM-generated summary of upcoming deadlines, events, and priorities
- **Quick Capture** — Instant thought/link/task capture with `⌘+K` command palette
- **Stats Dashboard** — Visualize documents, events, tasks, and knowledge items
- **Activity Timeline** — Chronological feed of all system actions

### 🎫 2. WhatsApp → Event Intelligence Pipeline
> *Never miss a hackathon buried in your group chats*
- **WhatsApp Bridge** — `whatsapp-web.js` scans group chats for event-like messages
- **Date Range Filter** — Import history for specific periods with the Date Picker UI
- **AI Event Parsing** — Extracts title, date, URL, and details from raw messages
- **Calendar Matrix** — Synced calendar view with event dots and focused navigation
- **Batch Processing** — Select multiple events and process them simultaneously

### 🤖 3. AI Auto-Apply with Human-in-the-Loop
> *Your AI agent fills out forms. You review before it clicks submit.*
- **Step 1**: User selects event and provides instructions
- **Step 2**: Agent navigates to URL, fills form, captures screenshot preview
- **Step 3**: User reviews the preview image
- **Step 4**: User clicks "Confirm & Submit" or goes back to edit
- **Skip Review**: Option for trusted events to submit directly

### 📚 4. Agentic Knowledge Base
> *Chat with your documents. Discover hidden connections.*
- **PDF/Text Ingestion** — Upload documents, auto-chunk and embed
- **Semantic Search** — Find relevant content by meaning, not keywords
- **Cross-Encoder Reranking** — Second-pass precision scoring
- **Knowledge Graph** — Force-directed canvas visualization of document relationships
- **AI Summaries** — One-click document summarization via DeepSeek R1

### ✍️ 5. Focus Mode Editor
> *Distraction-free writing with AI superpowers*
- **TipTap Editor** — Rich text editing with slash commands (`/`)
- **AI Menu** — Highlight text → AI rewrites, expands, summarizes, or translates
- **Zen Mode** — Full-screen, minimal UI for deep focus
- **Templates** — Pre-built document templates (Lab Report, Meeting Notes, etc.)
- **Related Context** — AI suggests relevant notes while you write

### ✅ 6. Task Force
> *Not just a todo list — an intelligent priority system*
- **Eisenhower Matrix** — Drag-and-drop tasks into Urgent/Important quadrants
- **AI Breakdown** — Vague goals → actionable subtasks via LLM
- **Smart Reminders** — Context-aware notification system

---

## 🏗️ Complete Tech Stack

<div align="center">

| Layer | Technologies |
|:---|:---|
| **Framework** | Next.js 16.1 (App Router, React 19.2, Server Actions) |
| **Language** | TypeScript 5.x (strict mode) |
| **AI — Reasoning** | DeepSeek-R1-0528-Qwen3-8B via `@mlc-ai/web-llm` (WebGPU) |
| **AI — Embeddings** | `Xenova/all-MiniLM-L6-v2` via `@huggingface/transformers` |
| **AI — Reranking** | `Xenova/ms-marco-MiniLM-L-6-v2` (Cross-Encoder) |
| **AI — Cloud Fallback** | Groq SDK, Google Generative AI, OpenAI SDK |
| **Database** | PGlite (in-browser Postgres WASM) + Drizzle ORM |
| **Vector Search** | pgvector extension + Voy Search |
| **Browser Agent** | Stagehand v3 + Playwright |
| **Messaging** | whatsapp-web.js (WhatsApp Web bridge) |
| **Editor** | TipTap (ProseMirror) with custom extensions |
| **UI Components** | Shadcn UI + Radix UI primitives |
| **Styling** | Tailwind CSS v4 + `tw-animate-css` |
| **Animations** | Framer Motion 12.x |
| **State** | Zustand 5.x (global) + React hooks (local) |
| **Drag & Drop** | @dnd-kit (core + sortable) |
| **PDF Processing** | pdfjs-dist |
| **Date Handling** | date-fns + react-day-picker |
| **Markdown** | react-markdown + remark-gfm |
| **Command Palette** | cmdk |
| **Notifications** | Sonner |
| **Theming** | next-themes (dark/light/system) |

</div>

---

## 🔧 Deployment Sequence

```bash
# 1. Clone the repository
git clone https://github.com/shubro18202758/Slingshot.git

# 2. Enter the matrix
cd Slingshot

# 3. Install dependencies
npm install

# 4. Configure environment
cp .env.example .env.local
# Add your GROQ_API_KEY (optional cloud fallback)

# 5. Initialize the database
npx drizzle-kit push

# 6. Ignite the engines
npm run dev
```

> Open your comms link at `http://localhost:3000`

### Hardware Requirements

| Component | Minimum | Recommended |
|:---|:---|:---|
| **GPU** | WebGPU-capable (GTX 1660+) | NVIDIA RTX 4070 (8GB VRAM) |
| **RAM** | 8GB | 16GB |
| **Browser** | Chrome 113+ / Edge 113+ | Chrome Canary (latest WebGPU) |
| **Storage** | 6GB (for model weights) | 10GB+ |

---

## 📂 Project Structure

```
src/
├── app/                    # Next.js App Router pages
│   ├── actions/            # Server Actions (ingest, analyze, batch)
│   ├── api/                # REST API routes (events, ingest, chat)
│   ├── command-center/     # Global command palette page
│   ├── documents/          # Document editor page
│   ├── events/             # Event dashboard + calendar
│   ├── knowledge/          # Knowledge base + graph
│   ├── profile/            # Student profile editor
│   ├── research/           # AI research assistant
│   ├── settings/           # App configuration
│   ├── tasks/              # Task manager + priority matrix
│   └── team/               # Team management
├── components/
│   ├── ai/                 # Chat interface, Neural status
│   ├── dashboard/          # Stats, timeline, briefing, capture
│   ├── editor/             # TipTap editor, AI menu, zen mode
│   ├── events/             # Calendar, apply modal, history importer
│   ├── focus/              # Focus timer
│   ├── knowledge/          # Graph, search, file uploader
│   ├── layout/             # App shell, command menu
│   └── providers/          # DB provider, RAG provider
├── db/                     # Drizzle schema + migrations
├── hooks/                  # Custom React hooks
├── lib/
│   ├── ai/                 # LLM Engine (DeepSeek R1)
│   ├── agent/              # Stagehand event actions
│   └── ...                 # Utilities
├── scripts/                # CLI tools (WhatsApp import, testing)
├── types/                  # TypeScript declarations
└── workers/                # Web Workers (RAG embedder + reranker)
```

---

## 🤝 Contributors

<a href="https://github.com/shubro18202758/Slingshot/graphs/contributors">
  <img src="https://contrib.rocks/image?repo=shubro18202758/Slingshot" />
</a>

---

<div align="center">

<img src="https://capsule-render.vercel.app/api?type=waving&color=0:a855f7,50:00d4ff,100:0d1117&height=120&section=footer" width="100%"/>

### ⚡ *Built for the Architects of Tomorrow* ⚡

</div>
