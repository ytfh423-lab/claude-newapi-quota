---
name: newapi-setup
description: 一键配置 new-api 额度监控（注册命令 + 写入站点 + 开启 statusLine）
allowed-tools: [Bash, Read, Write]
---

帮助用户完成 new-api 额度监控的完整配置。按以下步骤执行：

## 步骤

### 1. 注册全局命令

检查 `cnq` 是否已在 PATH 中：
```bash
cnq --help
```
如果找不到，在**本插件根目录**执行 `npm link`：
```bash
npm link
```

### 2. 引导用户配置站点

询问用户以下信息（不要自己编造）：
- **站点地址**：例 `https://xxx.com`
- **access_token** 或 **API Key (sk-)**
- **用户 ID**（默认 1）

拿到信息后写入配置文件 `~/.claude-newapi-quota/config.json`，格式：
```json
{
  "sites": {
    "default": {
      "base_url": "<用户提供>",
      "auth_type": "access_token",
      "access_token": "<用户提供>",
      "user_id": <用户提供>,
      "quota_per_unit": 500000,
      "currency_symbol": "$"
    }
  },
  "active": "default",
  "cache_ttl_seconds": 30,
  "display": { "low_balance_threshold": 1, "show_used": true, "show_requests": false, "compact": false }
}
```

### 3. 验证连通

```bash
cnq refresh
```

### 4. 开启 statusLine

读取 `~/.claude/settings.json`，如果没有 `statusLine` 字段，追加：
```json
"statusLine": {
  "type": "command",
  "command": "cnq-statusline",
  "padding": 0
}
```
**注意不要覆盖已有配置，只做合并。**

### 5. 告知用户

- 重启 Claude Code 后底部即可看到额度显示
- 对话中可使用 `/quota` 查询
- token 不要在对话中明文贴出，存入配置文件后即可
