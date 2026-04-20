// new-api HTTP 客户端
// 兼容 new-api / one-api 两类面板的常见接口
// 认证模式：
//   access_token: Authorization: Bearer <token> + (可选) New-Api-User: <user_id>
//   api_key:       Authorization: Bearer sk-xxx（同一接口，有些站点允许用 key 查 self）

export class NewApiError extends Error {
  constructor(message, { status, path: p } = {}) {
    super(message);
    this.name = 'NewApiError';
    this.status = status;
    this.path = p;
  }
}

export class NewApiClient {
  constructor(site) {
    if (!site || !site.base_url) throw new NewApiError('缺少 base_url');
    if (!site.access_token && !site.api_key && !site.token) {
      throw new NewApiError('缺少 token（access_token 或 api_key）');
    }
    this.baseUrl = site.base_url.replace(/\/+$/, '');
    this.authType = site.auth_type ?? 'access_token';
    this.token = site.access_token ?? site.api_key ?? site.token;
    this.userId = site.user_id;
    this.timeoutMs = site.timeout_ms ?? 8000;
  }

  _headers() {
    const h = {
      'Authorization': `Bearer ${this.token}`,
      'Accept': 'application/json',
      'User-Agent': 'claude-newapi-quota/0.1',
    };
    // new-api 的面板接口在较新版本要求 New-Api-User 头指向访问者 user_id
    if (this.authType === 'access_token' && this.userId != null) {
      h['New-Api-User'] = String(this.userId);
    }
    return h;
  }

  async _get(pathname) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), this.timeoutMs);
    let res;
    try {
      res = await fetch(`${this.baseUrl}${pathname}`, {
        method: 'GET',
        headers: this._headers(),
        signal: ctrl.signal,
      });
    } catch (err) {
      clearTimeout(timer);
      if (err.name === 'AbortError') {
        throw new NewApiError(`请求超时 (${this.timeoutMs}ms): ${pathname}`, { path: pathname });
      }
      throw new NewApiError(`网络错误: ${err.message}`, { path: pathname });
    }
    clearTimeout(timer);

    const text = await res.text();
    if (!res.ok) {
      throw new NewApiError(
        `HTTP ${res.status} ${res.statusText} @ ${pathname}${text ? ` — ${text.slice(0, 120)}` : ''}`,
        { status: res.status, path: pathname },
      );
    }
    let json;
    try { json = JSON.parse(text); }
    catch { throw new NewApiError(`响应不是 JSON: ${text.slice(0, 120)}`, { path: pathname }); }

    // new-api 标准包裹：{ success, message, data }
    if (json && typeof json === 'object' && 'success' in json && json.success === false) {
      throw new NewApiError(`API 错误: ${json.message ?? '未知'}`, { path: pathname });
    }
    return (json && typeof json === 'object' && 'data' in json) ? json.data : json;
  }

  // 获取当前用户（含 quota、used_quota、request_count 等）
  async fetchSelf() {
    return await this._get('/api/user/self');
  }

  // 获取当前用户下的 token 列表（可用来看各 sk- key 的剩余额度）
  async fetchTokens({ page = 0, size = 100 } = {}) {
    return await this._get(`/api/token/?p=${page}&size=${size}`);
  }

  // 站点状态（可选，用于联通测试）
  async fetchStatus() {
    return await this._get('/api/status');
  }
}
