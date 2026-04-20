#!/usr/bin/env node
/**
 * GLM Coding Plan statusLine 脚本
 * 显示格式: [GLM-Lite] 5h: ███░░░░░░░ 30% | 周: ██░░░░░░░ 5% | 重置: 2h 15m
 */

import https from 'https';

const TIMEOUT_MS = 3000;

const baseUrl = process.env.ANTHROPIC_BASE_URL || '';
const authToken = process.env.ANTHROPIC_AUTH_TOKEN || '';

if (!authToken || !baseUrl) {
  process.stdout.write('📊 GLM 未配置');
  process.exit(0);
}

if (!baseUrl.includes('open.bigmodel.cn') && !baseUrl.includes('dev.bigmodel.cn') && !baseUrl.includes('api.z.ai')) {
  process.stdout.write('📊 非GLM平台');
  process.exit(0);
}

const parsedBaseUrl = new URL(baseUrl);
const baseDomain = `${parsedBaseUrl.protocol}//${parsedBaseUrl.host}`;
const quotaLimitUrl = `${baseDomain}/api/monitor/usage/quota/limit`;

function makeBar(percentage, width = 10) {
  const filled = Math.round((percentage / 100) * width);
  return '█'.repeat(filled) + '░'.repeat(width - filled);
}

function calcReset() {
  // 5h 滚动窗口：估算距下一个整点重置的时间
  const now = new Date();
  const mins = now.getMinutes();
  const secsLeft = 60 - now.getSeconds();
  // 5h 窗口每小时滚动，最近的刷新在下一个整点
  const h = 0;
  const m = 60 - mins;
  if (m === 60) return '0m';
  return `${m}m`;
}

function request(url) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const timer = setTimeout(() => reject(new Error('timeout')), TIMEOUT_MS);
    const req = https.request({
      hostname: parsed.hostname,
      port: 443,
      path: parsed.pathname,
      method: 'GET',
      headers: {
        'Authorization': authToken,
        'Accept-Language': 'zh-CN,zh',
        'Content-Type': 'application/json'
      }
    }, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        clearTimeout(timer);
        if (res.statusCode !== 200) return reject(new Error(`HTTP ${res.statusCode}`));
        try {
          const json = JSON.parse(data);
          resolve(json.data || json);
        } catch {
          reject(new Error('JSON parse error'));
        }
      });
    });
    req.on('error', (err) => { clearTimeout(timer); reject(err); });
    req.end();
  });
}

async function main() {
  try {
    const data = await request(quotaLimitUrl);
    const limits = data.limits || [];
    const level = data.level || 'unknown';

    // 套餐名称映射
    const levelMap = { lite: 'Lite', pro: 'Pro', team: 'Team', enterprise: 'Enterprise' };
    const planName = levelMap[level] || level;

    // 解析限额：通常有两个 TOKENS_LIMIT（5h 和 周）和一个 TIME_LIMIT（MCP）
    let pct5h = 0;
    let pctWeek = 0;
    const tokenLimits = limits.filter(l => l.type === 'TOKENS_LIMIT');
    if (tokenLimits.length >= 2) {
      pct5h = tokenLimits[0].percentage || 0;
      pctWeek = tokenLimits[1].percentage || 0;
    } else if (tokenLimits.length === 1) {
      pct5h = tokenLimits[0].percentage || 0;
    }

    const bar5h = makeBar(pct5h);
    const barWeek = makeBar(pctWeek);
    const reset = calcReset();

    // 颜色标记
    const warn5h = pct5h >= 80 ? '⚠️' : '';
    const warnWeek = pctWeek >= 80 ? '⚠️' : '';

    const line = `[GLM-${planName}] 5h: ${bar5h} ${pct5h}%${warn5h} | 周: ${barWeek} ${pctWeek}%${warnWeek} | 刷新: ${reset}`;
    process.stdout.write(line);
  } catch (err) {
    process.stdout.write(`📊 GLM — ${(err.message || 'error').slice(0, 30)}`);
  }
}

main().then(() => process.exit(0)).catch(() => process.exit(0));
