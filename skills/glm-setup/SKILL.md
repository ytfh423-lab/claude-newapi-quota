---
name: glm-setup
description: 配置智谱 GLM Coding Plan，设置 API Key 并启用底部状态栏实时显示用量
allowed-tools: [Bash, Read, Edit, MultiEdit, Write]
---

# GLM Coding Plan 配置向导

引导用户配置智谱 GLM API Key，并在底部状态栏实时显示 5h/周用量。

## 执行步骤

### 1. 检查现有配置

读取 `~/.claude/settings.json`（Windows: `%USERPROFILE%\.claude\settings.json`）。

检查 `env` 中是否已有 `ANTHROPIC_BASE_URL` 和 `ANTHROPIC_AUTH_TOKEN`：

- **如果已配置且是智谱平台**（URL 含 `open.bigmodel.cn`）→ 告知用户已配置，跳到**步骤 4**
- **如果未配置或不是智谱平台** → 继续步骤 2

### 2. 引导用户获取 API Key

告知用户：

> 请前往 [智谱 AI 开放平台](https://open.bigmodel.cn) 获取 API Key：
> 1. 登录后进入 **API Keys** 页面
> 2. 创建或复制一个 API Key
>
> 请将你的 API Key 粘贴到这里：

等待用户输入 API Key。

### 3. 写入环境配置

读取现有 `settings.json`，在 `env` 中添加或更新以下字段（**合并，不覆盖**其他 env 配置）：

```json
{
  "env": {
    "ANTHROPIC_BASE_URL": "https://open.bigmodel.cn/api/anthropic",
    "ANTHROPIC_AUTH_TOKEN": "<用户输入的 API Key>",
    "ANTHROPIC_MODEL": "glm-4.7",
    "ANTHROPIC_DEFAULT_HAIKU_MODEL": "glm-4.7",
    "ANTHROPIC_DEFAULT_SONNET_MODEL": "glm-4.7",
    "ANTHROPIC_DEFAULT_OPUS_MODEL": "glm-4.7",
    "ANTHROPIC_REASONING_MODEL": "glm-4.7"
  }
}
```

### 4. 验证连通性

用 curl 测试 API 是否可用：

```bash
curl -s -H "Authorization: <API_KEY>" "https://open.bigmodel.cn/api/monitor/usage/quota/limit"
```

如果返回包含 `limits` 字段，告知用户连接成功并展示当前套餐等级和用量百分比。
如果失败，告知错误原因但**不删除配置**。

### 5. 配置 statusLine（底部实时用量显示）

找到本插件安装路径下的 `bin/glm-statusline.js`。

**Windows 用：**
```bash
dir /s /b "%USERPROFILE%\.claude\plugins\cache\newapi-quota-marketplace\newapi-quota\*\bin\glm-statusline.js"
```

**macOS/Linux 用：**
```bash
ls ~/.claude/plugins/cache/newapi-quota-marketplace/newapi-quota/*/bin/glm-statusline.js
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
  "command": "node C:/Users/xxx/.claude/plugins/cache/newapi-quota-marketplace/newapi-quota/0.1.0/bin/glm-statusline.js",
  "padding": 0
}
```

### 6. 完成提示

告知用户：
- ✅ GLM 配置完成
- 使用 `/glm-usage` 查看详细用量
- **重启 Claude Code** 后底部将实时显示：`[GLM-Lite] 5h: ███░░░░░░░ 30% | 周: ██░░░░░░░ 5%`

### 安全须知

- **绝不**在对话中回显完整的 API Key，只展示末尾 4 位
- 配置写入本地 `settings.json`，不会上传到任何地方
