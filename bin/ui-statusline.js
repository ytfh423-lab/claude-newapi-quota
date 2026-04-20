#!/usr/bin/env node
/**
 * Claude Code CLI 美化状态栏
 * 读取 Claude Code stdin session JSON，输出带 ANSI 彩色的综合信息栏
 *
 * 效果示例:
 *   Sonnet 4.6 | myproject@main (+12 -3) | 45k/200k (22%) | effort: high | 5h 30% | 7d 12%
 */

import { execSync } from 'child_process';
import { readFileSync, existsSync } from 'fs';
import { join, basename } from 'path';

// ─── ANSI 颜色 ───
const ESC = '\x1b[';
const R   = `${ESC}0m`;
const BLUE    = `${ESC}38;2;0;153;255m`;
const CYAN    = `${ESC}38;2;46;149;153m`;
const GREEN   = `${ESC}38;2;0;160;0m`;
const ORANGE  = `${ESC}38;2;255;176;85m`;
const RED     = `${ESC}38;2;255;85;85m`;
const YELLOW  = `${ESC}38;2;230;200;0m`;
const PURPLE  = `${ESC}38;2;167;139;250m`;
const WHITE   = `${ESC}38;2;220;220;220m`;
const DIM     = `${ESC}2m`;

// ─── 工具函数 ───
function fmtTokens(n) {
  if (n >= 1e6) {
    const v = (n / 1e6);
    return Math.abs(v - Math.round(v)) < 0.05 ? `${Math.round(v)}m` : `${v.toFixed(1)}m`;
  }
  if (n >= 1000) return `${Math.round(n / 1000)}k`;
  return `${n}`;
}

function usageColor(pct) {
  if (pct >= 90) return RED;
  if (pct >= 70) return ORANGE;
  if (pct >= 50) return YELLOW;
  return GREEN;
}

function formatResetCompact(epochOrIso) {
  if (!epochOrIso || epochOrIso === 'null') return '';
  try {
    let dt;
    if (typeof epochOrIso === 'number') dt = new Date(epochOrIso * 1000);
    else dt = new Date(epochOrIso);
    if (isNaN(dt.getTime())) return '';
    const diff = dt.getTime() - Date.now();
    if (diff <= 0) return '';
    const min = Math.ceil(diff / 60000);
    const h = Math.floor(min / 60);
    const m = min % 60;
    if (h > 0) return `${h}h${m > 0 ? m + 'm' : ''}`;
    return `${m}m`;
  } catch { return ''; }
}

// ─── 读 stdin ───
function readStdin() {
  return new Promise((resolve) => {
    if (process.stdin.isTTY) return resolve(null);
    const timer = setTimeout(() => resolve(null), 800);
    let buf = '';
    process.stdin.setEncoding('utf-8');
    process.stdin.on('readable', () => {
      let chunk;
      while ((chunk = process.stdin.read()) !== null) buf += chunk;
    });
    process.stdin.on('end', () => {
      clearTimeout(timer);
      try { resolve(buf ? JSON.parse(buf) : null); } catch { resolve(null); }
    });
  });
}

// ─── Git 信息 ───
function gitInfo(cwd) {
  if (!cwd) return null;
  try {
    const branch = execSync('git rev-parse --abbrev-ref HEAD', { cwd, timeout: 2000, stdio: ['pipe', 'pipe', 'pipe'] }).toString().trim();
    let added = 0, deleted = 0;
    try {
      const stat = execSync('git diff --numstat', { cwd, timeout: 2000, stdio: ['pipe', 'pipe', 'pipe'] }).toString().trim();
      if (stat) {
        for (const line of stat.split('\n')) {
          const [a, d] = line.split(/\s+/);
          if (/^\d+$/.test(a)) added += parseInt(a);
          if (/^\d+$/.test(d)) deleted += parseInt(d);
        }
      }
    } catch {}
    return { branch, added, deleted };
  } catch { return null; }
}

// ─── Effort 等级 ───
function getEffort() {
  if (process.env.CLAUDE_CODE_EFFORT_LEVEL) return process.env.CLAUDE_CODE_EFFORT_LEVEL;
  const configDir = process.env.CLAUDE_CONFIG_DIR || join(process.env.USERPROFILE || process.env.HOME || '', '.claude');
  const settingsPath = join(configDir, 'settings.json');
  if (existsSync(settingsPath)) {
    try {
      const s = JSON.parse(readFileSync(settingsPath, 'utf-8'));
      if (s.effortLevel) return s.effortLevel;
    } catch {}
  }
  return 'medium';
}

function effortStyle(level) {
  switch (level) {
    case 'low':    return `${DIM}${level}${R}`;
    case 'medium': return `${ORANGE}med${R}`;
    case 'high':   return `${GREEN}${level}${R}`;
    case 'xhigh':  return `${PURPLE}${level}${R}`;
    case 'max':    return `${RED}${level}${R}`;
    default:       return `${GREEN}${level}${R}`;
  }
}

// ─── 主流程 ───
async function main() {
  const data = await readStdin();
  if (!data) {
    process.stdout.write(`${BLUE}Claude${R}`);
    return;
  }

  const SEP = ` ${DIM}|${R} `;
  let out = '';

  // 1. 模型名
  let modelName = data.model?.display_name || 'Claude';
  modelName = modelName.replace(/\s*\((\d+\.?\d*[kKmM])\s+context\)/, ' $1').trim();
  out += `${BLUE}${modelName}${R}`;

  // 2. 工作目录 + Git
  const cwd = data.cwd;
  if (cwd) {
    const dirName = basename(cwd);
    const git = gitInfo(cwd);
    out += SEP;
    out += `${CYAN}${dirName}${R}`;
    if (git) {
      out += `${DIM}@${R}${GREEN}${git.branch}${R}`;
      if (git.added + git.deleted > 0) {
        out += ` ${DIM}(${R}${GREEN}+${git.added}${R} ${RED}-${git.deleted}${R}${DIM})${R}`;
      }
    }
  }

  // 3. 上下文窗口
  const ctxSize = data.context_window?.context_window_size || 200000;
  const inputTokens = data.context_window?.current_usage?.input_tokens || 0;
  const cacheCreate = data.context_window?.current_usage?.cache_creation_input_tokens || 0;
  const cacheRead = data.context_window?.current_usage?.cache_read_input_tokens || 0;
  const current = inputTokens + cacheCreate + cacheRead;
  const ctxPct = ctxSize > 0 ? Math.floor(current * 100 / ctxSize) : 0;
  const ctxColor = usageColor(ctxPct);

  out += SEP;
  out += `${ORANGE}${fmtTokens(current)}/${fmtTokens(ctxSize)}${R} ${DIM}(${R}${ctxColor}${ctxPct}%${R}${DIM})${R}`;

  // 4. Effort 等级
  const effort = getEffort();
  out += SEP;
  out += `effort: ${effortStyle(effort)}`;

  // 5. 用量（5h / 7d）
  const rl = data.rate_limits;
  if (rl) {
    if (rl.five_hour && rl.five_hour.used_percentage != null) {
      const pct = Math.floor(rl.five_hour.used_percentage);
      const color = usageColor(pct);
      out += SEP;
      out += `${WHITE}5h${R} ${color}${pct}%${R}`;
      const reset = formatResetCompact(rl.five_hour.resets_at);
      if (reset) out += ` ${DIM}@${reset}${R}`;
    }
    if (rl.seven_day && rl.seven_day.used_percentage != null) {
      const pct = Math.floor(rl.seven_day.used_percentage);
      const color = usageColor(pct);
      out += SEP;
      out += `${WHITE}7d${R} ${color}${pct}%${R}`;
      const reset = formatResetCompact(rl.seven_day.resets_at);
      if (reset) out += ` ${DIM}@${reset}${R}`;
    }
  }

  process.stdout.write(out);
}

main()
  .then(() => process.exit(0))
  .catch(() => {
    process.stdout.write(`${BLUE}Claude${R}`);
    process.exit(0);
  });
