# 使用手册

<div align="center">

**CCInsight** — 源码可视化注解与交互式图谱工具

[![版本](https://img.shields.io/badge/版本-v0.1.0-blue)](./PRODUCT.md)
[![License](https://img.shields.io/badge/License-MIT-yellow)](./LICENSE)

[返回 README](./README.md) · [产品介绍](./PRODUCT.md)

</div>

---

## 目录

- [安装](#安装)
- [启动](#启动)
- [加载仓库](#加载仓库)
- [界面导航](#界面导航)
- [AI 设置](#ai-设置)
- [命令行工具](#命令行工具)
- [注解系统](#注解系统)
- [开发指南](#开发指南)
- [常见问题](#常见问题)

---

## 安装

### 前置要求

| 依赖        | 版本要求    | 说明             |
|-----------|----------|----------------|
| Node.js   | >= 20.0.0 | 推荐使用 LTS 版本   |
| pnpm      | >= 9.0.0 | npm / yarn 也可使用 |
| Git       | 最新版本    | 用于克隆仓库        |

### 快速安装

```bash
# 克隆仓库
git clone https://github.com/WmjXiaoJun/CCInsight.git
cd CCInsight

# 安装依赖（推荐使用 pnpm，monorepo workspaces 自动处理）
pnpm install

# 构建所有包
pnpm run build
```

> 如果遇到依赖安装问题，尝试先清理缓存：
> ```bash
> pnpm store prune
> rm -rf node_modules
> pnpm install
> ```

---

## 启动

### 方式一：一键启动（推荐）

```bash
pnpm run dev
```

这会自动启动前端和后端服务。

### 方式二：分别启动

```bash
# 终端 1 — 启动后端
pnpm run dev:backend

# 终端 2 — 启动前端
pnpm run dev:frontend
```

### 方式三：连接已有后端

如果后端已在其他机器上运行，可以只启动前端并指定后端地址：

```bash
http://localhost:5173?server=http://localhost:4747
```

### 访问地址

| 服务     | 地址                  |
|---------|---------------------|
| 前端     | http://localhost:5173 |
| 后端 API | http://localhost:4747 |

---

## 加载仓库

### 步骤 1：在 CCInsight 中加载

1. 打开前端界面（http://localhost:5173）
2. 点击顶部导航栏的「分析新仓库」按钮
3. 选择目标代码仓库路径
4. 等待索引完成

### 步骤 2：等待索引

索引过程包括：

```
[1/5] 解析文件结构...
[2/5] 提取导入关系...
[3/5] 构建知识图谱...
[4/5] 生成嵌入向量...
[5/5] 索引完成 ✓
```

索引完成后，界面会自动跳转到知识图谱视图。

---

## 界面导航

### 顶部导航栏

| 按钮       | 功能                    |
|-----------|-----------------------|
| 分析新仓库    | 加载新的代码仓库              |
| 搜索框      | 全文搜索 / 图数据库查询         |
| AI 设置     | 配置 LLM 提供商             |
| 视图切换     | 切换图谱视图 / 文件树视图        |

### 知识图谱视图

- **缩放**：滚轮 / 双指缩放
- **拖拽**：点击并拖拽空白区域
- **选中节点**：显示文件信息预览
- **双击节点**：跳转到源码视图

### 源码视图

- **文件树**：左侧边栏，按 Tier 分类
- **源码区**：中央主区域，显示代码
- **注解气泡**：悬停或点击高亮区域查看中文注解
- **右侧面板**：文件详情、引用关系、AI 解读

### 注解面板

- **切换语言**：中 / EN 按钮切换中英文注解
- **筛选 Tier**：只显示特定层级的注解
- **筛选类型**：按 `section`、`function`、`class` 等类型过滤

---

## AI 设置

### 配置 LLM 提供商

1. 点击右上角「AI 设置」按钮
2. 选择 LLM 提供商（支持 OpenAI、Gemini、Ollama 等）
3. 填写必要的配置信息（API Key、Base URL 等）
4. 点击「保存」

### 支持的提供商

| 提供商         | 必填配置                | 说明                       |
|--------------|---------------------|--------------------------|
| OpenAI       | API Key, Base URL    | GPT-4o、GPT-4o-mini 等      |
| Google Gemini | API Key              | Gemini 1.5 / 2.0 系列       |
| Anthropic    | API Key              | Claude 3.5 / 3.7 系列        |
| Azure OpenAI | API Key, Endpoint, Deployment | 企业级部署                |
| Ollama       | Base URL             | 本地模型（默认 localhost:11434） |
| LM Studio    | Base URL             | 本地模型                     |
| Groq         | API Key              | 免费额度高，推荐尝鲜             |
| DeepSeek     | API Key              | 性价比高                    |
| OpenRouter   | API Key              | 聚合多个模型                  |
| 智谱 GLM     | API Key              | 国产模型                    |

### 使用 AI 解读

1. 在源码视图中选中一段代码
2. 点击「AI 解读」按钮（或使用快捷键 `Ctrl+I`）
3. 等待 AI 生成解释
4. 解释会以内嵌气泡形式显示在代码旁

---

## 命令行工具

### 全局命令

```bash
# 启动 API 服务器
ccinsight serve

# 查看服务器状态
ccinsight status

# 清理索引数据
ccinsight clean
```

### 仓库分析

```bash
# 分析指定仓库
ccinsight analyze <path>

# 分析并生成文档
ccinsight analyze <path> --wiki

# 仅解析，不构建图谱
ccinsight analyze <path> --parse-only
```

### 文档生成

```bash
# 生成 mermaid 架构图
ccinsight wiki <output-dir>

# 生成完整文档（含 README）
ccinsight wiki <output-dir> --full
```

---

## 注解系统

### 注解格式

每个源文件对应一个注解 JSON 文件：

```json
{
  "path": "src/query.ts",
  "tier": 1,
  "description": "核心逻辑说明...",
  "annotations": [
    {
      "lines": "1-30",
      "type": "import",
      "zh": "【导入 — SDK 类型定义】...",
      "en": "Original English comment..."
    },
    {
      "lines": "151-170",
      "type": "section",
      "zh": "【核心逻辑块说明】...",
      "code": "const someFunction = ..."
    }
  ]
}
```

### 注解类型

| 类型        | 说明         |
|-----------|------------|
| `section` | 段落/章节说明    |
| `function` | 函数解释       |
| `class`   | 类解释        |
| `variable` | 变量/常量说明    |
| `import`  | 导入说明       |
| `type`    | 类型定义说明     |
| `comment` | 注释翻译       |
| `tip`     | 提示         |
| `warning` | 警告         |

### 参与贡献注解

1. Fork 本仓库
2. 在 `annotations/tierX/` 目录中找到对应的 JSON 文件
3. 按上述格式添加中文注解
4. 运行验证脚本：
   ```bash
   node scripts/validate-annotations.js
   ```
5. 提交 Pull Request

详细规范请参考 [注解编写指南](./docs/ANNOTATION_GUIDE.md)。

---

## 开发指南

### 项目结构

```
CCInsight/
├── frontend/            # React + Vite 前端
│   ├── src/
│   │   ├── components/  # UI 组件
│   │   ├── hooks/       # React Hooks
│   │   ├── services/    # 后端通信
│   │   └── annotations/ # 注解加载器
├── backend/             # Node.js 后端
│   ├── src/
│   │   ├── server/      # HTTP API
│   │   ├── cli/         # 命令行工具
│   │   ├── core/        # 核心引擎
│   │   └── mcp/         # MCP 协议
├── gitnexus-shared/     # 共享类型定义
└── annotations/         # 注解数据
```

### 构建

```bash
# 全量构建
pnpm run build

# 仅前端
pnpm run build --workspace=frontend

# 仅后端
pnpm run build --workspace=backend
```

### 代码规范

- 前端：ESLint + Prettier
- 后端：ESLint + Prettier
- 提交前请运行：
  ```bash
  pnpm run lint
  ```

---

## 常见问题

### Q: 索引失败怎么办？

检查以下内容：

1. 仓库路径是否正确
2. Node.js 版本是否 >= 20.0.0
3. 后端服务是否正常启动
4. 查看后端控制台日志

### Q: 图谱渲染很慢？

1. 关闭不必要的标签页
2. 尝试缩小搜索范围
3. 刷新页面重置图谱状态

### Q: AI 解读不工作？

1. 确认已在「AI 设置」中正确配置 LLM
2. 检查 API Key 是否有效
3. 确认网络连接正常

### Q: 如何更新仓库索引？

在已加载的仓库中，点击「重新分析」按钮即可。

### Q: 注解数据在哪里？

注解数据存放在 `annotations/` 目录，使用 JSON 格式，可通过 Git 版本控制。

---

## 更多资源

- [架构文档](./docs/ARCHITECTURE.md) — 深入了解系统设计
- [注解编写指南](./docs/ANNOTATION_GUIDE.md) — 如何参与注解贡献
- [CLAUDE.md](./CLAUDE.md) — 项目内部开发指南
