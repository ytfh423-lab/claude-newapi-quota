---
name: think
description: 配置 Opus 4.7 思维链回显（扩展思考 + 思考摘要 + 详细模式）
allowed-tools: [Bash, Read, Edit, MultiEdit, Write]
---

# Opus 4.7 思维链回显配置

一键开启 Claude Opus 4.7 扩展思考（Extended Thinking）的完整显示，包括思维链摘要、详细视图模式等。

## 已知问题

Claude Code 2.1.112 存在 Bug：二进制文件中缺少 `claude-opus-4-7[1m]` 的模型描述符（[Issue #49902](https://github.com/anthropics/claude-code/issues/49902)），导致 Opus 4.7 的思考摘要不渲染。该 Bug 需要官方修复。

本技能预先配置好所有设置，一旦官方修复即可立即生效。

## 执行步骤

### 1. 读取当前配置

读取 `~/.claude/settings.json`（Windows: `%USERPROFILE%\.claude\settings.json`）。

### 2. 配置思维链设置

在 `settings.json` 中**合并**以下字段（不覆盖其他配置）：

```json
"showThinkingSummaries": true,
"alwaysThinkingEnabled": true,
"viewMode": "verbose"
```

各字段含义：
- `showThinkingSummaries` — 显示 AI 思考过程的摘要（折叠展示）
- `alwaysThinkingEnabled` — 始终启用扩展思考，即使模型默认关闭
- `viewMode` — `"verbose"` 显示详细信息包括工具调用和思考内容

### 3. 推理力度

询问用户想要的推理深度：

- **medium** — 平衡速度和质量（默认）
- **high** — 深度思考，适合复杂问题
- **max** — 最大思考预算，适合极复杂任务（更慢更贵）

```json
"effortLevel": "用户选择"
```

### 4. 模型配置（如果用户使用 Claude 官方）

如果用户使用 Claude 官方账户（非第三方中转），建议配置模型：

```json
"model": "claude-opus-4-7"
```

如果用户想强制使用 1M 上下文版本：
```json
"model": "claude-opus-4-7[1m]"
```

> 注意：`[1m]` 版本目前存在 Bug 不显示思考摘要，建议用不带后缀的版本。

### 5. 第三方中转适配

如果用户使用 GLM、DeepSeek 等第三方中转（通过 `ANTHROPIC_BASE_URL`），告知：

> ⚠️ 思维链回显依赖模型本身支持扩展思考（Extended Thinking）。
> 第三方中转模型是否支持取决于具体提供商的 API 实现。
> - **智谱 GLM 4.7**：部分支持思考过程，但格式与 Claude 不同，Claude Code 可能无法正确渲染
> - **DeepSeek R1**：有思考链但输出格式不兼容 Claude Code
> - 只有使用 **Claude 官方 API** 时，思维链回显才能完整工作

### 6. CLAUDE.md 思考指令（可选）

询问用户是否要在 CLAUDE.md 中添加思考指令。如果同意：

检查全局 `CLAUDE.md` 是否已包含 `<!-- think-config -->` 标记，如无则追加：

```markdown

<!-- think-config -->
## 思考规则
- 遇到复杂问题时，先进行深入思考再回答
- 思考过程中列出所有可能的方案并逐一评估
- 对代码修改先分析影响范围再动手
- 调试时先定位根因，不要直接打补丁
```

### 7. 完成提示

展示配置摘要：

> ✅ 思维链配置完成！
>
> | 设置 | 值 |
> |---|---|
> | 思考摘要 | ✅ 开启 |
> | 始终思考 | ✅ 开启 |
> | 详细模式 | ✅ verbose |
> | 推理力度 | high/max |
>
> **重启 Claude Code 生效。**
>
> ⚠️ 如果使用 Opus 4.7[1m]，思考摘要暂不显示（官方 Bug，等待修复）。
> 不带 [1m] 后缀的 `claude-opus-4-7` 可正常显示。
