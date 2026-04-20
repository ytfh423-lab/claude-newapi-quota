---
name: glm-usage
description: 查询 GLM Coding Plan 的 5 小时 Token 用量、周用量和配额限制
allowed-tools: [Bash, Read]
---

查询智谱 GLM Coding Plan 的用量信息，包括 5 小时 Token 限额、模型调用统计等。

## 执行步骤

### 1. 检查环境

确认以下环境变量已设置（从 Claude Code 的 settings.json 中的 `env` 读取）：
- `ANTHROPIC_BASE_URL` — 必须包含 `open.bigmodel.cn` 或 `api.z.ai`
- `ANTHROPIC_AUTH_TOKEN` — 智谱平台的认证令牌

如果 `ANTHROPIC_BASE_URL` 不是智谱平台，告知用户：
> 当前未使用智谱 GLM 平台，此命令仅适用于 GLM Coding Plan 用户。

### 2. 执行查询脚本

找到本插件安装路径下的脚本：

**Windows:**
```bash
dir /s /b "%USERPROFILE%\.claude\plugins\cache\newapi-quota-marketplace\newapi-quota\*\skills\glm-usage\scripts\query-glm-usage.mjs"
```

**macOS/Linux:**
```bash
ls ~/.claude/plugins/cache/newapi-quota-marketplace/newapi-quota/*/skills/glm-usage/scripts/query-glm-usage.mjs
```

然后执行：
```bash
node <找到的脚本绝对路径>
```

### 3. 格式化输出

将脚本返回的 JSON 数据格式化展示：

**配额限制：**
```
📊 GLM Coding Plan 用量
┌──────────────────┬──────────┐
│ Token用量(5小时) │ xx.x%    │
│ MCP用量(月)      │ xx.x%    │
└──────────────────┴──────────┘
```

**模型用量（24小时内）：**
- 列出每个模型的调用次数和 Token 消耗

**工具用量（24小时内）：**
- 列出工具调用统计

如果 Token 5小时用量超过 **80%**，追加 ⚠️ **接近限额** 警告。

### 4. 注意

- 只执行一次查询，不要重试
- 如果查询失败，展示错误信息即可
