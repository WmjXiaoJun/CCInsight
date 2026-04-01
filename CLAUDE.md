# CCInsight Project Conventions

This file guides AI agents working on the CCInsight project.

## Project Name & Identity

- **Project Name**: CCInsight (Claude Code Insight)
- **Repository URL**: https://github.com/WmjXiaoJun/CCInsight
- **Description**: Interactive source code visualization & bilingual annotation tool for any codebase
- **Language**: Chinese-first (UI, docs, annotations), English comments in code
- **License**: MIT

## Directory Structure

```
CCInsight/
├── frontend/               # React + Vite web UI
│   ├── src/
│   │   ├── components/     # UI components
│   │   ├── annotations/    # Annotation loader & types
│   │   ├── hooks/          # React hooks
│   │   ├── services/       # Backend communication
│   │   └── config/         # Constants & config
│   └── dist/               # Production build
├── backend/                # Node.js API server (GitNexus core)
│   └── src/
│       ├── server/         # Express HTTP API
│       ├── cli/            # CLI tools
│       ├── core/           # Engine (graph, search, embeddings)
│       └── mcp/            # Model Context Protocol
├── gitnexus-shared/        # Shared type definitions (npm workspace name)
├── annotations/             # Source code Chinese annotations
│   ├── MANIFEST.json       # Full file index
│   ├── tier1/              # Core layer (10 files, highest priority)
│   ├── tier2/              # Communication layer (6 files)
│   ├── tier3/              # Command layer (10 files)
│   └── tier4/              # Tool layer (24 files)
└── docs/                   # Project documentation
```

## Key Conventions

### Workspace Names (npm workspaces)

The root `package.json` uses these workspace directory names:
- `frontend` → package name: `ccinsight-web`
- `backend` → package name: `ccinsight-core`
- `gitnexus-shared` → package name: `ccinsight-shared`

When running `npm run` commands with `--workspace=`, use:
- `--workspace=frontend`
- `--workspace=backend`
- `--workspace=gitnexus-shared`

### Path Aliases

- `@/` → `./frontend/src/`
- `@shared/` → `../gitnexus-shared/`

### Build Order

Always build in this order:
1. `npm run build --workspace=gitnexus-shared`
2. `npm run build --workspace=frontend`
3. `npm run build --workspace=backend`

### Tier System

Files are organized by importance (Tier 1 = most critical):
- **Tier 1 (核心层)**: Core loop, tool interface, task state machine — 10 files, cover 80% of concepts
- **Tier 2 (通信层)**: API client, server, context management
- **Tier 3 (命令层)**: Slash commands, REPL interaction
- **Tier 4 (工具层)**: File system, search, network tools

When annotating, prioritize Tier 1 files first.

### Annotation Format

Each source file has a corresponding JSON annotation file in `annotations/tierN/`:

```json
{
  "path": "src/query.ts",
  "tier": 1,
  "description": "Agent 主循环...",
  "annotations": [
    {
      "lines": "151-170",
      "type": "section",
      "zh": "【Thinking 块规则】...",
      "en": "Original comment...",
      "code": "optional code snippet"
    }
  ]
}
```

Annotation types: `section`, `function`, `class`, `variable`, `import`, `type`, `comment`, `tip`, `warning`

### UI Language

All UI text should be in **Simplified Chinese**. Exception: technical terms that are commonly used in English (API, HTTP, SQL, etc.).

### Code Style

- TypeScript strict mode enabled
- No meaningless comments (// Import the module, // Define the function)
- Use meaningful Chinese comments only where intent is non-obvious
- Prefer `Record<string, T>` over `{ [key: string]: T }`
- Use inline styles sparingly; prefer Tailwind classes for layout

### Git Conventions

- Branch naming: `feat/annotation-{filename}`, `fix/{issue}`, `docs/{topic}`
- Commit format: `{type}: {description} ({scope})`
  - types: `feat`, `fix`, `docs`, `refactor`, `chore`, `i18n`
  - example: `docs: annotate src/query.ts (Tier 1)`

## Running the Project

```bash
# Install dependencies
npm install

# Build all packages
npm run build

# Start development
npm run dev           # Frontend: http://localhost:5173
npm run dev:backend  # Backend: http://localhost:4747

# Windows setup script
./scripts/setup.ps1

# Linux/macOS setup script
./scripts/setup.sh
```

## Backend API

- Frontend connects to backend at `http://localhost:4747`
- Key endpoints: `/api/repos`, `/api/graph/{repo}`, `/api/heartbeat` (SSE)
- Backend uses SQLite via lbug for graph storage
- Tree-sitter for parsing 20+ programming languages

## Known Issues

1. The npm-installed gitnexus package (via `npx`) has a missing `/api/heartbeat` endpoint — use local source build instead
2. `ccinsight serve` may have database lock conflicts — retry or restart the process
3. Large frontend chunks (>500KB) — consider dynamic imports in future optimization
