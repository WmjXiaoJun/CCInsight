# CCInsight 架构文档

## 系统架构

```
┌─────────────────────────────────────────────────────────┐
│                     Browser (React)                       │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐  │
│  │ FileTree │ │  Sigma   │ │  Right   │ │  Status  │  │
│  │  Panel   │ │  Graph   │ │  Panel   │ │   Bar    │  │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘  │
│  ┌──────────────────────────────────────────────────┐  │
│  │       Annotation Layer (DualCommentPanel)        │  │
│  └──────────────────────────────────────────────────┘  │
└────────────────────────────┬────────────────────────────┘
                            │ HTTP / SSE
┌────────────────────────────▼────────────────────────────┐
│                   Backend (Express)                      │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐  │
│  │  REST    │ │  SSE     │ │  MCP     │ │ Worker   │  │
│  │  API     │ │ Heartbeat│ │ Server   │ │ (分析)   │  │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘  │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐  │
│  │ lbug DB  │ │ Embedding │ │ Cluster  │ │ Search   │  │
│  │ (SQLite) │ │ (ONNX)   │ │ Enricher │ │ (BM25)   │  │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘  │
└─────────────────────────────────────────────────────────┘
                            │
┌────────────────────────────▼────────────────────────────┐
│                Local File System                         │
│  ┌──────────────────┐  ┌────────────────────────────┐  │
│  │ .ccinsight/      │  │ claude-code-source-code/   │  │
│  │ (索引数据库)      │  │ (源代码仓库)               │  │
│  └──────────────────┘  └────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

## 核心模块

### Frontend (`frontend/`)

| 模块 | 职责 |
|------|------|
| `App.tsx` | 根组件，路由分发，状态管理 |
| `GraphCanvas.tsx` | Sigma.js 图谱渲染，节点交互 |
| `FileTreePanel.tsx` | 文件树导航，侧边栏 |
| `DualCommentPanel.tsx` | 双语注解面板，核心创新 |
| `AnnotationBubble.tsx` | 源码叠加注解气泡组件 |
| `CodeReferencesPanel.tsx` | 代码引用追溯面板 |
| `RightPanel.tsx` | 右侧面板（标签页切换） |
| `Header.tsx` | 顶部导航栏 |
| `SettingsPanel.tsx` | AI 设置面板 |
| `annotations/loader.ts` | 注解数据加载器 |

### Backend (`backend/src/`)

| 模块 | 职责 |
|------|------|
| `server/api.ts` | Express HTTP API，路由注册 |
| `server/analyze-job.ts` | 分析任务调度器 |
| `server/git-clone.ts` | Git 克隆/更新逻辑 |
| `cli/index.ts` | CLI 入口，分发命令 |
| `core/ingestion/` | 代码解析与索引构建 |
| `core/lbug/` | SQLite 图数据库适配器 |
| `core/search/` | BM25 全文搜索 + 混合搜索 |
| `core/embeddings/` | ONNX 语义嵌入生成 |
| `core/wiki/` | Markdown 文档生成器 |
| `mcp/` | Model Context Protocol 服务器 |

### Shared (`gitnexus-shared/`)

| 模块 | 职责 |
|------|------|
| `src/index.ts` | 导出所有共享类型 |
| `src/pipeline.ts` | 分析流程类型定义 |
| `src/languages.ts` | 支持的语言列表 |
| `src/language-detection.ts` | 语言自动检测 |

### Annotations (`annotations/`)

| 目录 | 层级 | 优先级 |
|------|------|--------|
| `tier1/` | 核心层 | ★★★★★ |
| `tier2/` | 通信层 | ★★★★ |
| `tier3/` | 命令层 | ★★★ |
| `tier4/` | 工具层 | ★★ |

## 数据流

### 仓库分析流程

```
用户选择仓库路径
       ↓
git clone / git pull
       ↓
并行执行:
  - Tree-sitter 解析每个文件 (多线程)
  - 提取 import/export 关系
  - 提取函数/类/变量定义
  - 计算代码度量 (复杂度, 行数)
       ↓
存储到 lbug (SQLite 图数据库)
  - nodes: 文件/函数/类/变量/导入
  - edges: 引用/调用/导入关系
       ↓
生成嵌入向量 (ONNX model)
       ↓
聚类分析 (社区检测)
       ↓
构建 BM25 倒排索引
       ↓
前端加载图谱
```

### 前端加载流程

```
connectToServer(url)
       ↓
GET /api/repos        → 获取仓库列表
GET /api/graph/{repo}  → 获取图谱数据 (nodes + edges)
       ↓
createKnowledgeGraph()
       ↓
渲染 Sigma.js 图谱
       ↓
用户交互:
  - 点击节点 → 显示文件源码 + 注解
  - 搜索 → Cypher 查询 / BM25 搜索
  - AI 对话 → LangChain 调用 LLM
```

## API 端点

### REST API

| 端点 | 方法 | 说明 |
|------|------|------|
| `/api/heartbeat` | GET (SSE) | 心跳检测，服务器保活 |
| `/api/repos` | GET | 获取已索引仓库列表 |
| `/api/graph/:repo` | GET | 获取仓库的图谱数据 |
| `/api/file/:repo/*` | GET | 读取仓库中的文件内容 |
| `/api/search` | POST | BM25 全文搜索 |
| `/api/cypher` | POST | Cypher 图查询 |
| `/api/analyze` | POST | 触发仓库分析任务 |
| `/api/embeddings` | POST | 生成语义嵌入 |

### MCP Server

| 工具 | 说明 |
|------|------|
| `search_files` | 在仓库中搜索文件 |
| `read_file` | 读取文件内容 |
| `grep` | 内容正则搜索 |
| `get_imports` | 获取文件的导入关系 |
| `get_dependents` | 获取依赖该文件的所有文件 |

## Tier 层级说明

### Tier 1: 核心层 (10 文件)

| 文件 | 作用 | 行数(估) |
|------|------|----------|
| `src/main.tsx` | REPL 入口，启动流程 | ~500 |
| `src/query.ts` | Agent 主循环，工具调用 | ~800 |
| `src/Tool.ts` | buildTool 工厂函数 | ~300 |
| `src/Task.ts` | 任务状态机 | ~200 |
| `src/types/index.ts` | 核心类型定义 | ~500 |
| `src/tools.ts` | 工具注册表 | ~300 |
| `src/context.ts` | 上下文管理器 | ~300 |
| `src/tasks.ts` | 多任务调度 | ~300 |
| `src/QueryEngine.ts` | API 调用封装 | ~300 |
| `src/history.ts` | 历史记录管理 | ~200 |

### Tier 2: 通信层 (6 文件)

API 客户端、服务器、上下文管理 — Claude Code 与外部通信的桥梁。

### Tier 3: 命令层 (10 文件)

斜杠命令系统、REPL 交互 — 用户与 Claude Code 的交互接口。

### Tier 4: 工具层 (24 文件)

文件系统、搜索、网络、子代理等工具实现 — Claude Code 执行操作的原子单位。

## 技术选型原因

### 为什么用 lbug (SQLite) 而非 Neo4j？

- **零依赖**：SQLite 是 Node.js 内置的，无需安装额外服务
- **性能足够**：对于单个仓库 (< 50 万节点)，SQLite 性能完全够用
- **易部署**：单文件数据库，备份和迁移极简

### 为什么用 Sigma.js 而非 D3.js？

- **专为图数据设计**：Sigma.js 内置图布局算法 (ForceAtlas2)
- **WebGL 渲染**：支持数万个节点的流畅渲染
- **Graphology 集成**：与 lbug 输出格式无缝对接

### 为什么用 Tree-sitter？

- **增量解析**：只重新解析变更的文件，速度极快
- **多语言支持**：支持 20+ 编程语言
- **准确的位置信息**：每个 AST 节点都有精确的行号列号
