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
const modelUsageUrl = `${baseDomain}/api/monitor/usage/model-usage`;

function makeBar(percentage, width = 10) {
  const filled = Math.round((percentage / 100) * width);
  return '█'.repeat(filled) + '░'.repeat(width - filled);
}

function calcReset(xTime, tokensUsage) {
  // 5h 滚动窗口：找到窗口内最早有用量的小时，计算它何时滑出窗口
  if (!xTime || !tokensUsage || xTime.length === 0) return '?';

  const now = new Date();
  const windowMs = 5 * 60 * 60 * 1000; // 5 小时

  // xTime 格式: "2026-04-20 14:00"，找 5h 窗口内最早的非零用量
  for (let i = 0; i < xTime.length; i++) {
    if ((tokensUsage[i] || 0) === 0) continue;
    const t = new Date(xTime[i].replace(' ', 'T') + ':00');
    const dropTime = new Date(t.getTime() + windowMs); // 这笔用量会在 t+5h 时滑出
    const diffMs = dropTime.getTime() - now.getTime();
    if (diffMs <= 0) continue; // 已经滑出了
    const totalMin = Math.ceil(diffMs / 60000);
    const h = Math.floor(totalMin / 60);
    const m = totalMin % 60;
    if (h > 0) return `${h}h${m > 0 ? ' ' + m + 'm' : ''}`;
    return `${m}m`;
  }
  return '0m';
}

function request(url, queryParams = '') {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const timer = setTimeout(() => reject(new Error('timeout')), TIMEOUT_MS);
    const req = https.request({
      hostname: parsed.hostname,
      port: 443,
      path: parsed.pathname + queryParams,
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
    // 并行请求配额限制和模型用量
    const now = new Date();
    const start = new Date(now.getTime() - 6 * 60 * 60 * 1000); // 6h 前（多取 1h 余量）
    const fmt = (d) => {
      const pad = (n) => String(n).padStart(2, '0');
      return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:00:00`;
    };
    const qp = `?startTime=${encodeURIComponent(fmt(start))}&endTime=${encodeURIComponent(fmt(now))}`;

    const [quotaData, usageData] = await Promise.all([
      request(quotaLimitUrl),
      request(modelUsageUrl, qp).catch(() => null)
    ]);

    const limits = quotaData.limits || [];
    const level = quotaData.level || 'unknown';

    const levelMap = { lite: 'Lite', pro: 'Pro', team: 'Team', enterprise: 'Enterprise' };
    const planName = levelMap[level] || level;

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

    // 用模型用量数据计算重置时间
    const reset = usageData
      ? calcReset(usageData.x_time, usageData.tokensUsage)
      : '?';

    const warn5h = pct5h >= 80 ? '⚠️' : '';
    const warnWeek = pctWeek >= 80 ? '⚠️' : '';

    const line = `[GLM-${planName}] 5h: ${bar5h} ${pct5h}%${warn5h} | 周: ${barWeek} ${pctWeek}%${warnWeek} | 重置: ${reset}`;
    process.stdout.write(line);
  } catch (err) {
    process.stdout.write(`📊 GLM — ${(err.message || 'error').slice(0, 30)}`);
  }
}

main().then(() => process.exit(0)).catch(() => process.exit(0));
