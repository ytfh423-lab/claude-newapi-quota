---
name: cn
description: 一键安装 Claude Code 完整中文语言包（UI界面 + AI回复 + 加载动画 + 提示语 + 注释 + commit 全中文化）
allowed-tools: [Bash, Read, Edit, MultiEdit, Write]
---

# Claude Code 完整中文语言包

一键将 Claude Code CLI 的**所有英文**切换为中文，包括 UI 界面、权限提示、AI 回复、加载动画、思考摘要、代码注释、Git commit 等。

## 执行步骤

### 1. 读取当前配置

读取 `~/.claude/settings.json`（Windows: `%USERPROFILE%\.claude\settings.json`），了解已有配置。

### 2. 写入 settings.json 中文配置

在 `settings.json` 中**合并**以下字段（不覆盖其他已有配置）：

```json
"language": "Chinese"
```

> **重要**：值必须是 `"Chinese"` 而不是 `"zh-CN"`，这是 Claude Code 2.1.0+ 的推荐设置。
> 如果用户用的是旧版本不支持，则改为 `"zh-CN"` 或 `"简体中文"` 尝试。

### 3. 中文加载动画

```json
"spinnerVerbs": {"mode": "replace", "verbs": ["思考中", "分析中", "推理中", "搜索中", "编码中", "优化中", "审视中", "构思中", "规划中", "计算中"]}
```

### 4. 中文加载提示语（可选）

询问用户是否要自定义加载等待时的提示语。如果用户同意：

```json
"spinnerTipsOverride": ["正在为你编写代码...", "正在分析项目结构...", "正在思考最佳方案...", "稍等，马上就好...", "正在审查代码质量..."]
```

### 5. 全局 CLAUDE.md 中文指令

这是最关键的一步，确保 AI 的**所有输出**都使用中文。

检查全局 `CLAUDE.md` 文件：
- Windows: `%USERPROFILE%\.claude\CLAUDE.md`
- macOS/Linux: `~/.claude/CLAUDE.md`

先检查文件中是否已包含 `<!-- cn-lang-pack -->` 标记。如果已有则跳过；否则在末尾追加：

```markdown

<!-- cn-lang-pack -->
## 语言规则（中文语言包）

### 核心规则
- **始终使用简体中文**回复，禁止使用英文句子
- 技术术语首次出现时可标注英文原文，如：依赖注入（Dependency Injection），之后仅用中文
- 代码中的字符串、变量名、函数名保持英文（这是编程规范），但所有注释必须用中文
- 编程专有名词（如 API、JSON、HTTP、Git、npm 等）保持英文缩写

### 代码注释
- 所有新增注释使用中文
- 修改已有代码时，不改动原有英文注释
- JSDoc / docstring 的描述部分使用中文

### Git 提交
- commit message 使用中文，格式：`类型: 中文描述`
- 示例：`修复: 修复登录页面空指针异常`、`功能: 新增用户导出功能`
- 分支名保持英文（如 feat/xxx、fix/xxx）

### 错误处理
- 错误信息和日志说明使用中文
- 控制台调试输出使用中文

### 文档
- README、CHANGELOG 等文档默认使用中文
- Markdown 文档使用中文标点符号（，。！？：；""''）
```

### 6. 项目级 CLAUDE.md（可选）

询问用户是否要为当前项目也应用中文规则。

如果同意，对当前工作目录下的 `CLAUDE.md` 执行相同操作（检查标记避免重复追加）。

### 7. 完成提示

展示配置摘要：

> ✅ 中文语言包安装完成！已中文化的内容：
>
> | 项目 | 状态 |
> |---|---|
> | UI 界面语言 | ✅ Chinese |
> | AI 回复语言 | ✅ 强制中文 |
> | 代码注释 | ✅ 中文注释 |
> | Git commit | ✅ 中文提交信息 |
> | 加载动画 | ✅ 中文动词 |
> | 加载提示语 | ✅/⏭ 中文提示 |
> | 全局 CLAUDE.md | ✅ 已写入规则 |
> | 项目 CLAUDE.md | ✅/⏭ 视用户选择 |
>
> **重启 Claude Code 生效。**
>
> 提示：
> - 如遇到 `/config` 里语言被重置为英文，这是已知 Bug，直接在 `settings.json` 里设置是最可靠的
> - 如想恢复英文，将 `"language"` 改为 `"English"` 并删除 CLAUDE.md 中 `<!-- cn-lang-pack -->` 标记下方的内容
