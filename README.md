# CCInsight

<div align="center">

**CCInsight** — 源码可视化注解与交互式图谱工具

**交互式图谱 · 双语注解 · Tier 优先级导航 · AI 智能解读**

[![版本](https://img.shields.io/badge/版本-v0.1.0-blue)](./PRODUCT.md)
[![技术栈](https://img.shields.io/badge/技术栈-Vue3_·_Node.js_·_Python_·_Sigma.js-green)](./USAGE.md)
[![License](https://img.shields.io/badge/License-MIT-yellow)](./LICENSE)

[产品介绍](./PRODUCT.md) · [使用手册](./USAGE.md) · [快速开始](#快速开始)

</div>

---

[English](./README_EN.md) · 简体中文

---

## 是什么

CCInsight 是一款源码可视化注解与交互式图谱工具，基于 [GitNexus](https://github.com/CCInsight/gitnexus) 源码二次开发。核心能力：**对任意代码仓库进行解析与索引，通过知识图谱可视化代码结构，在源码旁叠加双语注解，配合 AI 辅助解读，帮助开发者高效理解复杂代码架构**。

不修改原始源码，注解存储在独立 JSON 文件中，可独立维护与版本控制。

---

## 功能特性

### 核心功能

- **交互式知识图谱** — Sigma.js WebGL 渲染，支持数万个节点流畅交互，点击节点直接跳转到源码
- **双语源码注解系统** — 在代码旁叠加中文解释层，不修改原始源码，支持中英文切换
- **Tier 分层导航** — 按重要性分层（核心层 → 通信层 → 命令层 → 工具层），优先聚焦最关键代码
- **智能代码搜索** — BM25 全文搜索 + 图数据库关系查询，支持中文注解内容搜索
- **AI 辅助解读** — 接入 OpenAI / Gemini / Ollama 等 LLM，选中代码块自动生成中文解释

### 技术亮点

- **注解层分离** — 不污染原始源码，注解存储在独立 JSON 文件中，可独立维护与版本管理
- **Tier 优先级策略** — 20 个核心文件覆盖 80% 核心概念，快速掌握架构全貌
- **多语言解析** — Tree-sitter 支持 20+ 编程语言的增量语法解析
- **自动后端集成** — 项目启动时自动检测并连接后端，一键加载图谱

---

## 快速开始

### 前置要求

- Node.js >= 20.0.0
- pnpm >= 9.0.0

### 安装

```bash
# 克隆仓库
git clone https://github.com/WmjXiaoJun/CCInsight.git
cd CCInsight

# 安装所有依赖（monorepo workspaces 自动处理）
pnpm install

# 构建所有包
pnpm run build
```

### 启动

**方式一：一键启动（推荐）**

```bash
pnpm run dev          # 启动前端 (http://localhost:5173)
pnpm run dev:backend  # 启动后端 (http://localhost:4747)
```

**方式二：分别启动**

```bash
# 终端 1 — 后端
pnpm run dev:backend

# 终端 2 — 前端
pnpm run dev:frontend
```

**方式三：连接已有后端**

如果后端已在其他机器上运行，可以直接启动前端并指定后端地址：

```bash
http://localhost:5173?server=http://localhost:4747
```

### 加载代码仓库

1. 点击前端界面的「分析新仓库」按钮，选择目标仓库路径
2. 等待索引完成（后端解析代码结构、构建知识图谱）
3. 开始探索！

---

## 架构概览

```
CCInsight/
├── frontend/                   # React + Vite 前端
│   ├── src/
│   │   ├── components/         # UI 组件
│   │   ├── annotations/        # 注解加载器、类型定义
│   │   ├── hooks/              # React Hooks
│   │   ├── services/           # 后端通信服务
│   │   └── config/             # 配置与常量
├── backend/                    # Node.js 后端（GitNexus 核心）
│   ├── src/
│   │   ├── server/             # HTTP API 服务
│   │   ├── cli/                # 命令行工具
│   │   ├── core/               # 核心引擎（图数据库、嵌入、聚类）
│   │   └── mcp/                # MCP 协议服务
├── gitnexus-shared/            # 前后端共享类型定义
├── annotations/                 # 源码注解数据
│   ├── tier1/                  # 核心层 (~20 文件)
│   ├── tier2/                  # 通信层
│   ├── tier3/                  # 命令层
│   └── tier4/                  # 工具层
└── docs/                       # 项目文档
```

---

## Tier 分层策略

| Tier | 名称   | 文件数  | 描述                       |
|------|--------|---------|---------------------------|
| **T1** | 核心层 | ~20     | 核心逻辑、工具接口、任务状态机 |
| **T2** | 通信层 | ~10     | API 客户端、服务器、上下文管理   |
| **T3** | 命令层 | ~10     | 斜杠命令系统、REPL 交互        |
| **T4** | 工具层 | ~30     | 文件系统、搜索、网络、子代理等    |

**学习路径建议**：从 T1 核心层开始，20 个文件即可掌握代码仓库 80% 的设计理念。

---

## 命令行工具

```bash
# 分析仓库
ccinsight analyze <path>          # 索引仓库
ccinsight serve                   # 启动 API 服务器
ccinsight wiki <output>           # 生成架构文档（mermaid 图）
ccinsight clean                   # 清理索引数据
ccinsight status                  # 查看服务器状态
```

---

## 技术栈

| 层级       | 技术                        |
|-----------|---------------------------|
| 前端框架    | React 18 + TypeScript        |
| 构建工具    | Vite 5                      |
| 可视化图谱   | Sigma.js 3 + Graphology      |
| 后端框架    | Express 4                   |
| 代码解析    | Tree-sitter（支持 20+ 语言）    |
| 图数据库    | SQLite + lbug                |
| AI/LLM    | LangChain.js                |
| MCP 协议   | @modelcontextprotocol/sdk     |

---

## 路线图

- [x] Phase 1: 项目脚手架与基础架构
- [x] Phase 2: 核心 UI 定制与汉化
- [x] Phase 3: 双语注解系统框架
- [ ] Phase 4: Tier 1 核心文件注解
- [ ] Phase 5: Tier 2-4 注解覆盖
- [ ] Phase 6: AI 辅助注解生成
- [ ] Phase 7: 文档生成器增强
- [ ] Phase 8: 开源发布与社区建设

---

## 开源许可

MIT License — 详见 [LICENSE](LICENSE) 文件。

---

## 致谢

- [GitNexus](https://github.com/CCInsight/gitnexus) — 本项目基于 GitNexus 源码二次开发
- [Sigma.js](https://github.com/simsemi/sigma) — 交互式图谱可视化
- [Tree-sitter](https://github.com/tree-sitter/tree-sitter) — 增量语法解析
- [LangChain.js](https://github.com/langchain-ai/langchainjs) — LLM 集成框架

---

*CCInsight — 用中文高效理解任意代码架构*
