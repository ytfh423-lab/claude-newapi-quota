#!/usr/bin/env node
/**
 * MiniMax Token Plan statusLine 脚本
 * 显示格式: [MiniMax] 5h: ███░░░░░░░ 30% (450/1500) | 重置: 2h 15m
 */

import https from 'https';

const TIMEOUT_MS = 3000;

const baseUrl = process.env.ANTHROPIC_BASE_URL || '';
const authToken = process.env.ANTHROPIC_AUTH_TOKEN || '';

if (!authToken || !baseUrl) {
  process.stdout.write('📊 MiniMax 未配置');
  process.exit(0);
}

if (!baseUrl.includes('minimaxi.com') && !baseUrl.includes('minimax.io')) {
  process.stdout.write('📊 非MiniMax平台');
  process.exit(0);
}

// 根据 base_url 选择对应的查询端点
const isChina = baseUrl.includes('minimaxi.com');
const remainsUrl = isChina
  ? 'https://www.minimaxi.com/v1/token_plan/remains'
  : 'https://www.minimax.io/v1/token_plan/remains';

function makeBar(percentage, width = 10) {
  const filled = Math.round((percentage / 100) * width);
  return '█'.repeat(filled) + '░'.repeat(width - filled);
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
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      }
    }, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        clearTimeout(timer);
        if (res.statusCode !== 200) return reject(new Error(`HTTP ${res.statusCode}`));
        try {
          resolve(JSON.parse(data));
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
    const data = await request(remainsUrl);

    // 检查 API 错误
    if (data.base_resp && data.base_resp.status_code !== 0) {
      process.stdout.write(`📊 MiniMax — ${data.base_resp.status_msg || 'error'}`);
      process.exit(0);
    }

    // 解析文本模型用量 (5h 滚动窗口)
    // 响应可能的字段: remains, total, usage_percent, reset_at, text_remains 等
    let used = 0;
    let total = 0;
    let pct = 0;
    let resetStr = '?';

    // 尝试多种可能的响应格式
    if (data.text_remains !== undefined && data.text_total !== undefined) {
      used = data.text_total - data.text_remains;
      total = data.text_total;
      pct = total > 0 ? Math.round((used / total) * 100) : 0;
    } else if (data.remains !== undefined && data.total !== undefined) {
      used = data.total - data.remains;
      total = data.total;
      pct = total > 0 ? Math.round((used / total) * 100) : 0;
    } else if (data.usage_percent !== undefined) {
      pct = Math.round(data.usage_percent);
      total = data.total || 0;
      used = data.used || Math.round(total * pct / 100);
    } else if (data.data) {
      // 嵌套在 data 字段中
      const d = data.data;
      if (d.remains !== undefined && d.total !== undefined) {
        used = d.total - d.remains;
        total = d.total;
        pct = total > 0 ? Math.round((used / total) * 100) : 0;
      } else if (d.usage_percent !== undefined) {
        pct = Math.round(d.usage_percent);
        total = d.total || 0;
        used = d.used || Math.round(total * pct / 100);
      }
    }

    // 重置时间
    if (data.reset_at) {
      const resetTime = new Date(data.reset_at);
      const diffMs = resetTime.getTime() - Date.now();
      if (diffMs > 0) {
        const totalMin = Math.ceil(diffMs / 60000);
        const h = Math.floor(totalMin / 60);
        const m = totalMin % 60;
        resetStr = h > 0 ? `${h}h${m > 0 ? ' ' + m + 'm' : ''}` : `${m}m`;
      } else {
        resetStr = '0m';
      }
    }

    const bar = makeBar(pct);
    const warn = pct >= 80 ? '⚠️' : '';
    const countStr = total > 0 ? ` (${used}/${total})` : '';

    const line = `[MiniMax] 5h: ${bar} ${pct}%${warn}${countStr} | 重置: ${resetStr}`;
    process.stdout.write(line);
  } catch (err) {
    process.stdout.write(`📊 MiniMax — ${(err.message || 'error').slice(0, 30)}`);
  }
}

main().then(() => process.exit(0)).catch(() => process.exit(0));
