
<div align="center">

# 🚀 **SLINGSHOT** 
### *The Ultimate Cyberpunk Student OS*

![Banner](assets/banner.webp)

[![Next.js](https://img.shields.io/badge/Next.js-15.0-000000?style=for-the-badge&logo=next.o&logoColor=white)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![DeepSeek R1](https://img.shields.io/badge/DeepSeek-R1_Distill_8B-purple?style=for-the-badge&logo=openai&logoColor=white)](https://huggingface.co/deepseek-ai/DeepSeek-R1-Distill-Qwen-7B)
[![Database](https://img.shields.io/badge/PGlite-In--Browser-336699?style=for-the-badge&logo=postgresql&logoColor=white)](https://electric-sql.com/)
[![License](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)](LICENSE)

</div>

---

## 📡 **Transmission Incoming...**

**Slingshot** is not just a productivity app; it's a **Neural Extension** for the modern student. Built to seamlessly integrate your digital life, academic goals, and career opportunities into a single, high-fidelity **Command Center**.

Stop juggling tabs. Stop missing deadlines. **Start orchestrating your future.**

---

## 🧠 **Neural Architecture (Tech Stack Deep Dive)**

This system runs on the bleeding edge of web technology. Here is the classified schematic:

| Component | Technology | Description |
| :--- | :--- | :--- |
| **Core** | **Next.js 15 (App Router)** | The react framework for production. |
| **Language** | **TypeScript** | Type-safe, scalable code. |
| **Styles** | **Tailwind CSS v4 + Shadcn UI** | Sleek, glassmorphic, neobrutalist design system. |
| **Connectivity** | **WhatsApp Web.js** | Bridge your chats directly into your workflow. |

### 🤖 **The Reasoning Core: DeepSeek R1 (Local)**
At the heart of Slingshot lies **DeepSeek-R1-0528-Qwen3-8B-q4f16_1-MLC**. This is not an API call to a distant server; this is a **local, quantization-optimized** Large Language Model running directly on your GPU via WebGPU.

*   **Model ID**: `DeepSeek-R1-0528-Qwen3-8B`
*   **Architecture**: 8B Parameters, distilled from larger reasoning models.
*   **Optimization**: 4-bit quantization (~5.7GB VRAM requirement).
*   **Performance**: Runs at near-native speeds on consumer hardware (RTX 3060/4070+) using `MLC-LLM` and WebGPU. **No data leaves your machine.**

### 💽 **The Memory Bank: PGlite**
We killed latency by moving the database *inside* the browser.
*   **PGlite**: A full Postgres instance compiled to WASM. 
*   **Reactive**: Changes sync instantly across tabs and persist via IndexedDB.
*   **Vector Ready**: Native `pgvector` support enabled for RAG (Retrieval Augmented Generation) workflows directly in the client.

### 🕵️ **The Agent: Stagehand**
An autonomous browser agent that acts as your digital twin.
*   **Capabilities**: Can navigate websites, extract data, and fill forms.
*   **Workflow**: Triggered by the AI Core to apply for events, fetch deeper context, or automate repetitive tasks.

---

## ⚡ **Features: The Event Horizon**

### 1. **Global Command Center** 🖥️
A unified dashboard visualizing your entire academic life.
- **Focus Mode**: Zen-like distraction-free writing environment.
- **Quick Capture**: Drop thoughts, tasks, and links instantly.
- **Calendar Matrix**: Syncs assignments, exams, and imported events.

![Start Screen](assets/feature_nexus_hud.gif)

### 2. **AI-Powered Event Ingestion** 🎫
Never miss a hackathon or meetup again.
- **WhatsApp Integration**: Scans your group chats for event links.
- **Intelligent Parsing**: Extracts dates, locations, and details automatically.
- **One-Click Apply**: Our **AI Agent** can visit event pages and fill out registration forms for you (Human-in-the-loop review included).

### 3. **Smart Knowledge Base** 📚
Your personal academic wiki.
- **RAG (Retrieval Augmented Generation)**: Chat with your PDFs and notes.
- **Auto-Tagging**: AI organizes your documents for you.
- **Vector Search**: Find connections between disparate concepts.

![Neural Link](assets/feature_neural_link.gif)

### 4. **AI Core Visualization**
Real-time monitoring of your neural network's status, token usage, and reasoning depth.

![AI Core](assets/feature_ai_core.gif)

---

## 📸 **Visual Recon**

### **The Dashboard**
*A live view of your academic operations.*
![Dashboard Preview](assets/dashboard_preview_1770788943951.webp)

### **Event Intelligence**
*AI scanning your chats for opportunities.*
![Calendar View](assets/calendar_view_verification_1770943568286.webp)

### **System HUD**
*Real-time data streams.*
![Data Stream](assets/feature_data_stream.gif)

---

## 🔧 **Deployment Sequence**

Initialize the system on your local node:

```bash
# 1. Clone the repository
git clone https://github.com/shubro18202758/Slingshot.git

# 2. Enter the matrix
cd Slingshot

# 3. Install dependencies
npm install

# 4. Ignite the engines
npm run dev
```

Open your comms link at `http://localhost:3000`.

---

## 🤝 **Contributors**

<a href="https://github.com/shubro18202758/Slingshot/graphs/contributors">
  <img src="https://contrib.rocks/image?repo=shubro18202758/Slingshot" />
</a>

---

<div align="center">

### *Built for the Architects of Tomorrow.*

</div>
