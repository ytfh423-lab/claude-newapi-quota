---
name: minm
description: 配置 MiniMax Token Plan，设置 API Key 并启用底部状态栏实时显示用量
allowed-tools: [Bash, Read, Edit, MultiEdit, Write]
---

# MiniMax Token Plan 配置向导

引导用户配置 MiniMax API Key，并在底部状态栏实时显示 5h 用量。

## 执行步骤

### 1. 检查现有配置

读取 `~/.claude/settings.json`（Windows: `%USERPROFILE%\.claude\settings.json`）。

检查 `env` 中是否已有 `ANTHROPIC_BASE_URL` 和 `ANTHROPIC_AUTH_TOKEN`：

- **如果已配置且是 MiniMax 平台**（URL 含 `minimaxi.com` 或 `minimax.io`）→ 告知用户已配置，跳到**步骤 4**
- **如果未配置或不是 MiniMax 平台** → 继续步骤 2

### 2. 引导用户获取 API Key

告知用户：

> 请前往 MiniMax 开放平台获取 Token Plan API Key：
> - 国内站: https://platform.minimaxi.com
> - 国际站: https://platform.minimax.io
>
> 步骤：
> 1. 登录后进入 **API Keys** 页面
> 2. 创建 **Token Plan Key**（注意不是普通 API Key）
> 3. 复制 API Key
>
> 请将你的 API Key 粘贴到这里：

等待用户输入 API Key。

然后询问用户使用的是**国内站**还是**国际站**：
- 国内站 → `ANTHROPIC_BASE_URL` = `https://api.minimaxi.com/anthropic`
- 国际站 → `ANTHROPIC_BASE_URL` = `https://api.minimax.io/anthropic`

### 3. 写入环境配置

读取现有 `settings.json`，在 `env` 中添加或更新以下字段（**合并，不覆盖**其他 env 配置）：

```json
{
  "env": {
    "ANTHROPIC_BASE_URL": "<根据用户选择>",
    "ANTHROPIC_AUTH_TOKEN": "<用户输入的 API Key>",
    "ANTHROPIC_MODEL": "MiniMax-M2.7",
    "ANTHROPIC_DEFAULT_HAIKU_MODEL": "MiniMax-M2.5",
    "ANTHROPIC_DEFAULT_SONNET_MODEL": "MiniMax-M2.7",
    "ANTHROPIC_DEFAULT_OPUS_MODEL": "MiniMax-M2.7"
  }
}
```

### 4. 验证连通性

用 curl 测试 Token Plan 用量查询：

**国内站：**
```bash
curl -s -H "Authorization: Bearer <API_KEY>" -H "Content-Type: application/json" "https://www.minimaxi.com/v1/token_plan/remains"
```

**国际站：**
```bash
curl -s -H "Authorization: Bearer <API_KEY>" -H "Content-Type: application/json" "https://www.minimax.io/v1/token_plan/remains"
```

如果返回成功，展示当前剩余额度。如果失败，告知错误原因但**不删除配置**。

### 5. 配置 statusLine（底部实时用量显示）

找到本插件安装路径下的 `bin/minimax-statusline.js`。

**Windows 用：**
```bash
dir /s /b "%USERPROFILE%\.claude\plugins\cache\newapi-quota-marketplace\newapi-quota\*\bin\minimax-statusline.js"
```

**macOS/Linux 用：**
```bash
ls ~/.claude/plugins/cache/newapi-quota-marketplace/newapi-quota/*/bin/minimax-statusline.js
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
  "command": "node C:/Users/xxx/.claude/plugins/cache/newapi-quota-marketplace/newapi-quota/0.1.0/bin/minimax-statusline.js",
  "padding": 0
}
```

### 6. 完成提示

告知用户：
- ✅ MiniMax 配置完成
- **重启 Claude Code** 后底部将实时显示：`[MiniMax] 5h: ███░░░░░░░ 30% (450/1500) | 重置: 2h 15m`

### 安全须知

- **绝不**在对话中回显完整的 API Key，只展示末尾 4 位
- 配置写入本地 `settings.json`，不会上传到任何地方
