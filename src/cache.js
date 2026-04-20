// 轻量本地缓存（JSON 文件）：避免 statusLine 频繁打爆中转站
import fs from 'node:fs/promises';
import { CACHE_FILE, ensureConfigDir } from './config.js';

async function readStore() {
  try {
    const raw = await fs.readFile(CACHE_FILE, 'utf-8');
    const obj = JSON.parse(raw);
    return (obj && typeof obj === 'object') ? obj : {};
  } catch {
    return {};
  }
}

export async function readCache(key) {
  const store = await readStore();
  const entry = store[key];
  if (!entry) return null;
  if (entry.expires_at && entry.expires_at < Date.now()) return null;
  return entry.value;
}

export async function writeCache(key, value, ttlSeconds = 30) {
  await ensureConfigDir();
  const store = await readStore();
  store[key] = {
    value,
    expires_at: Date.now() + Math.max(1, ttlSeconds) * 1000,
  };
  try {
    await fs.writeFile(CACHE_FILE, JSON.stringify(store), { encoding: 'utf-8' });
    try { await fs.chmod(CACHE_FILE, 0o600); } catch { /* ignore on windows */ }
  } catch {
    // 缓存写失败不影响主流程
  }
}

export async function clearCache() {
  try { await fs.unlink(CACHE_FILE); } catch { /* ignore */ }
}
