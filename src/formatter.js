// 输出格式化：颜色、金额换算、告警
const COLORS = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  gray: '\x1b[90m',
};

export function color(str, c, enabled = true) {
  if (!enabled || !c || !COLORS[c]) return String(str);
  return `${COLORS[c]}${str}${COLORS.reset}`;
}

export function quotaToAmount(quota, per = 500000) {
  if (!Number.isFinite(quota)) return 0;
  return quota / (per || 500000);
}

export function fmtMoney(n, symbol = '$', digits = 4) {
  if (!Number.isFinite(n)) n = 0;
  return `${symbol}${n.toFixed(digits)}`;
}

export function chooseBalanceColor(remain, threshold) {
  if (remain <= 0) return 'red';
  if (remain < threshold) return 'yellow';
  return 'green';
}

/**
 * 针对 Claude Code statusLine 的紧凑单行输出
 */
export function formatStatusLine({ remain, used, site, cfg, useColor = true }) {
  const symbol = site.currency_symbol ?? '$';
  const cRemain = chooseBalanceColor(remain, cfg.display.low_balance_threshold);
  const remainStr = color(fmtMoney(remain, symbol), cRemain, useColor);
  let str = `💰 ${remainStr}`;
  if (cfg.display.show_used) {
    str += ` ${color(`▸ 已用 ${fmtMoney(used, symbol)}`, 'gray', useColor)}`;
  }
  const tag = color(`[${cfg.active}]`, 'dim', useColor);
  return `${str} ${tag}`;
}

/**
 * 针对 CLI /quota 的多行详细报告
 */
export function formatReport({ self, site, cfg, siteName, useColor = true }) {
  const per = site.quota_per_unit ?? 500000;
  const symbol = site.currency_symbol ?? '$';
  const remain = quotaToAmount(self.quota ?? 0, per);
  const used = quotaToAmount(self.used_quota ?? 0, per);
  const total = remain + used;
  const cBalance = chooseBalanceColor(remain, cfg.display.low_balance_threshold);

  const lines = [];
  lines.push(color(`━━━━━ ${siteName ?? ''} @ ${site.base_url} ━━━━━`, 'cyan', useColor));
  if (self.username) lines.push(`  👤 用户名      ${color(self.username, 'bold', useColor)}`);
  if (self.id != null) lines.push(`  🆔 用户 ID     ${self.id}`);
  if (self.group) lines.push(`  🏷️  用户分组    ${self.group}`);
  lines.push(`  💰 剩余额度    ${color(fmtMoney(remain, symbol), cBalance, useColor)}`);
  lines.push(`  📊 已用额度    ${fmtMoney(used, symbol)}`);
  lines.push(`  🧮 总计        ${fmtMoney(total, symbol)}`);
  if (self.request_count != null) lines.push(`  🔢 请求次数    ${self.request_count}`);
  if (remain <= 0) {
    lines.push(color(`  ⛔ 额度已用尽！请尽快充值。`, 'red', useColor));
  } else if (remain < cfg.display.low_balance_threshold) {
    lines.push(color(`  ⚠️  余额偏低（< ${fmtMoney(cfg.display.low_balance_threshold, symbol, 2)}），建议充值。`, 'yellow', useColor));
  }
  return lines.join('\n');
}
