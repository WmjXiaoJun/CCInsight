# CCInsight

**CCInsight** — Interactive Source Code Visualization & Bilingual Annotation Tool

Built on top of [GitNexus](https://github.com/CCInsight/gitnexus). Core capability: **Parse and index any code repository, visualize its structure through interactive knowledge graphs, overlay bilingual annotations on source code, and leverage AI assistance to help developers efficiently understand complex codebases**.

[简体中文](./README.md) | English

---

## Features

### Core Features

- **Interactive Knowledge Graph** — Sigma.js WebGL rendering, smooth interaction with tens of thousands of nodes, click nodes to jump directly to source code
- **Bilingual Source Code Annotation System** — Overlay Chinese explanations on source code without modifying the original, supports English/Chinese toggle
- **Tier-based Navigation** — Layered by importance (Core → Communication → Command → Tool layers), prioritize the most critical code
- **Smart Code Search** — BM25 full-text search + graph database queries, supports searching Chinese annotation content
- **AI-assisted Interpretation** — Integrate with OpenAI/Gemini/Ollama LLMs, select code blocks for AI to auto-generate explanations

### Technical Highlights

- **Annotation Layer Separation** — Source code remains untouched, annotations stored in independent JSON files for independent maintenance and version control
- **Tier Priority Strategy** — 20 core files cover 80% of core concepts, quickly master the overall architecture
- **Multi-language Parsing** — Tree-sitter supports incremental syntax parsing for 20+ programming languages
- **Automatic Backend Integration** — Auto-detect and connect to backend on project startup, one-click graph loading

---

## Quick Start

### Prerequisites

- Node.js >= 20.0.0
- pnpm >= 9.0.0

### Install

```bash
git clone https://github.com/WmjXiaoJun/CCInsight.git
cd CCInsight
pnpm install
pnpm run build
```

### Run

```bash
pnpm run dev          # Frontend (http://localhost:5173)
pnpm run dev:backend  # Backend (http://localhost:4747)
```

---

## License

MIT License — see [LICENSE](LICENSE) file.
