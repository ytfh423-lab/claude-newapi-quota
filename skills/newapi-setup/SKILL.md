---
name: newapi-setup
description: 配置 new-api 中转站信息（站点地址、认证令牌等）
allowed-tools: [Bash, Read, Write]
---

引导用户完成 new-api 额度查询的首次配置。**不依赖任何外部 CLI 工具。**

## 步骤

### 1. 检查是否已配置

读取配置文件：
- **Windows**: `%USERPROFILE%\.claude-newapi-quota\config.json`
- **macOS/Linux**: `~/.claude-newapi-quota/config.json`

如果已存在且内容完整，告知用户当前配置的站点，并询问是要**修改**还是**新增**站点。

### 2. 选择站点

首先展示**预置公益站点列表**，让用户选择序号（可多选）或手动输入：

```
请选择站点（输入序号，或输入自定义地址）：

  1. 42公益站         https://api.42w.shop
  2. 6655翻译小站     https://translate-api.6655.pp.ua
  3. 霸气公益平台     https://ai.121628.xyz
  4. 薄荷API          https://x666.me
  5. 冰の公益站       https://icoe.pp.ua
  6. newapi.kl        https://newapi.kl.edu.kg
  7. 呆瓜API          https://api.daigua.icu
  8. WONG公益站        https://wzw.pp.ua

  0. 手动输入自定义站点地址
```

用户选择后，用对应的名称和地址自动填入。如果选 `0`，让用户手动输入站点地址和名称。

### 3. 收集认证信息

依次**逐个**询问用户（不要一次性全问）：

1. **认证方式** — 二选一：
   - `access_token`（推荐，面板 → 安全设置 → 系统访问令牌）
   - `api_key`（sk- 开头的 API Key）
2. **令牌值** — access_token 或 API Key（必填）
3. **用户 ID** — 仅 access_token 模式需要，默认 `1`（面板个人信息页可见）

### 4. 写入配置

创建目录（如不存在）并写入 JSON 配置：

```json
{
  "sites": {
    "<站点名称>": {
      "base_url": "<用户提供>",
      "auth_type": "<access_token 或 api_key>",
      "access_token": "<令牌值>",
      "user_id": <用户ID或null>,
      "quota_per_unit": 500000,
      "currency_symbol": "$"
    }
  },
  "active": "<站点名称>",
  "cache_ttl_seconds": 30,
  "display": {
    "low_balance_threshold": 1,
    "show_used": true,
    "show_requests": false,
    "compact": false
  }
}
```

如果已有配置，**合并新站点到 `sites` 中**，不覆盖已有站点（除非用户明确要修改）。

### 5. 验证连通

用 curl 测试：
```bash
curl -s -H "Authorization: Bearer <token>" -H "New-Api-User: <user_id>" "<base_url>/api/user/self"
```

如果返回包含 `quota` 字段，告知用户连接成功并展示当前余额。
如果失败，告知错误原因但**不删除配置**，让用户可以用 `/newapi-setup` 重新修改。

### 6. 配置 statusLine（底部实时额度显示）

读取 `~/.claude/settings.json`（Windows 为 `%USERPROFILE%\.claude\settings.json`）。

找到本插件的安装路径。插件文件一般位于：
```
~/.claude/plugins/cache/newapi-quota-marketplace/newapi-quota/<version>/bin/cnq-statusline.js
```

用 Bash 确定确切路径：
```bash
ls ~/.claude/plugins/cache/newapi-quota-marketplace/newapi-quota/*/bin/cnq-statusline.js
```

然后在 `settings.json` 中添加或更新 `statusLine` 字段（**合并，不覆盖**已有配置）：
```json
"statusLine": {
  "type": "command",
  "command": "node <找到的cnq-statusline.js绝对路径>",
  "padding": 0
}
```

### 7. 完成提示

告知用户：
- ✅ 配置完成
- 使用 `/newapi` 随时查询额度
- 使用 `/newapi-setup` 修改配置或添加新站点
- **重启 Claude Code** 后底部将实时显示余额

### 安全须知

- **绝不**在对话中回显完整的 token，只展示末尾 4 位
- 配置文件存在用户本地，不会上传到任何地方
