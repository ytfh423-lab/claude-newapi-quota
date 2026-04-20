#!/usr/bin/env node
/**
 * GLM Coding Plan 用量查询脚本
 * 从环境变量 ANTHROPIC_BASE_URL / ANTHROPIC_AUTH_TOKEN 读取配置
 * 查询模型用量、工具用量、配额限制
 */

import https from 'https';

const baseUrl = process.env.ANTHROPIC_BASE_URL || '';
const authToken = process.env.ANTHROPIC_AUTH_TOKEN || '';

if (!authToken) {
  console.error('错误: ANTHROPIC_AUTH_TOKEN 未设置');
  process.exit(1);
}
if (!baseUrl) {
  console.error('错误: ANTHROPIC_BASE_URL 未设置');
  process.exit(1);
}

// 仅支持智谱平台
const parsedBaseUrl = new URL(baseUrl);
const baseDomain = `${parsedBaseUrl.protocol}//${parsedBaseUrl.host}`;

if (!baseUrl.includes('open.bigmodel.cn') && !baseUrl.includes('dev.bigmodel.cn') && !baseUrl.includes('api.z.ai')) {
  console.error('错误: 当前 ANTHROPIC_BASE_URL 不是智谱/Z.ai 平台，无法查询 GLM 用量');
  console.error('当前值:', baseUrl);
  process.exit(1);
}

const modelUsageUrl = `${baseDomain}/api/monitor/usage/model-usage`;
const toolUsageUrl = `${baseDomain}/api/monitor/usage/tool-usage`;
const quotaLimitUrl = `${baseDomain}/api/monitor/usage/quota/limit`;

// 时间窗口：昨天当前整点 → 今天当前整点末
const now = new Date();
const startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, now.getHours(), 0, 0, 0);
const endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours(), 59, 59, 999);

const fmt = (d) => {
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
};

const queryParams = `?startTime=${encodeURIComponent(fmt(startDate))}&endTime=${encodeURIComponent(fmt(endDate))}`;

const request = (url, label, appendQuery = true) => {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const options = {
      hostname: parsed.hostname,
      port: 443,
      path: parsed.pathname + (appendQuery ? queryParams : ''),
      method: 'GET',
      headers: {
        'Authorization': authToken,
        'Accept-Language': 'zh-CN,zh',
        'Content-Type': 'application/json'
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        if (res.statusCode !== 200) {
          return reject(new Error(`[${label}] HTTP ${res.statusCode}\n${data}`));
        }
        try {
          const json = JSON.parse(data);
          let output = json.data || json;

          // 处理配额限制数据
          if (label === '配额限制' && output.limits) {
            output.limits = output.limits.map(item => {
              if (item.type === 'TOKENS_LIMIT') {
                return { type: 'Token用量(5小时)', percentage: item.percentage };
              }
              if (item.type === 'TIME_LIMIT') {
                return {
                  type: 'MCP用量(月)',
                  percentage: item.percentage,
                  currentUsage: item.currentValue,
                  total: item.usage,
                  usageDetails: item.usageDetails
                };
              }
              return item;
            });
          }

          console.log(`=== ${label} ===`);
          console.log(JSON.stringify(output, null, 2));
          console.log('');
        } catch {
          console.log(`=== ${label} ===`);
          console.log(data);
          console.log('');
        }
        resolve();
      });
    });

    req.on('error', (err) => reject(err));
    req.end();
  });
};

const run = async () => {
  await request(quotaLimitUrl, '配额限制', false);
  await request(modelUsageUrl, '模型用量');
  await request(toolUsageUrl, '工具用量');
};

run().catch((err) => {
  console.error('查询失败:', err.message);
  process.exit(1);
});
