---
name: newapi
description: 查询 new-api / one-api 中转站的剩余额度和已用额度
argument-hint: "[站点名称]"
allowed-tools: [Bash, Read, Write, WebFetch]
---

查询 new-api 中转站额度，**无需任何外部 CLI 工具**。

## 执行步骤

### 1. 读取配置

读取配置文件（注意路径中的 `~` 要展开为用户主目录）：

- **Windows**: `%USERPROFILE%\.claude-newapi-quota\config.json`
- **macOS/Linux**: `~/.claude-newapi-quota/config.json`

如果配置文件**不存在**，告知用户：
> 尚未配置站点。请使用 `/newapi-setup` 进行首次配置。

然后**停止执行**。

### 2. 解析配置

配置格式：
```json
{
  "sites": {
    "default": {
      "base_url": "https://xxx.com",
      "auth_type": "access_token",
      "access_token": "your-token",
      "user_id": 1,
      "quota_per_unit": 500000,
      "currency_symbol": "$"
    }
  },
  "active": "default"
}
```

- 如果用户传了参数，把参数当作站点名称查找 `sites[参数]`
- 否则使用 `sites[active]` 对应的站点

### 3. 调用 API 查询额度

根据 `auth_type` 构造 HTTP 请求：

```bash
curl -s -H "Authorization: Bearer <token>" -H "New-Api-User: <user_id>" "<base_url>/api/user/self"
```

请求头：`Authorization: Bearer <access_token>` 和 `New-Api-User: <user_id>`

### 4. 格式化输出

API 返回的 `data` 中包含：
- `quota`: 总额度（原始值）
- `used_quota`: 已用额度（原始值）
- `request_count`: 请求次数

换算公式：`金额 = 原始值 / quota_per_unit`

**输出格式**（使用表格，清晰易读）：

```
📊 站点名称 (base_url)
┌──────────┬──────────────┐
│ 总额度   │ $xx.xxxx     │
│ 已使用   │ $xx.xxxx     │
│ 剩余     │ $xx.xxxx     │
│ 请求次数 │ xxxx 次      │
│ 使用率   │ xx.x%        │
└──────────┴──────────────┘
```

- 剩余 = 总额度 - 已使用
- 使用率 = 已使用 / 总额度 × 100%
- 如果剩余低于 `$1`，追加 ⚠️ **余额不足** 警告

### 5. 安全提醒

**绝不**在输出中暴露 `access_token` 或 `api_key` 的完整值。如需显示，只展示末尾 4 个字符。
