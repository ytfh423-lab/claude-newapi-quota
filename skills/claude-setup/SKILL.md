---
name: claude-setup
description: 配置 Claude 官方账户底部状态栏，实时显示 5h/7d 用量
allowed-tools: [Bash, Read, Edit, MultiEdit, Write]
---

# Claude 官方账户用量配置向导

为使用 Claude 官方 API 或 Claude Max/Pro 订阅的用户，启用底部状态栏实时显示 5h/7d 用量。

## 执行步骤

### 1. 检查登录状态

Claude 官方用量显示有两个数据来源：
- **自动方式**：Claude Code 启动时通过 stdin 传入 session JSON，内含 `rate_limits`（无需额外配置）
- **OAuth 方式**：从 `~/.claude/.credentials.json` 或 Windows 的 `%LOCALAPPDATA%\Claude Code\credentials.json` 中读取 OAuth token，调用 `https://api.anthropic.com/api/oauth/usage`

告知用户：
> 如果你已登录 Claude 官方账户（`claude login`），用量数据会自动获取，无需额外配置。
> 只需要设置底部状态栏即可。

### 2. 配置 statusLine

找到本插件安装路径下的 `bin/claude-statusline.js`。

**Windows 用：**
```bash
dir /s /b "%USERPROFILE%\.claude\plugins\cache\newapi-quota-marketplace\newapi-quota\*\bin\claude-statusline.js"
```

**macOS/Linux 用：**
```bash
ls ~/.claude/plugins/cache/newapi-quota-marketplace/newapi-quota/*/bin/claude-statusline.js
```

拿到绝对路径后，将反斜杠 `\` 全部替换为正斜杠 `/`，然后在 `settings.json` 中添加或更新 `statusLine` 字段（**合并，不覆盖**已有配置）：

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
  "command": "node C:/Users/xxx/.claude/plugins/cache/newapi-quota-marketplace/newapi-quota/0.1.0/bin/claude-statusline.js",
  "padding": 0
}
```

### 3. 完成提示

告知用户：
- ✅ 配置完成
- **重启 Claude Code** 后底部将实时显示：`[Claude] 5h: ███░░░░░░░ 30% @2h15m | 7d: ██░░░░░░░░ 12% @Apr 25`
- 用量超 50% 🟡 / 70% 🟠 / 90% 🔴 自动变色预警
- 如未登录，请先执行 `claude login`
