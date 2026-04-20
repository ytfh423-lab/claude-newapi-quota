---
name: cn
description: 一键安装 Claude Code 中文语言包（界面中文化 + 中文回复 + 中文加载动画）
allowed-tools: [Bash, Read, Edit, MultiEdit, Write]
---

# Claude Code 中文语言包配置

一键将 Claude Code CLI 界面切换为中文，包括 UI 语言、AI 回复语言、加载动画中文化。

## 执行步骤

### 1. 读取当前配置

读取 `~/.claude/settings.json`（Windows: `%USERPROFILE%\.claude\settings.json`）。

### 2. 写入中文语言设置

在 `settings.json` 中**合并**以下字段（不覆盖已有配置）：

```json
"language": "zh-CN"
```

### 3. 中文加载动画

在 `settings.json` 中**合并**以下字段：

```json
"spinnerVerbs": {"mode": "replace", "verbs": ["思考中", "分析中", "推理中", "搜索中", "编码中", "优化中", "审视中", "构思中", "规划中", "计算中"]}
```

### 4. 全局中文指令（CLAUDE.md）

检查全局 `CLAUDE.md` 文件是否存在：
- Windows: `%USERPROFILE%\.claude\CLAUDE.md`
- macOS/Linux: `~/.claude/CLAUDE.md`

如果不存在则创建，如果已存在则在末尾追加（不覆盖已有内容）。

追加以下内容（用 `<!-- cn-lang-pack -->` 标记，避免重复追加）：

先检查文件中是否已包含 `<!-- cn-lang-pack -->` 标记，如果已有则跳过此步骤。

```markdown

<!-- cn-lang-pack -->
## 语言偏好
- 请始终使用**简体中文**回复
- 代码注释使用中文
- Git commit message 使用中文
- 错误信息和日志说明使用中文
```

### 5. 项目级中文指令（可选）

询问用户是否要为当前项目也设置中文：

如果用户同意，检查当前工作目录下的 `CLAUDE.md` 是否存在，同样追加上述内容（检查标记避免重复）。

### 6. 完成提示

告知用户：

> ✅ 中文语言包配置完成！
> - UI 语言: 简体中文（zh-CN）
> - AI 回复: 中文
> - 加载动画: 中文动词
> - 全局指令: 已写入 ~/.claude/CLAUDE.md
>
> **重启 Claude Code 生效。**
>
> 注意：`/config` 界面切换语言可能不会持久化（已知 Bug），
> 直接写入 `settings.json` + `CLAUDE.md` 是最可靠的方式。
