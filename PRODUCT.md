# 产品介绍

<div align="center">

**CCInsight** — 源码可视化注解与交互式图谱工具

[![版本](https://img.shields.io/badge/版本-v0.1.0-blue)](./PRODUCT.md)
[![License](https://img.shields.io/badge/License-MIT-yellow)](./LICENSE)

[返回 README](./README.md) · [使用手册](./USAGE.md)

</div>

---

## 什么是 CCInsight

**CCInsight** 是一款源码可视化注解与交互式图谱工具，基于 [GitNexus](https://github.com/CCInsight/gitnexus) 源码二次开发。核心能力：**对任意代码仓库进行解析与索引，通过知识图谱可视化代码结构，在源码旁叠加双语注解，配合 AI 辅助解读，帮助开发者高效理解复杂代码架构**。

---

## 核心价值

### 为什么需要 CCInsight

面对陌生或复杂的代码仓库，开发者常常面临：

- **规模庞大**：代码仓库包含数十甚至数百个文件，架构层层嵌套，无从下手
- **英文壁垒**：核心源码注释和文档全为英文，学习成本高
- **注解缺失**：现有资料缺乏对设计意图和 trade-off 的深度解释
- **关系复杂**：模块之间的依赖调用关系复杂，手动梳理耗时且易出错

### CCInsight 如何解决

1. **Tier 分层学习** — 按重要性将代码分为 4 层，从核心文件入手，快速掌握架构全貌
2. **双语注解覆盖** — 每段关键代码都有中文解释，无障碍理解设计意图
3. **交互式图谱** — 知识图谱可视化，点击节点直接跳转到源码上下文
4. **AI 辅助** — 集成主流 LLM，实时解答代码疑问
5. **智能搜索** — 全文搜索 + 图数据库查询 + 语义搜索，多维度快速定位

---

## 功能概览

### 交互式知识图谱

- Sigma.js WebGL 高性能渲染，支持数万个节点流畅交互
- 点击节点 → 跳转源码
- 社区检测自动聚类，直观展示模块边界
- 支持缩放、拖拽、筛选等交互操作

### 双语源码注解系统

在代码旁叠加中文解释层，支持：

- 鼠标悬停查看注解气泡
- 中英文切换
- 注解按 Tier 分类，高亮优先级
- 不修改原始源码，注解独立维护

### Tier 分层导航

| Tier | 描述     | 文件数 | 优先级 |
|------|---------|--------|--------|
| T1   | 核心层   | ~20    | ★★★★★   |
| T2   | 通信层   | ~10    | ★★★★    |
| T3   | 命令层   | ~10    | ★★★     |
| T4   | 工具层   | ~30    | ★★      |

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
- **代码仓库**：用户本地路径
- **注解数据**：`annotations/` 目录（JSON 文件，可版本控制）

---

## 适用人群

- **开发者** — 需要快速理解陌生代码仓库的架构和设计
- **技术团队** — 团队知识传承，降低新成员上手成本
- **技术布道者** — 制作代码讲解材料，向受众展示代码逻辑
- **开源贡献者** — 参与大型开源项目的开发

---

## 版本历史

### v0.1.0 (当前版本)

- 项目基础架构搭建
- 前端界面定制与汉化
- 双语注解系统框架

### 规划中

- Tier 1 核心文件注解
- Tier 2-4 注解覆盖
- AI 辅助注解生成
- 文档自动生成器

---

## 许可证

本项目基于 MIT 许可证开源，详见 [LICENSE](../LICENSE) 文件。

---

## 联系方式

- GitHub Issues：[提交 Bug 或功能建议](https://github.com/WmjXiaoJun/CCInsight/issues)
- 欢迎 Star、Fork 和 Pull Request！
