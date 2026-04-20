# Claude Code 多平台用量监控插件

在 **Claude Code** 底部状态栏实时显示 API 用量，支持多平台。

```
[GLM-Lite] 5h: ██░░░░░░░░ 17% | 周: █░░░░░░░░░ 5% | 重置: 1h 48m
[Claude]   5h: ███░░░░░░░ 30% | 周: ██░░░░░░░░ 12% | 重置: 2h 15m
[MiniMax]  5h: ███░░░░░░░ 30% (450/1500) | 重置: 2h 15m
💰 $12.34 ▸ 已用 $7.66 [default]
```

## 支持平台

| 平台 | 配置命令 | 状态栏 | 说明 |
|---|---|---|---|
| 智谱 GLM | `/GLM` | 5h + 周用量 + 重置倒计时 | Coding Plan 用户 |
| Claude 官方 | `/cc` | 5h + 7d 用量 + 重置倒计时 | Max/Pro/API 用户 |
| MiniMax | `/minm` | 5h 用量 + 剩余次数 | Token Plan 用户 |
| new-api 中转站 | `/new` | 余额 + 已用额度 | new-api/one-api 中转站 |
| **UI 美化** | `/ui` | 模型 + Git + 上下文 + Effort + 用量 | 彩色综合信息栏 |

## 安装

在 Claude Code 中执行：

```
/plugin marketplace add ytfh423-lab/newapi-quota-marketplace
/plugin install newapi-quota@newapi-quota-marketplace
```

## 使用

安装后输入对应平台的配置命令，AI 会引导你完成设置：

### 智谱 GLM 用户
```
/GLM
```
> 自动配置 `ANTHROPIC_BASE_URL`、`ANTHROPIC_AUTH_TOKEN`，启用底部状态栏。

### Claude 官方用户
```
/cc
```
> 自动从 Claude Code 登录凭证读取用量数据，只需配置状态栏。

### MiniMax 用户
```
/minm
```
> 引导输入 Token Plan API Key，配置环境变量和状态栏。

### new-api / one-api 中转站用户
```
/new
```
> 引导选择预置公益站点或手动输入，配置认证令牌和状态栏。

### CLI 美化（推荐）
```
/ui
```
> 启用彩色综合信息状态栏，显示模型名、Git 分支、上下文用量、Effort 等级、5h/7d 限额。

## 状态栏效果

### 平台专用状态栏
```
[GLM-Lite] 5h: ██░░░░░░░░ 17% | 周: █░░░░░░░░░ 5% | 重置: 1h 48m
```

- **5h** — 5 小时滚动窗口用量百分比
- **周** — 7 天周期用量百分比
- **重置** — 最早一笔用量滑出 5h 窗口的倒计时
- 用量超 **80%** 显示 ⚠️ 警告

### 美化综合状态栏（`/ui`）
```
Sonnet 4.6 | myproject@main (+12 -3) | 45k/200k (22%) | effort: high | 5h 30% | 7d 12%
```

- **模型名** — 蓝色高亮
- **目录@分支** — 青色目录 + 绿色分支 + 红绿改动数
- **上下文窗口** — token 用量百分比，按量变色（🟢 → 🟡 → 🟠 → 🔴）
- **Effort** — 当前推理力度等级
- **5h / 7d** — Claude 官方用量（第三方中转不显示）

## 工作原理

- **GLM**：调用 `open.bigmodel.cn/api/monitor/usage/quota/limit` + `model-usage`，用 `ANTHROPIC_AUTH_TOKEN` 认证
- **Claude**：读取 Claude Code stdin 内置的 `rate_limits`，备选 OAuth API (`api.anthropic.com/api/oauth/usage`)
- **MiniMax**：调用 `minimaxi.com/v1/token_plan/remains`，用 `Bearer <API Key>` 认证
- **new-api**：调用 `/api/user/self`，用 `access_token` + `New-Api-User` 头认证

所有查询均在本地执行，token 不会发送给 AI 模型。

## 卸载

在 Claude Code 中：
```
/plugin uninstall newapi-quota@newapi-quota-marketplace
```

手动清理（可选）：
```powershell
Remove-Item -Recurse ~/.claude-newapi-quota   # new-api 配置文件
```
删除 `~/.claude/settings.json` 中的 `statusLine` 字段。

## 安全

- Token 仅存储在本地配置文件，**绝不**发送给 AI 模型或第三方
- 状态栏脚本零外部依赖，纯 Node.js 18+ 原生 `fetch`/`https`
- 配置命令中 AI 只展示 token 末尾 4 位

## 致谢

感谢 [LinuxDo 社区](https://linux.do) 为本项目提供支持。

## License

MIT
