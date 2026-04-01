# CCInsight

**CCInsight** (Claude Code Insight) — Chinese Source Code Annotation & Visualization Analysis Platform

Built on top of [GitNexus](https://github.com/CCInsight/gitnexus), designed specifically for deep understanding of the `claude-code-source-code` repository. Core goal: **Understand Claude Code's architecture in Chinese, with bilingual annotations accessible to both Chinese and English developers**.

[简体中文](./README.md) | English

---

## Features

### Core Features

- **Bilingual Code Annotation System** — Overlay Chinese explanations on source code without modifying the original, supports English/Chinese toggle
- **Interactive Knowledge Graph** — Sigma.js visualization graph, click nodes to jump directly to source code and annotations
- **Tier-based Navigation** — Layered by importance (Core → Communication → Command → Tool layers), prioritize the most critical code
- **Smart Code Search** — Cypher graph database queries + full-text search, supports searching Chinese annotation content
- **AI-assisted Interpretation** — Integrate with OpenAI/Gemini/Ollama LLMs, select code blocks for AI to auto-generate Chinese explanations

### Technical Highlights

- **Annotation Layer Separation** — Source code remains untouched, annotations stored in independent JSON files for independent maintenance and version control
- **Tier Priority Strategy** — 20 core files cover 80% of core concepts, quickly master the overall architecture
- **Automatic Backend Integration** — Auto-detect and connect to GitNexus backend on project startup, one-click graph loading

---

## Quick Start

### Prerequisites

- Node.js >= 20.0.0
- npm >= 9.0.0

### Install

```bash
git clone https://github.com/CCInsight/CCInsight.git
cd CCInsight
npm install
npm run build
```

### Run

```bash
npm run dev          # Frontend (http://localhost:5173)
npm run dev:backend  # Backend (http://localhost:4747)
```

---

## License

MIT License — see [LICENSE](LICENSE) file.
