# CCInsight Roadmap

> **交互式源码可视化注解与知识图谱工具** — 2026 年路线图

---

## 愿景

CCInsight 将任意代码仓库转化为可探索的知识图谱，让开发者能够：
- **理解**：通过双语注解快速理解任意代码的设计意图
- **探索**：交互式图谱导航大型代码库的模块结构
- **分析**：AI 驱动的源码分析，无需 LLM API 也能查询调用链和影响范围

---

## 当前状态

- ✅ monorepo 结构（frontend + backend + shared）
- ✅ pnpm workspace 构建
- ✅ 前端：React 18 + TypeScript + Vite 5 + Sigma.js 图谱可视化
- ✅ 后端：Tree-sitter 多语言解析 + LadybugDB 图数据库 + BM25/混合搜索
- ✅ MCP 服务器（stdio transport，支持 Cursor / Claude Code / VSCode）
- ✅ 交互式知识图谱（前端 Sigma.js）
- ✅ 双语注解系统（静态预标注 + AI 动态生成）
- ✅ CLI 工具（analyze / serve / wiki / setup / tool）
- ✅ Wiki 自动生成（LLM 驱动）

---

## Phase 1 — 注解系统完善 [当前阶段]

### 1.1 完善 Tier 4 注解
Tier 4 工具层（9 个文件）尚未编写注解，包括：
- `src/core/ingestion/structure-processor.ts` — 函数/类/变量提取
- `src/core/ingestion/import-processor.ts` — 依赖关系图
- `src/core/ingestion/process-processor.ts` — 执行链路提取
- `src/core/ingestion/community-processor.ts` — Leiden 聚类算法
- `src/core/ingestion/call-routing.ts` — API 路由提取
- `src/core/tree-sitter/parser-loader.ts` — 多语言解析器管理
- `src/storage/repo-manager.ts` — 仓库注册与管理
- `src/storage/git.ts` — Git 操作工具
- `src/lib/utils.ts` — 通用工具函数

**执行方式**：
```bash
# 使用 AI 批量生成
CCINSIGHT_LLM_API_KEY=sk-xxx node scripts/generate-annotations.mjs \
  --dir backend/src/core/ingestion --tier 4
```

### 1.2 扩展前端文件注解
前端尚未有任何注解文件。为以下文件补充 Tier 2-3 注解：
- `frontend/src/App.tsx`
- `frontend/src/components/GraphCanvas.tsx`
- `frontend/src/components/CodeReferencesPanel.tsx`
- `frontend/src/components/DualCommentPanel.tsx`
- `frontend/src/core/graph/graph-manager.ts`

### 1.3 注解验证 CI
将 `scripts/validate-annotations.mjs` 集成到 CI 中，确保每次提交前：
- 所有 JSON 文件格式正确
- Tier 目录与注解 tier 字段一致
- 行号范围格式有效

---

## Phase 2 — MCP 工具生态

### 2.1 MCP 工具完善
当前 MCP 有 10 个工具，补充以下能力：

| 工具 | 现状 | 待完善 |
|------|------|--------|
| `query` | 可用 | 增加 Filter by community/process |
| `context` | 可用 | 增加调用者/被调用者排序 |
| `impact` | 可用 | 支持 `upstream`/`downstream` 方向参数 |
| `rename` | 有框架 | 实现预览和确认流程 |
| `route_map` | 有框架 | 支持 Next.js 13 App Router |
| `tool_map` | 新增 | 完善 MCP/RPC 工具定义提取 |
| `shape_check` | 新增 | 实现 API 响应形状验证 |
| `api_impact` | 新增 | 实现变更前的 API 影响评估 |

### 2.2 MCP over HTTP
当前 MCP 仅支持 stdio transport。增加 StreamableHTTP 传输支持：
- 让远程 AI（如 Claude Web）也能使用 CCInsight 工具
- 支持 WebSocket 双向通信
- 复用现有 `/api/*` 端点路由

### 2.3 MCP 测试脚本完善
`scripts/test-mcp.mjs` 已经可用，补充：
- 集成到 `pnpm test` 中作为 MCP 冒烟测试
- 增加端到端测试（启动 MCP，调用工具，验证响应）
- 测试覆盖：所有 10 个工具的基本调用

---

## Phase 3 — AI 注解生成流水线

### 3.1 LLM 注解引擎完善
当前 `llm-annotation-service.ts` 使用 GPT-4o，补充：
- **模型选择**：支持 Claude 3.5/4、Gemini、DeepSeek 等
- **流式输出**：边生成边显示注解，提升感知速度
- **分块生成**：大文件分段生成，防止超时
- **重试机制**：指数退避，429/500 错误自动重试

### 3.2 质量评估
- 人工审核工作流：标记 AI 注解为「待审核/已审核/需修正」
- 与静态注解合并时的优先级策略
- 覆盖率统计：在设置面板显示「已注解/未注解」比例

### 3.3 批量生成脚本
`scripts/generate-annotations.mjs` 已就绪，用于：
```bash
# 批量生成 Tier 4 注解
CCINSIGHT_LLM_MODEL=gpt-4o \
CCINSIGHT_LLM_API_KEY=sk-xxx \
  node scripts/generate-annotations.mjs \
  --dir backend/src/core --tier 4 --dry-run
```

---

## Phase 4 — 前端体验优化

### 4.1 图谱交互增强
- **筛选器**：按 Tier、按语言、按社区过滤节点
- **路径高亮**：选中文件时，高亮与其相连的所有边
- **缩放优化**：鼠标滚轮缩放 + 节点聚焦动画
- **导出**：导出图谱为 PNG/SVG

### 4.2 注解面板优化
- **折叠/展开**：注解过多时可折叠列表
- **搜索过滤**：在注解列表中搜索关键词
- **快捷键**：按 `A` 切换注解，`H` 高亮，`G` 跳转图谱
- **双语切换**：注解可切换「仅中文/仅英文/双语」三种模式

### 4.3 性能优化
- **懒加载**：GraphCanvas 按社区懒加载节点（≥1000 节点时）
- **分页加载**：文件树支持虚拟滚动（≥500 文件时）
- **图谱 WebWorker**：Sigma.js 计算放到 WebWorker 中，避免阻塞 UI
- **Bundle 分析**：拆包优化，将 Mermaid 图表延迟加载

### 4.4 响应式布局
- **移动端**：支持平板竖屏查看代码（单栏布局）
- **暗/亮主题**：跟随系统偏好
- **语言切换**：中/英双语界面（UI 文本）

---

## Phase 5 — 后端与工具链

### 5.1 搜索能力增强
- **语义搜索**：完善嵌入向量生成管道，支持 `snowflake-arctic-embed-xs` 本地推理
- **混合搜索 RRF 调优**：调整 k 参数（当前 k=60），优化融合效果
- **搜索高亮**：返回结果时标注匹配的关键词片段

### 5.2 Wiki 生成完善
当前 `wiki` 命令可生成 Markdown Wiki，完善：
- **多格式导出**：支持 GitHub Flavored Markdown、HTML、PDF
- **增量更新**：检测代码变更，只重新生成受影响的模块
- **图谱嵌入**：Wiki 中嵌入交互式图谱截图/链接

### 5.3 Setup 命令完善
当前 `setup` 命令支持 Cursor/Claude Code，完善：
- **VSCode 支持**：写入 `.vscode/mcp.json`
- **Cody 支持**：写入 Sourcegraph Cody 配置
- **智能检测**：自动检测已安装的编辑器，无需手动指定

### 5.4 增量分析
- **Watch 模式**：`ccinsight serve --watch`，监控文件变更
- **差异分析**：只重新解析变更文件，更新相关节点和边
- **Git 感知**：增量时跳过未变更的目录

---

## Phase 6 — 开源与社区

### 6.1 开源准备
- [ ] 代码清理：移除所有 `console.log`、调试代码
- [ ] README 完善：增加截图、GIF 演示
- [ ] 许可证选择：MIT 或 Apache 2.0
- [ ] CI/CD：GitHub Actions 自动构建 + 发布 npm 包
- [ ] 发布策略：发布到 npm（`ccinsight` 包）

### 6.2 文档体系
- `docs/ARCHITECTURE.md` — 架构设计（已有）
- `docs/ANNOTATION_GUIDE.md` — 注解编写指南（已有）
- `docs/MCP_TOOLS.md` — MCP 工具使用手册（待编写）
- `docs/DEVELOPER_GUIDE.md` — 开发指南（待编写）

### 6.3 社区运营
- **示例仓库**：为热门开源项目（React/Vite/Next.js）预生成注解
- **贡献指南**：`CONTRIBUTING.md` — 如何为 CCInsight 贡献注解
- **Discord/微信群**：建立用户和贡献者社区

---

## 决策点（需要你来决定）

以下方向需要你的决策：

### Q1: 目标仓库
CCInsight 目前定位为**通用**代码分析工具，但也可以专注特定生态：
- **通用**：继续支持任意代码仓库
- **前端框架**：专注 React/Vue/Angular 生态（路由分析、组件关系图更精准）
- **Node.js 后端**：专注 Express/NestJS（API 路由分析、数据库 ORM 分析）

### Q2: 注解数据格式
当前使用 JSON 文件存储注解，考虑：
- **JSON（当前）**：人类可读，可版本控制
- **SQLite**：与 LadybugDB 共用数据库，查询更快
- **YAML**：更易编写，注释友好

### Q3: LLM 选择
注解生成支持多种模型：
- **GPT-4o**：通用强大，但成本高
- **Claude 3.5**：代码理解强，成本适中
- **DeepSeek V3**：性价比最高，国产优先
- **本地模型**：Llama 3/Others 无需 API Key，但质量较低

### Q4: README Header 技术栈描述
当前 README 提到「Vue3」，但前端实际是 React 18。请确认：
- 是否需要修正为「React 18」？
- 是否需要加入 Sigma.js、Tree-sitter 等技术栈标签？

---

## 版本计划

| 版本 | 目标 | 预计时间 |
|------|------|---------|
| **v0.4.0** | Tier 4 注解完善 + MCP 冒烟测试 | 2026 Q2 |
| **v0.5.0** | AI 注解质量评估 + Wiki 多格式导出 | 2026 Q3 |
| **v0.6.0** | 前端交互增强 + 响应式布局 | 2026 Q3 |
| **v0.7.0** | 增量分析 + Watch 模式 | 2026 Q4 |
| **v0.8.0** | 开源发布 + npm 包 + CI/CD | 2026 Q4 |
| **v1.0.0** | 正式版 + 文档完善 + 社区运营 | 2027 Q1 |

---

*最后更新：2026-04-02*
