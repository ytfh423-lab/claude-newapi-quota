---
name: ui
description: 美化 Claude Code CLI 界面，启用带颜色的综合信息状态栏
allowed-tools: [Bash, Read, Edit, MultiEdit, Write]
---

# Claude Code CLI 美化配置

为 Claude Code 终端启用美化状态栏，在底部实时显示彩色综合信息。

## 效果预览

状态栏将显示（带 ANSI 彩色）：

```
Sonnet 4.6 | myproject@main (+12 -3) | 45k/200k (22%) | effort: high | 5h 30% | 7d 12%
```

包含信息：
- **模型名** — 蓝色高亮
- **项目目录@Git 分支** — 青色目录 + 绿色分支 + 改动统计（+增 -删）
- **上下文窗口** — 已用/总计 token，百分比按用量变色（绿→黄→橙→红）
- **Effort 等级** — low(暗) / med(橙) / high(绿) / max(红)
- **5h / 7d 用量** — 百分比 + 重置倒计时（仅 Claude 官方账户有此数据）

## 执行步骤

### 1. 找到脚本路径

**Windows 用：**
```bash
dir /s /b "%USERPROFILE%\.claude\plugins\cache\newapi-quota-marketplace\newapi-quota\*\bin\ui-statusline.js"
```

**macOS/Linux 用：**
```bash
ls ~/.claude/plugins/cache/newapi-quota-marketplace/newapi-quota/*/bin/ui-statusline.js
```

### 2. 配置 statusLine

拿到绝对路径后，将反斜杠 `\` 全部替换为正斜杠 `/`。

读取 `~/.claude/settings.json`（Windows: `%USERPROFILE%\.claude\settings.json`），添加或更新 `statusLine` 字段（**合并，不覆盖**其他配置）：

```json
"statusLine": {
  "type": "command",
  "command": "node <绝对路径，用正斜杠>",
  "padding": 0
}
```

示例（Windows）：
```json
"statusLine": {
  "type": "command",
  "command": "node C:/Users/xxx/.claude/plugins/cache/newapi-quota-marketplace/newapi-quota/0.1.0/bin/ui-statusline.js",
  "padding": 0
}
```

### 3. 完成提示

告知用户：
- ✅ 美化配置完成
- **重启 Claude Code** 后底部将显示彩色综合信息栏
- 颜色规则：用量 < 50% 🟢 / ≥ 50% 🟡 / ≥ 70% 🟠 / ≥ 90% 🔴

### 注意

- 此状态栏会**替换**之前的 GLM/Claude/MiniMax/new-api 状态栏（因为 Claude Code 只支持一个 statusLine）
- 如果用户之前配置了其他状态栏，提醒用户此操作会替换它
- 5h/7d 用量数据仅在使用 **Claude 官方账户** 时可用；使用第三方中转时该区域不显示
- 如果用户希望恢复之前的平台专用状态栏，可重新运行 `/GLM`、`/cc`、`/minm` 或 `/new`
