// NewApiClient 的 mock 测试
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { NewApiClient, NewApiError } from '../src/api.js';

function mockFetch(handler) {
  const original = globalThis.fetch;
  globalThis.fetch = async (url, opts) => handler(url, opts);
  return () => { globalThis.fetch = original; };
}

test('构造器校验 base_url', () => {
  assert.throws(() => new NewApiClient({}), /base_url/);
});

test('构造器校验 token', () => {
  assert.throws(() => new NewApiClient({ base_url: 'https://x' }), /token/);
});

test('access_token 模式注入 New-Api-User 头', async () => {
  const restore = mockFetch(async (url, opts) => {
    assert.equal(url, 'https://x.com/api/user/self');
    assert.equal(opts.headers['Authorization'], 'Bearer tok');
    assert.equal(opts.headers['New-Api-User'], '42');
    return new Response(
      JSON.stringify({ success: true, data: { quota: 1000, used_quota: 200, username: 'u' } }),
      { status: 200, headers: { 'content-type': 'application/json' } },
    );
  });
  try {
    const client = new NewApiClient({
      base_url: 'https://x.com/',
      auth_type: 'access_token',
      access_token: 'tok',
      user_id: 42,
    });
    const data = await client.fetchSelf();
    assert.equal(data.quota, 1000);
    assert.equal(data.username, 'u');
  } finally { restore(); }
});

test('api_key 模式不注入 New-Api-User', async () => {
  const restore = mockFetch(async (url, opts) => {
    assert.equal(opts.headers['Authorization'], 'Bearer sk-abc');
    assert.equal(opts.headers['New-Api-User'], undefined);
    return new Response(
      JSON.stringify({ success: true, data: { quota: 5 } }),
      { status: 200, headers: { 'content-type': 'application/json' } },
    );
  });
  try {
    const client = new NewApiClient({
      base_url: 'https://x.com',
      auth_type: 'api_key',
      api_key: 'sk-abc',
    });
    const data = await client.fetchSelf();
    assert.equal(data.quota, 5);
  } finally { restore(); }
});

test('HTTP 非 2xx 抛 NewApiError', async () => {
  const restore = mockFetch(async () => new Response('nope', { status: 401 }));
  try {
    const client = new NewApiClient({
      base_url: 'https://x.com', auth_type: 'access_token', access_token: 't',
    });
    await assert.rejects(client.fetchSelf(), (e) => e instanceof NewApiError && /401/.test(e.message));
  } finally { restore(); }
});

test('success=false 抛 NewApiError', async () => {
  const restore = mockFetch(async () => new Response(
    JSON.stringify({ success: false, message: '无权限' }),
    { status: 200, headers: { 'content-type': 'application/json' } },
  ));
  try {
    const client = new NewApiClient({
      base_url: 'https://x.com', auth_type: 'access_token', access_token: 't',
    });
    await assert.rejects(client.fetchSelf(), /无权限/);
  } finally { restore(); }
});

test('没有 data 字段时直接返回 json', async () => {
  const restore = mockFetch(async () => new Response(
    JSON.stringify({ quota: 7 }),
    { status: 200, headers: { 'content-type': 'application/json' } },
  ));
  try {
    const client = new NewApiClient({
      base_url: 'https://x.com', auth_type: 'access_token', access_token: 't',
    });
    const data = await client.fetchSelf();
    assert.equal(data.quota, 7);
  } finally { restore(); }
});

test('响应非 JSON 抛 NewApiError', async () => {
  const restore = mockFetch(async () => new Response(
    '<html>nope</html>',
    { status: 200, headers: { 'content-type': 'text/html' } },
  ));
  try {
    const client = new NewApiClient({
      base_url: 'https://x.com', auth_type: 'access_token', access_token: 't',
    });
    await assert.rejects(client.fetchSelf(), /不是 JSON/);
  } finally { restore(); }
});
