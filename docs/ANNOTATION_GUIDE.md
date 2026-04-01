# 注解编写指南

本文档说明如何为 Claude Code 源码编写中文注解。

## 注解文件位置

所有注解文件存放在 `annotations/tier{1,2,3,4}/` 目录，每个源文件对应一个 JSON 文件：

```
annotations/
├── tier1/
│   ├── _meta.json           # 本层元数据
│   ├── main.tsx.json        # main.tsx 的注解
│   └── query.ts.json        # query.ts 的注解
├── tier2/
│   └── ...
└── ...
```

文件命名规范：`{相对于 src/ 的路径}.json`，斜杠 `/` 替换为 `.`。

例如：
- `src/query.ts` → `annotations/tier1/query.ts.json`
- `src/tools/BashTool/tool.ts` → `annotations/tier4/tools.BashTool.tool.ts.json`

## 注解格式

```json
{
  "path": "src/query.ts",
  "tier": 1,
  "description": "Agent 主循环的中文简介，一句话概括文件作用",
  "descriptionEn": "English one-sentence description",
  "annotations": [
    {
      "lines": "1-30",
      "type": "import",
      "name": "可选的函数/类/变量名",
      "zh": "【类型 — 简短标题】中文解释...",
      "en": "可选的英文原文注释",
      "code": "可选的代码片段"
    }
  ],
  "updatedAt": "2026-04-01",
  "author": "your-github-username"
}
```

## 字段说明

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `path` | string | 是 | 相对于 `src/` 的路径 |
| `tier` | number | 是 | 所属层级 (1-4) |
| `description` | string | 是 | 文件作用的中文简介 |
| `descriptionEn` | string | 否 | 英文简介 |
| `annotations` | array | 是 | 行级注解数组 |
| `updatedAt` | string | 否 | 更新时间 (ISO 日期) |
| `author` | string | 否 | 作者 GitHub 用户名 |

## 注解类型

| type | 说明 | 示例 |
|------|------|------|
| `section` | 段落/章节说明 | 代码块之间的逻辑解释 |
| `function` | 函数解释 | 包含 `name` 字段 |
| `class` | 类解释 | 包含 `name` 字段 |
| `variable` | 变量/常量说明 | 包含 `name` 字段 |
| `import` | 导入说明 | 模块依赖解释 |
| `type` | 类型定义说明 | interface/type/enum |
| `comment` | 注释翻译 | 翻译原有注释 |
| `tip` | 提示 | 使用技巧或注意事项 |
| `warning` | 警告 | 潜在 bug 或危险操作 |

## 行号范围格式

`lines` 字段支持以下格式：

- 单行：`"123"`
- 范围：`"1-50"`
- 多行/多范围（用逗号分隔）：`"1-30, 45, 100-120"`

## 行数建议

每个注解的行数范围建议：

| 注解类型 | 建议行数 | 说明 |
|----------|----------|------|
| `import` | 1-50 行 | 解释导入的模块和作用 |
| `function` | 10-50 行 | 解释函数的核心逻辑 |
| `class` | 20-100 行 | 解释类的作用和主要方法 |
| `section` | 5-100 行 | 解释一段代码的逻辑 |
| `variable` | 1-20 行 | 解释常量/变量的含义 |
| `type` | 5-50 行 | 解释类型的结构和用途 |
| `tip` | 1-10 行 | 简短提示 |
| `warning` | 1-10 行 | 简短警告 |

## 编写规范

### 好的注解

```json
{
  "lines": "151-170",
  "type": "section",
  "zh": "【Thinking 块规则】\nClaude Code 的 extended thinking 功能有三条严格规则：\n1. 包含 thinking/redacted_thinking 块的消息必须满足 max_thinking_length > 0\n2. thinking 块不能是消息的最后一个 content 块\n3. thinking 块必须在整个 assistant trajectory 中保留\n\n这确保 Claude 的思维过程被正确存储和传输。"
}
```

### 避免的写法

- ❌ 只写"这是一个函数"——太笼统
- ❌ 逐行翻译代码——没有解释设计意图
- ❌ 注解行数过多（超过 200 行）——拆分为多个注解
- ❌ 不解释为什么——要说明设计决策和 trade-off

## 提交流程

1. Fork 本仓库
2. 在对应的 `annotations/tierX/` 目录创建或编辑 JSON 文件
3. 运行本地验证：
   ```bash
   # 验证 JSON 格式
   node scripts/validate-annotations.js
   ```
4. 提交 PR，标题格式：`docs: annotate src/xxx.ts (Tier X)`

## Tier 分层原则

### Tier 1 — 核心层（优先注解）
最核心的文件，理解这 10 个文件即可掌握 Claude Code 80% 的设计理念。

### Tier 2 — 通信层
API 通信、上下文管理相关的文件。

### Tier 3 — 命令层
斜杠命令、REPL 交互相关的文件。

### Tier 4 — 工具层
文件系统、搜索、网络等工具实现。最底层，数量最多。

## 常见问题

**Q: 源文件不存在于 tierX 列表中怎么办？**
A: 在 `annotations/MANIFEST.json` 的 `files` 数组中添加新条目，并创建对应的 JSON 注解文件。

**Q: 注解和原有英文注释冲突怎么办？**
A: 保留 `en` 字段存放原文，`zh` 字段写中文解释，两者共存。

**Q: 如何验证注解 JSON 格式正确？**
A: 运行 `node scripts/validate-annotations.js`，会检查所有 JSON 文件的格式和 schema 合规性。
