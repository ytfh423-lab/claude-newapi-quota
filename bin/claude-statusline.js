#!/usr/bin/env node
/**
 * Claude 官方账户 statusLine 脚本
 * 数据源: Claude Code 通过 stdin 传入的 session JSON 中的 rate_limits
 * 显示格式: [Claude] 5h: ███░░░░░░░ 30% @3:15pm | 7d: ██░░░░░░░░ 12% @Apr 25
 */

import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import https from 'https';

const TIMEOUT_MS = 3000;

function makeBar(percentage, width = 10) {
  const filled = Math.round((percentage / 100) * width);
  return '█'.repeat(filled) + '░'.repeat(width - filled);
}

function formatResetTime(epochOrIso) {
  if (!epochOrIso || epochOrIso === 'null') return '';
  try {
    let dt;
    if (typeof epochOrIso === 'number') {
      dt = new Date(epochOrIso * 1000);
    } else {
      dt = new Date(epochOrIso);
    }
    if (isNaN(dt.getTime())) return '';
    const now = new Date();
    const diffMs = dt.getTime() - now.getTime();
    if (diffMs <= 0) return '已重置';
    const totalMin = Math.ceil(diffMs / 60000);
    const h = Math.floor(totalMin / 60);
    const m = totalMin % 60;
    if (h > 0) return `${h}h${m > 0 ? m + 'm' : ''}`;
    return `${m}m`;
  } catch {
    return '';
  }
}

// 从 stdin 读取 Claude Code 传入的 session JSON
function readStdin() {
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve(null), 500);
    let buf = '';
    process.stdin.setEncoding('utf-8');
    process.stdin.on('readable', () => {
      let chunk;
      while ((chunk = process.stdin.read()) !== null) {
        buf += chunk;
      }
    });
    process.stdin.on('end', () => {
      clearTimeout(timer);
      try { resolve(buf ? JSON.parse(buf) : null); }
      catch { resolve(null); }
    });
    // 如果是 TTY 则无 stdin 数据
    if (process.stdin.isTTY) {
      clearTimeout(timer);
      resolve(null);
    }
  });
}

// OAuth token 查找
function findOAuthToken() {
  const configDir = process.env.CLAUDE_CONFIG_DIR || join(process.env.USERPROFILE || process.env.HOME || '', '.claude');

  // 1. 环境变量
  if (process.env.CLAUDE_CODE_OAUTH_TOKEN) return process.env.CLAUDE_CODE_OAUTH_TOKEN;

  // 2. Windows credentials
  const localAppData = process.env.LOCALAPPDATA;
  if (localAppData) {
    const credPath = join(localAppData, 'Claude Code', 'credentials.json');
    if (existsSync(credPath)) {
      try {
        const creds = JSON.parse(readFileSync(credPath, 'utf-8'));
        const token = creds?.claudeAiOauth?.accessToken;
        if (token && token !== 'null') return token;
      } catch {}
    }
  }

  // 3. .credentials.json
  const credsFile = join(configDir, '.credentials.json');
  if (existsSync(credsFile)) {
    try {
      const creds = JSON.parse(readFileSync(credsFile, 'utf-8'));
      const token = creds?.claudeAiOauth?.accessToken;
      if (token && token !== 'null') return token;
    } catch {}
  }

  return null;
}

// 调用 OAuth API
function fetchUsageApi(token) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('timeout')), TIMEOUT_MS);
    const req = https.request({
      hostname: 'api.anthropic.com',
      port: 443,
      path: '/api/oauth/usage',
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'anthropic-beta': 'oauth-2025-04-20',
        'User-Agent': 'claude-newapi-quota/0.1'
      }
    }, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        clearTimeout(timer);
        if (res.statusCode !== 200) return reject(new Error(`HTTP ${res.statusCode}`));
        try { resolve(JSON.parse(data)); }
        catch { reject(new Error('JSON parse error')); }
      });
    });
    req.on('error', (err) => { clearTimeout(timer); reject(err); });
    req.end();
  });
}

async function main() {
  let fiveHourPct = null;
  let fiveHourReset = null;
  let sevenDayPct = null;
  let sevenDayReset = null;

  // 数据源 1: stdin (Claude Code 内置)
  const stdinData = await readStdin();
  if (stdinData?.rate_limits) {
    const rl = stdinData.rate_limits;
    if (rl.five_hour) {
      fiveHourPct = Math.floor(rl.five_hour.used_percentage ?? rl.five_hour.utilization ?? 0);
      fiveHourReset = rl.five_hour.resets_at;
    }
    if (rl.seven_day) {
      sevenDayPct = Math.floor(rl.seven_day.used_percentage ?? rl.seven_day.utilization ?? 0);
      sevenDayReset = rl.seven_day.resets_at;
    }
  }

  // 数据源 2: OAuth API (如果 stdin 无数据)
  if (fiveHourPct === null && sevenDayPct === null) {
    const token = findOAuthToken();
    if (token) {
      try {
        const usage = await fetchUsageApi(token);
        if (usage.five_hour) {
          fiveHourPct = Math.floor(usage.five_hour.utilization ?? 0);
          fiveHourReset = usage.five_hour.resets_at;
        }
        if (usage.seven_day) {
          sevenDayPct = Math.floor(usage.seven_day.utilization ?? 0);
          sevenDayReset = usage.seven_day.resets_at;
        }
      } catch {}
    }
  }

  // 无数据
  if (fiveHourPct === null && sevenDayPct === null) {
    process.stdout.write('[Claude] 未登录或无用量数据');
    return;
  }

  const bar5h = makeBar(fiveHourPct ?? 0);
  const barWeek = makeBar(sevenDayPct ?? 0);
  const warn5h = (fiveHourPct ?? 0) >= 80 ? '⚠️' : '';
  const warnWeek = (sevenDayPct ?? 0) >= 80 ? '⚠️' : '';

  // 重置时间取 5h 的
  const reset = formatResetTime(fiveHourReset);

  let out = `[Claude] 5h: ${bar5h} ${fiveHourPct ?? 0}%${warn5h} | 周: ${barWeek} ${sevenDayPct ?? 0}%${warnWeek} | 重置: ${reset || '?'}`;

  process.stdout.write(out);
}

main()
  .then(() => process.exit(0))
  .catch(() => {
    process.stdout.write('[Claude] error');
    process.exit(0);
  });
