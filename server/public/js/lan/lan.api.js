
// lan.api.js - FIXED to not require token for device listing when offline
const LanApi = {
    _token: null,
    _deviceId: null,
    setToken(token) {
        this._token = token || null;
        if (token) localStorage.setItem('cbt_auth_token', token);
        else localStorage.removeItem('cbt_auth_token');
    },
    loadToken() {
        if (!this._token) {
            this._token = localStorage.getItem('cbt_auth_token') || null;
        }
        return this._token;
    },
    setDeviceId(deviceId) { this._deviceId = deviceId || null; },
    async request(method, path, body = null, opts = {}) {
        if (!LAN_CONFIG.enabled) {
            return { ok: false, error: { code: 'lan_disabled', message: 'LAN is disabled - using offline mode' } };
        }
        const url = path.startsWith('http') ? path : LAN_CONFIG.apiBase + path;
        const headers = { 'Accept': 'application/json' };
        const token = this.loadToken();
        if (token && token !== 'offline') {
            headers['Authorization'] = 'Bearer ' + token;
            headers['X-Device-Token'] = token;
        }
        if (this._deviceId) headers['X-Device-Id'] = this._deviceId;
        const fetchOpts = { method, headers, credentials: 'omit' };
        if (body && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
            headers['Content-Type'] = 'application/json';
            fetchOpts.body = JSON.stringify(body);
        }
        const retries = opts.retries ?? LAN_CONFIG.maxRetries;
        let lastErr = null;
        for (let attempt = 0; attempt <= retries; attempt++) {
            const controller = new AbortController();
            const timer = setTimeout(() => controller.abort(), LAN_CONFIG.requestTimeoutMs);
            fetchOpts.signal = controller.signal;
            try {
                const res = await fetch(url, fetchOpts);
                clearTimeout(timer);
                let payload = null;
                try { payload = await res.json(); } catch (_) { payload = null; }
                if (res.ok && payload && payload.ok) {
                    return { ok: true, data: payload.data, status: res.status };
                }
                const err = (payload && payload.error) || { code: 'http_' + res.status, message: res.statusText || 'Server error' };
                if (res.status === 401) {
                    this.setToken(null);
                    return {
                        ok: false,
                        error: { code: 'invalid_token', message: err.message || 'Invalid or expired token' },
                        status: 401
                    };
                }
                return { ok: false, error: err, status: res.status };
            } catch (err) {
                clearTimeout(timer);
                lastErr = err;
                const isAbort = err.name === 'AbortError';
                const isNetwork = err.message && /failed to fetch|network|load failed/i.test(err.message);
                if (attempt < retries && (isAbort || isNetwork)) {
                    await new Promise(r => setTimeout(r, LAN_CONFIG.retryDelayMs * (attempt + 1)));
                    continue;
                }
                return { ok: false, error: { code: isAbort ? 'timeout' : 'network', message: isAbort ? 'Request timed out' : (err.message || 'Network error') } };
            }
        }
        return { ok: false, error: { code: 'unknown', message: (lastErr && lastErr.message) || 'Unknown error' } };
    },
    get(path, opts)    { return this.request('GET',    path, null, opts); },
    post(path, body)   { return this.request('POST',   path, body); },
    patch(path, body)  { return this.request('PATCH',  path, body); },
    del(path)          { return this.request('DELETE', path); },
    async ping() {
        const r = await this.get('/health', { retries: 0 });
        return r.ok;
    },
};
window.LanApi = LanApi;
console.log('✅ lan.api.js FIXED - handles missing token gracefully');
