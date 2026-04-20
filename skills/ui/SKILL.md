---
name: ui
description: 一键美化 Claude Code CLI 整体界面（主题、状态栏、显示风格、动效、全屏等）
allowed-tools: [Bash, Read, Edit, MultiEdit, Write]
---

# Claude Code CLI 全面美化向导

引导用户一步步配置 Claude Code 的整体视觉体验，包括主题、状态栏、输出样式、动效等。

## 执行步骤

### 1. 读取现有配置

读取 `~/.claude/settings.json`（Windows: `%USERPROFILE%\.claude\settings.json`），了解当前已有的配置项。

### 2. 主题选择

让用户从以下主题中选一个（Claude Code 内置 `/theme` 命令也可以切换）：

- **dark** — 深色主题（默认）
- **light** — 浅色主题
- **dark-high-contrast** — 高对比深色
- **light-high-contrast** — 高对比浅色

在 `settings.json` 中写入：
```json
"theme": "用户选择的主题"
```

### 3. 彩色综合状态栏

找到插件安装路径下的 `bin/ui-statusline.js`：

**Windows:**
```bash
dir /s /b "%USERPROFILE%\.claude\plugins\cache\newapi-quota-marketplace\newapi-quota\*\bin\ui-statusline.js"
```

**macOS/Linux:**
```bash
ls ~/.claude/plugins/cache/newapi-quota-marketplace/newapi-quota/*/bin/ui-statusline.js
```

拿到绝对路径后，反斜杠 `\` 全部替换为正斜杠 `/`，写入 `settings.json`：
```json
"statusLine": {
  "type": "command",
  "command": "node <绝对路径>",
  "padding": 0
}
```

效果：
```
Sonnet 4.6 | myproject@main (+12 -3) | 45k/200k (22%) | effort: high | 5h 30% | 7d 12%
```

### 4. 显示增强

依次询问用户每项偏好，然后写入 `settings.json`（**合并不覆盖**）：

#### 4a. 显示思考摘要
> 开启后 AI 思考时会显示摘要，让你知道它在想什么

```json
"showThinkingSummaries": true
```

#### 4b. 显示回合耗时
> 每次 AI 回复后显示该回合用了多久

```json
"showTurnDuration": true
```

#### 4c. 终端进度条
> 在终端标题栏显示任务进度

```json
"terminalProgressBarEnabled": true
```

#### 4d. 加载动画提示语
> 自定义 AI 思考时底部显示的加载动词，增加趣味

```json
"spinnerTipsEnabled": true,
"spinnerVerbs": {"mode": "replace", "verbs": ["思考中", "分析中", "推理中", "搜索中", "编码中", "优化中", "审视中", "构思中"]}
```

如果用户想自定义加载小贴士：
```json
"spinnerTipsOverride": ["喝杯咖啡吧 ☕", "AI 正在努力工作...", "稍等，马上好"]
```

#### 4e. 推理力度
> 控制 AI 的思考深度

询问用户偏好：
- **low** — 快速响应，简单任务
- **medium** — 平衡（默认）
- **high** — 深度思考，复杂任务

```json
"effortLevel": "用户选择"
```

### 5. 全屏模式提示

告知用户 Claude Code 支持全屏 TUI 模式，可减少闪烁并提升体验：
```
/tui fullscreen
```
退出全屏：`/tui compact`

### 6. 终端优化建议

根据用户的终端环境给出建议：

**Windows Terminal 用户：**
- 推荐安装 Nerd Font（如 `FiraCode Nerd Font`、`JetBrainsMono Nerd Font`）以获得图标支持
- 设置 → 外观 → 开启亚克力效果增加视觉质感
- 建议在 Windows Terminal Settings JSON 中设置：
  ```json
  { "profiles": { "defaults": { "font": { "face": "JetBrainsMono Nerd Font", "size": 13 }, "opacity": 95, "useAcrylic": true } } }
  ```

**Shift+Enter 换行：**
- 提示用户可运行 `/terminal-setup` 配置 Shift+Enter 换行

### 7. 最终确认

将所有选择一次性写入 `settings.json`（合并不覆盖已有配置）。

展示最终配置摘要，例如：

> ✅ 美化配置完成！
> - 主题: dark
> - 状态栏: 彩色综合信息栏（模型+Git+上下文+Effort+用量）
> - 思考摘要: ✅ 开启
> - 回合耗时: ✅ 开启
> - 进度条: ✅ 开启
> - 加载动画: 自定义中文动词
> - 推理力度: high
>
> **重启 Claude Code 生效。**
> 提示：可用 `/tui fullscreen` 进入全屏获得最佳体验。

### 注意

- 状态栏会**替换**之前的平台专用状态栏（GLM/Claude/MiniMax/new-api），因 Claude Code 只支持一个 statusLine
- 如果用户希望恢复平台专用状态栏，可重新运行 `/GLM`、`/cc`、`/minm` 或 `/new`
- 所有配置均可在 `settings.json` 中手动修改或恢复
