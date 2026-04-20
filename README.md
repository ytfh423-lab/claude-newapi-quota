# claude-newapi-quota

在 **Claude Code** 终端里实时查看 **new-api / one-api 中转站** 的剩余额度和已用额度。

```
💰 $12.3400 ▸ 已用 $7.6600 [default]
```

- 🔋 **statusLine 常驻**：余额直接显示在 Claude Code CLI 底部，低于阈值自动转黄/红
- ⚡ **本地缓存**：默认 30 秒 TTL，不会每次刷新都打爆中转站
- 🔀 **多站点切换**：一条 `cnq use <name>` 命令在多个中转站间切换
- 🔐 **零外部依赖**：纯 Node（18+ 自带 `fetch`）+ 本地加密存储，token 绝不出本机
- 🧩 **双入口**：statusLine 脚本 + `/quota` slash command 都支持

---

## 工作原理

```
┌──────────────────────────────────────────────────────┐
│  Claude Code CLI                                     │
│  > 对话中 ...                                         │
│  ──────────────────────────────────────────────      │
│  💰 $12.3400 ▸ 已用 $7.6600 [default]  ← statusLine  │
└──────────────┬───────────────────────────────────────┘
               │ 每回合渲染时调用
               ▼
        cnq-statusline (Node)
               │
               │ GET /api/user/self
               ▼
        https://your-newapi.com
               │
               ▼
        { quota, used_quota, request_count, ... }
```

## 安装

```powershell
# 1. 克隆或把源码放到任意位置
git clone <repo> claude-newapi-quota
cd claude-newapi-quota

# 2. 全局链接可执行脚本（Windows/macOS/Linux 均可）
npm link
#   这会把 cnq 和 cnq-statusline 加到 PATH 里
```

> 零运行时依赖，`npm install` 可省（但 `npm link` 仍需执行）。

## 配置

```powershell
cnq setup
```

按提示填写：

| 字段 | 说明 |
|---|---|
| 站点名称 | 起个短名字，如 `default`、`work` |
| 站点地址 | 形如 `https://your-newapi.com`，不带尾斜杠 |
| 认证方式 | 推荐 `access_token`；或用 `sk-xxx` API Key |
| access_token | 在 new-api 面板 → **个人设置 → 生成系统访问令牌** 得到 |
| 用户 ID | 面板 → 个人信息页可见，填错时接口通常也能工作 |
| 额度单位 | 默认 `500000 quota = 1$`，换皮站可能不同 |
| 货币符号 | 默认 `$`，可改成 `¥`、`€` 等 |

完成后会自动测试一次接口联通性。

### 基本命令

```powershell
cnq            # 查看当前激活站点余额（详细报告）
cnq refresh    # 跳过缓存强制刷新
cnq raw        # 输出 JSON，给脚本/管道使用
cnq sites      # 列出所有站点
cnq use work   # 切换激活站点
cnq remove foo # 删除某站点
cnq clear-cache
cnq path       # 打印配置文件路径
cnq help
```

## 接入 Claude Code

### 方式 A：statusLine（推荐，常驻实时显示）

编辑 `~/.claude/settings.json`，合并如下片段：

```json
{
  "statusLine": {
    "type": "command",
    "command": "cnq-statusline",
    "padding": 0
  }
}
```

> Windows 用户如果 `cnq-statusline` 找不到（某些 shell 不读 npm 全局 bin），可写绝对路径：
> `"command": "node D:/path/to/claude-newapi-quota/bin/cnq-statusline.js"`

重启 Claude Code，底部就能看到：

```
💰 $12.3400 ▸ 已用 $7.6600 [default]
```

颜色规则：
- 🟢 绿色：余额充足
- 🟡 黄色：低于 `low_balance_threshold`（默认 `$1`）
- 🔴 红色：余额 ≤ 0

### 方式 B：Slash 命令 `/quota`

复制 `claude-plugin/commands/quota.md` 到你项目或全局的 commands 目录：

```powershell
# 全局（对所有项目生效）
mkdir -Force ~/.claude/commands
Copy-Item claude-plugin/commands/quota.md ~/.claude/commands/quota.md

# 或者单项目生效：复制到 <项目>/.claude/commands/quota.md
```

重启 Claude Code 后，在对话中输入：

```
/quota          # 查看当前余额
/quota refresh  # 强制刷新
```

---

## 配置文件详解

位置：`~/.claude-newapi-quota/config.json`（Windows: `C:\Users\<你>\.claude-newapi-quota\config.json`）

```jsonc
{
  "sites": {
    "default": {
      "base_url": "https://example.com",
      "auth_type": "access_token",       // 或 "api_key"
      "access_token": "xxxxxxxxxxxx",    // 或 sk-xxxx
      "user_id": 1,
      "quota_per_unit": 500000,          // 多少 quota = 1 单位货币
      "currency_symbol": "$"
    }
  },
  "active": "default",
  "cache_ttl_seconds": 30,               // 状态栏节流
  "display": {
    "low_balance_threshold": 1.0,        // 低于这个数值会变黄
    "show_used": true,                   // statusLine 是否展示 "已用"
    "show_requests": false,              // 是否在详情里展示请求次数
    "compact": false
  }
}
```

手改这个文件后，用 `cnq clear-cache` 清除旧缓存即可。

## new-api 接口说明

本插件调用的是 new-api/one-api 面板接口：

```
GET /api/user/self
Headers:
  Authorization: Bearer <access_token 或 sk-xxx>
  New-Api-User: <user_id>   (仅 access_token 模式需要)
```

常见返回字段：

```jsonc
{
  "success": true,
  "data": {
    "id": 1,
    "username": "alice",
    "group": "default",
    "quota": 6170000,        // 剩余 quota
    "used_quota": 3830000,   // 已用 quota
    "request_count": 456
  }
}
```

**额度换算**：new-api 默认 `500000 quota = 1$`（可被站长在站点设置里改），若你所在站点自定义了倍率，调整 `quota_per_unit` 即可。

## 常见问题

**Q: 用 sk- 开头的 API key 能工作吗？**
A: 看站点配置。大多数 new-api 版本允许 `sk-` key 调用 `/api/user/self` 查到其所属用户的**整账户**额度；个别站点禁用了此路径，会报 401，此时只能用 `access_token`。

**Q: statusLine 会拖慢 Claude Code 吗？**
A: 基本不会。缓存命中时是读本地 JSON（< 10ms），缓存失效时才发一次 HTTP，且硬超时 2.5s，整体硬上限 4s 后强制退出返回占位符。

**Q: 可以把 token 放环境变量而不是明文？**
A: 目前未实现，计划支持 `access_token: "$env:NEWAPI_TOKEN"` 语法。欢迎 PR。

**Q: 卸载怎么做？**
A:
```powershell
npm unlink -g claude-newapi-quota
Remove-Item -Recurse ~/.claude-newapi-quota
```
再把 `~/.claude/settings.json` 中的 `statusLine` 字段删掉即可。

**Q: 支持 one-api 吗？**
A: one-api 的 `/api/user/self` 接口与 new-api 大致相同，但不需要 `New-Api-User` 头。目前没针对性测试，如遇问题欢迎反馈。

## 安全

- token 存在本机 `~/.claude-newapi-quota/config.json`（权限 `0600`，仅当前用户可读）
- **永远不会**被发送给 Claude 模型或其他第三方
- statusLine 脚本读 stdin 的 session JSON 但不做任何处理
- 缓存文件只存 API 响应快照（含 username、quota 等），不存 token

## 开发

```powershell
npm test                                # 跑单测
node bin/cnq.js quota                   # 本地调试 CLI
node bin/cnq-statusline.js < NUL        # 本地调试 statusLine
```

## License

MIT
