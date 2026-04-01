# 产品介绍

<div align="center">

**CCInsight** — Claude Code 源码中文注解与可视化分析平台

[![版本](https://img.shields.io/badge/版本-v0.1.0-blue)](./PRODUCT.md)
[![License](https://img.shields.io/badge/License-MIT-yellow)](./LICENSE)

[返回 README](./README.md) · [使用手册](./USAGE.md)

</div>

---

## 什么是 CCInsight

**CCInsight**（Claude Code Insight）是一个专为深度理解 Claude Code 源码而设计的可视化分析平台。

基于 [GitNexus](https://github.com/CCInsight/gitnexus) 源码二次开发，核心目标：**用中文理解 Claude Code 源码架构，通过双语注解让中英文开发者都能高效学习**。

---

## 核心价值

### 为什么需要 CCInsight

Claude Code 是 Anthropic 官方推出的 AI 编程助手，其源码代表了当前 AI + 编程领域最前沿的工程实践。然而：

- **英文壁垒**：核心源码注释和文档全为英文，中文开发者学习成本高
- **规模庞大**：Claude Code 源码包含数百个文件，架构复杂，无从下手
- **注解缺失**：现有资料缺乏对设计意图和 trade-off 的深度解释

### CCInsight 如何解决

1. **Tier 分层学习** — 按重要性将源码分为 4 层，从核心 20 文件入手，掌握 80% 架构
2. **中文注解覆盖** — 每一行关键代码都有中文解释，无障碍理解设计意图
3. **交互式图谱** — 知识图谱可视化，点击节点直接跳转到源码上下文
4. **AI 辅助** — 集成主流 LLM，实时解答代码疑问

---

## 功能概览

### 双语源码注解系统

在代码旁叠加中文解释层，支持：

- 鼠标悬停查看注解气泡
- 中英文切换
- 注解按 Tier 分类，高亮优先级
- 不修改原始源码，注解独立维护

### 交互式知识图谱

- Sigma.js WebGL 高性能渲染
- 支持数万个节点流畅交互
- 点击节点 → 跳转源码
- 社区检测自动聚类

### Tier 分层导航

| Tier | 描述           | 文件数 | 学习优先级 |
|------|--------------|--------|----------|
| T1   | 核心层         | ~20    | ★★★★★     |
| T2   | 通信层         | ~10    | ★★★★      |
| T3   | 命令层         | ~10    | ★★★       |
| T4   | 工具层         | ~30    | ★★        |

### 智能代码搜索

- BM25 全文搜索
- 图数据库关系查询
- 支持搜索中文注解内容
- 语义相似度搜索（基于嵌入向量）

### AI 辅助解读

支持多种 LLM 提供商：

| 提供商         | 配置项                          |
|--------------|-------------------------------|
| OpenAI       | API Key + Base URL             |
| Google Gemini | API Key                       |
| Anthropic    | API Key                       |
| Azure OpenAI | API Key + Endpoint + Deployment |
| Ollama       | Base URL（默认 localhost:11434）  |
| LM Studio    | Base URL                      |
| Groq         | API Key                       |
| DeepSeek     | API Key                       |
| OpenRouter   | API Key                       |
| 智谱 GLM     | API Key                       |

---

## 技术架构

### 前后端分离

- **前端**：React 18 + TypeScript + Vite + Sigma.js
- **后端**：Node.js + Express + Tree-sitter + SQLite
- **共享**：TypeScript 类型定义（gitnexus-shared）

### 核心依赖

| 依赖              | 用途               |
|-----------------|------------------|
| Sigma.js 3      | 图谱可视化           |
| Graphology      | 图数据结构           |
| Tree-sitter     | 增量语法解析（20+ 语言） |
| lbug (SQLite)   | 图数据库             |
| LangChain.js    | LLM 集成           |
| @modelcontextprotocol/sdk | MCP 协议实现    |
| ONNX Runtime    | 本地嵌入向量生成        |

### 数据存储

- **索引数据**：`.ccinsight/` 目录（SQLite 数据库）
- **源码仓库**：用户本地路径
- **注解数据**：`annotations/` 目录（JSON 文件，可版本控制）

---

## 适用人群

- **AI 编程爱好者** — 想了解 Claude Code 等 AI 编程工具的内部原理
- **TypeScript / Node.js 开发者** — 学习现代化前端架构和工程实践
- **开源贡献者** — 参与 Claude Code 相关项目的开发
- **技术布道者** — 向团队传播 Claude Code 的最佳实践

---

## 版本历史

### v0.1.0 (当前版本)

- 项目基础架构搭建
- 前端界面定制与汉化
- 双语注解系统框架

### 规划中

- Tier 1 核心文件中文注解
- Tier 2-4 注解覆盖
- AI 辅助注解生成
- 文档自动生成器

---

## 许可证

本项目基于 MIT 许可证开源，详见 [LICENSE](../LICENSE) 文件。

---

## 联系方式

- GitHub Issues：[提交 Bug 或功能建议](https://github.com/CCInsight/CCInsight/issues)
- 欢迎 Star、 Fork 和 Pull Request！
