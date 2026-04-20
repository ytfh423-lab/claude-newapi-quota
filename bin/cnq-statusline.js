#!/usr/bin/env node
// Claude Code statusLine 专用入口
//   - 接收 stdin 的 session JSON（可忽略），返回一行字符串
//   - 必须快：强依赖缓存，网络失败降级为占位符
//   - 绝不以非零退出，避免弄坏状态栏

import { loadConfig, getActiveSite } from '../src/config.js';
import { NewApiClient } from '../src/api.js';
import { readCache, writeCache } from '../src/cache.js';
import { formatStatusLine, quotaToAmount } from '../src/formatter.js';

// 给脚本整体一个硬上限，防止偶发卡死阻塞状态栏
const HARD_TIMEOUT_MS = 4000;

// stdin 不做任何处理 —— Claude Code 通过 stdin 发 session info
// 但我们不依赖它，且在 Windows 上操作 stdin + process.exit 会导致 libuv 断言错误

async function buildLine() {
  const cfg = await loadConfig();
  const site = getActiveSite(cfg);
  if (!site) return '💰 未配置  (运行: cnq setup)';

  const cacheKey = `self:${cfg.active}`;
  let self = await readCache(cacheKey);
  if (!self) {
    try {
      const client = new NewApiClient({ ...site, timeout_ms: 2500 });
      self = await client.fetchSelf();
      await writeCache(cacheKey, self, cfg.cache_ttl_seconds);
    } catch (err) {
      const tip = (err?.message ?? 'error').split('\n')[0].slice(0, 40);
      return `💰 — ${tip}`;
    }
  }
  const per = site.quota_per_unit ?? 500000;
  const remain = quotaToAmount(self.quota ?? 0, per);
  const used = quotaToAmount(self.used_quota ?? 0, per);
  return formatStatusLine({ remain, used, site, cfg, useColor: true });
}

async function main() {
  const timeout = new Promise((resolve) => setTimeout(
    () => resolve('💰 — (timeout)'),
    HARD_TIMEOUT_MS,
  ));

  const line = await Promise.race([
    buildLine().catch((e) => `💰 — ${(e?.message ?? 'error').slice(0, 40)}`),
    timeout,
  ]);
  process.stdout.write(line + '\n', () => {
    process.exit(0);
  });
}

main().catch(() => process.exit(0));
