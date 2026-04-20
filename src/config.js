// 用户配置读写：位于 ~/.claude-newapi-quota/config.json
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';

export const CONFIG_DIR = path.join(os.homedir(), '.claude-newapi-quota');
export const CONFIG_FILE = path.join(CONFIG_DIR, 'config.json');
export const CACHE_FILE = path.join(CONFIG_DIR, 'cache.json');

export const DEFAULT_CONFIG = {
  sites: {},
  active: null,
  cache_ttl_seconds: 30,
  display: {
    low_balance_threshold: 1.0,
    show_used: true,
    show_requests: false,
    compact: false,
  },
};

export async function ensureConfigDir() {
  await fs.mkdir(CONFIG_DIR, { recursive: true });
  // Windows 上 chmod 基本不生效，不报错即可
  try { await fs.chmod(CONFIG_DIR, 0o700); } catch { /* ignore */ }
}

function mergeDefaults(cfg) {
  return {
    ...DEFAULT_CONFIG,
    ...cfg,
    display: { ...DEFAULT_CONFIG.display, ...(cfg?.display ?? {}) },
  };
}

export async function loadConfig() {
  try {
    const raw = await fs.readFile(CONFIG_FILE, 'utf-8');
    return mergeDefaults(JSON.parse(raw));
  } catch (err) {
    if (err.code === 'ENOENT') return { ...DEFAULT_CONFIG };
    throw new Error(`配置文件损坏 (${CONFIG_FILE}): ${err.message}`);
  }
}

export async function saveConfig(cfg) {
  await ensureConfigDir();
  const data = JSON.stringify(cfg, null, 2);
  await fs.writeFile(CONFIG_FILE, data, { encoding: 'utf-8' });
  try { await fs.chmod(CONFIG_FILE, 0o600); } catch { /* ignore */ }
}

export function getActiveSite(cfg) {
  if (!cfg.active) return null;
  return cfg.sites[cfg.active] ?? null;
}
