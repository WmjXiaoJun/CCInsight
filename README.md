# CCInsight

**CCInsight** — Interactive Source Code Visualization & Bilingual Annotation Tool

Built on top of [GitNexus](https://github.com/CCInsight/gitnexus). Core capability: **Parse and index any code repository, visualize its structure through interactive knowledge graphs, overlay bilingual annotations on source code, and leverage AI assistance to help developers efficiently understand complex codebases**.

[![Version](https://img.shields.io/badge/version-v0.1.0-blue)](./PRODUCT.md)
[![Tech Stack](https://img.shields.io/badge/tech-React_18_·_TypeScript_·_Sigma.js_·_Tree--sitter-green)](./USAGE.md)
[![License](https://img.shields.io/badge/License-MIT-yellow)](./LICENSE)

[简体中文](./README_zh.md) | English

---

## What Is CCInsight

CCInsight is an interactive source code visualization and bilingual annotation tool. Core capabilities: **parse and index any code repository, visualize its structure through interactive knowledge graphs, overlay bilingual annotations on source code, and leverage AI to help developers efficiently understand complex architectures**.

Annotations are stored in independent JSON files — the original source code is never modified.

---

## Features

### Core Features

- **Interactive Knowledge Graph** — Sigma.js WebGL rendering, smooth interaction with tens of thousands of nodes, click nodes to jump directly to source code
- **Bilingual Source Code Annotation** — Overlay Chinese explanations on source code without modifying the original, supports English/Chinese toggle
- **Tier-based Navigation** — Layered by importance (Core → Communication → Command → Tool layers), prioritize the most critical code
- **Smart Code Search** — BM25 full-text search + graph database queries, supports searching annotation content
- **AI-assisted Interpretation** — Integrate with OpenAI/Gemini/Ollama LLMs, select code blocks for auto-generated explanations

### Technical Highlights

- **Annotation Layer Separation** — Source code remains untouched, annotations in independent JSON files with independent version control
- **Tier Priority Strategy** — 20 core files cover 80% of core concepts, quickly master the overall architecture
- **Multi-language Parsing** — Tree-sitter supports incremental syntax parsing for 20+ programming languages
- **Automatic Backend Integration** — Auto-detect and connect to backend on startup, one-click graph loading

---

## Quick Start

### Prerequisites

- Node.js >= 20.0.0
- pnpm >= 9.0.0

### Install

```bash
# Clone the repository
git clone https://github.com/WmjXiaoJun/CCInsight.git
cd CCInsight

# Install dependencies (monorepo workspaces)
pnpm install

# Build all packages
pnpm run build
```

### Run

**Option 1: One-click startup (recommended)**

```bash
pnpm run dev          # Frontend (http://localhost:5173)
pnpm run dev:backend  # Backend (http://localhost:4747)
```

**Option 2: Separate terminals**

```bash
# Terminal 1 — Backend
pnpm run dev:backend

# Terminal 2 — Frontend
pnpm run dev:frontend
```

**Option 3: Connect to a remote backend**

If the backend is already running on another machine:

```
http://localhost:5173?server=http://localhost:4747
```

### Load a Code Repository

1. Click **Analyze New Repository** in the UI and select the target repository path
2. Wait for indexing to complete (backend parses code structure and builds the knowledge graph)
3. Start exploring!

---

## Architecture Overview

```
CCInsight/
├── frontend/                   # React + Vite frontend
│   ├── src/
│   │   ├── components/         # UI components
│   │   ├── annotations/       # Annotation loader & type definitions
│   │   ├── hooks/             # React Hooks
│   │   ├── services/         # Backend communication
│   │   └── config/           # Configuration & constants
├── backend/                    # Node.js backend (GitNexus core)
│   ├── src/
│   │   ├── server/           # HTTP API server
│   │   ├── cli/              # CLI tools
│   │   ├── core/             # Core engine (graph DB, embeddings, clustering)
│   │   └── mcp/              # MCP protocol server
├── gitnexus-shared/            # Shared type definitions
├── annotations/                 # Source code annotations
│   ├── tier1/                # Core layer (~20 files)
│   ├── tier2/                # Communication layer
│   ├── tier3/                # Command layer
│   └── tier4/                # Tool layer
└── docs/                       # Project documentation
```

---

## Tier Strategy

| Tier | Name            | Files | Description                               |
|------|-----------------|-------|-------------------------------------------|
| **T1** | Core Layer      | ~20   | Core logic, tool interfaces, job state machines |
| **T2** | Comm. Layer     | ~10   | API clients, server, context management    |
| **T3** | Command Layer   | ~10   | Slash command system, REPL interaction     |
| **T4** | Tool Layer      | ~30   | File system, search, network, sub-agents   |

**Learning path**: Start from T1 Core Layer — understanding 20 files gives you 80% of the architectural picture.

---

## CLI Commands

```bash
ccinsight analyze <path>   # Index a repository
ccinsight serve            # Start API server
ccinsight wiki <output>    # Generate architecture documentation
ccinsight clean            # Clean up index data
ccinsight status           # Check server status
```

---

## Tech Stack

| Layer       | Technology                         |
|-------------|------------------------------------|
| Frontend    | React 18 + TypeScript              |
| Build tool  | Vite 5                            |
| Graph       | Sigma.js 3 + Graphology            |
| Backend     | Express 4                          |
| Parser      | Tree-sitter (20+ languages)        |
| Graph DB    | SQLite + lbug                     |
| AI/LLM      | LangChain.js                      |
| MCP Protocol| @modelcontextprotocol/sdk          |

---

## Roadmap

- [x] Phase 1: Project scaffold and basic architecture
- [x] Phase 2: Core UI customization and localization
- [x] Phase 3: Bilingual annotation system framework
- [ ] Phase 4: Tier 1 core file annotations
- [ ] Phase 5: Tier 2-4 annotation coverage
- [ ] Phase 6: AI-assisted annotation generation
- [ ] Phase 7: Documentation generator enhancements
- [ ] Phase 8: Open source release and community building

---

## License

MIT License — see [LICENSE](LICENSE) file.

---

## Acknowledgements

- [GitNexus](https://github.com/CCInsight/gitnexus) — This project is built on top of GitNexus source code
- [Sigma.js](https://github.com/simsemi/sigma) — Interactive graph visualization
- [Tree-sitter](https://github.com/tree-sitter/tree-sitter) — Incremental syntax parsing
- [LangChain.js](https://github.com/langchain-ai/langchainjs) — LLM integration framework
