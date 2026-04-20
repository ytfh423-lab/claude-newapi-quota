#!/usr/bin/env node
// CLI 主入口
import { loadConfig, saveConfig, getActiveSite, CONFIG_FILE } from '../src/config.js';
import { NewApiClient } from '../src/api.js';
import { formatReport, quotaToAmount, fmtMoney, color } from '../src/formatter.js';
import { readCache, writeCache, clearCache } from '../src/cache.js';
import { runSetup } from '../src/setup.js';

const args = process.argv.slice(2);
const cmd = (args[0] ?? 'quota').toLowerCase();

function printHelp() {
  const useColor = process.stdout.isTTY;
  const h = (s) => color(s, 'cyan', useColor);
  console.log(`${h('claude-newapi-quota')} - 在终端查看 new-api 中转站额度

${h('用法:')}
  cnq [quota]          查看当前激活站点额度（默认）
  cnq setup            交互式添加 / 修改站点
  cnq sites            列出所有已配置站点
  cnq use <name>       切换激活站点
  cnq remove <name>    删除站点
  cnq refresh          跳过缓存强制刷新
  cnq raw              输出 JSON（供脚本/statusLine 调用）
  cnq clear-cache      清除本地缓存
  cnq path             显示配置文件路径
  cnq help             显示本帮助

${h('首次使用:')}
  1. cnq setup                      # 填写站点 / token
  2. cnq                            # 验证效果
  3. 按 README 把 cnq-statusline 接入 Claude Code

${h('配置文件:')} ${CONFIG_FILE}
`);
}

async function getSelf({ bypassCache = false } = {}) {
  const cfg = await loadConfig();
  const site = getActiveSite(cfg);
  if (!site) {
    const err = new Error('未配置任何站点，请先运行: cnq setup');
    err.code = 'NO_SITE';
    throw err;
  }
  const cacheKey = `self:${cfg.active}`;
  let self = bypassCache ? null : await readCache(cacheKey);
  let fromCache = !!self;
  if (!self) {
    const client = new NewApiClient(site);
    self = await client.fetchSelf();
    await writeCache(cacheKey, self, cfg.cache_ttl_seconds);
  }
  return { cfg, site, self, fromCache };
}

async function cmdQuota({ bypassCache = false, raw = false } = {}) {
  const { cfg, site, self, fromCache } = await getSelf({ bypassCache });
  if (raw) {
    const per = site.quota_per_unit ?? 500000;
    process.stdout.write(JSON.stringify({
      site: cfg.active,
      base_url: site.base_url,
      username: self.username ?? null,
      user_id: self.id ?? null,
      group: self.group ?? null,
      remain: quotaToAmount(self.quota ?? 0, per),
      used: quotaToAmount(self.used_quota ?? 0, per),
      request_count: self.request_count ?? null,
      currency: site.currency_symbol ?? '$',
      cached: fromCache,
      fetched_at: new Date().toISOString(),
    }) + '\n');
    return;
  }
  const useColor = process.stdout.isTTY;
  console.log(formatReport({ self, site, cfg, siteName: cfg.active, useColor }));
  if (fromCache) {
    console.log(color(`  (命中缓存，使用 \`cnq refresh\` 强制刷新)`, 'dim', useColor));
  }
}

async function cmdSites() {
  const cfg = await loadConfig();
  const names = Object.keys(cfg.sites);
  if (names.length === 0) {
    console.log('（空）请先运行: cnq setup');
    return;
  }
  const useColor = process.stdout.isTTY;
  for (const name of names) {
    const s = cfg.sites[name];
    const mark = name === cfg.active
      ? color('●', 'green', useColor)
      : color('○', 'dim', useColor);
    const tag = color(`[${s.auth_type}]`, 'dim', useColor);
    console.log(`  ${mark} ${name.padEnd(16)} ${s.base_url}  ${tag}`);
  }
}

async function cmdUse(name) {
  if (!name) throw new Error('用法: cnq use <name>');
  const cfg = await loadConfig();
  if (!cfg.sites[name]) throw new Error(`站点不存在: ${name}`);
  cfg.active = name;
  await saveConfig(cfg);
  console.log(`✅ 已切换到: ${name}`);
}

async function cmdRemove(name) {
  if (!name) throw new Error('用法: cnq remove <name>');
  const cfg = await loadConfig();
  if (!cfg.sites[name]) throw new Error(`站点不存在: ${name}`);
  delete cfg.sites[name];
  if (cfg.active === name) cfg.active = Object.keys(cfg.sites)[0] ?? null;
  await saveConfig(cfg);
  console.log(`🗑️  已删除: ${name}`);
}

async function cmdPath() {
  console.log(CONFIG_FILE);
}

async function cmdClearCache() {
  await clearCache();
  console.log('🧹 缓存已清除');
}

async function main() {
  switch (cmd) {
    case 'quota': case '': await cmdQuota(); break;
    case 'refresh': await cmdQuota({ bypassCache: true }); break;
    case 'raw': await cmdQuota({ raw: true }); break;
    case 'setup': case 'init': case 'add': await runSetup(); break;
    case 'sites': case 'ls': case 'list': await cmdSites(); break;
    case 'use': case 'switch': await cmdUse(args[1]); break;
    case 'remove': case 'rm': case 'delete': await cmdRemove(args[1]); break;
    case 'clear-cache': await cmdClearCache(); break;
    case 'path': await cmdPath(); break;
    case 'help': case '-h': case '--help': printHelp(); break;
    default:
      console.error(`未知命令: ${cmd}\n`);
      printHelp();
      process.exit(2);
  }
}

main().catch((err) => {
  const msg = err?.message ?? String(err);
  console.error(`❌ ${msg}`);
  if (err?.code === 'NO_SITE') process.exit(2);
  process.exit(1);
});
