const KEY = 'udo_auth_token';

export default {
	saveToken(token: string) {
		localStorage.setItem(KEY, JSON.stringify({ token: token.trim(), updatedAt: Date.now() }));
		return true;
	},
	getToken(): string | null {
		try {
			const d = JSON.parse(localStorage.getItem(KEY) || '{}');
			return d.token || null;
		} catch {
			return null;
		}
	},
	getHeaders(): Record<string, string> {
		const t = this.getToken();
		const headers: Record<string, string> = { 'Content-Type': 'application/json' };
		if (t) headers.Authorization = 'Bearer ' + t;
		return headers;
	},
	clearToken() {
		localStorage.removeItem(KEY);
		return true;
	},
	clearAllTokens() {
		localStorage.removeItem(KEY);
		localStorage.removeItem('jwt_token');
		localStorage.removeItem('token');
	},
	hasValidToken(): boolean {
		const t = this.getToken();
		return !!t && t.length >= 10;
	},
	getMaskedToken(n = 5): string | null {
		const t = this.getToken();
		if (!t) return null;
		if (t.length <= n) return t;
		return t.slice(0, n) + '...' + t.slice(-n);
	},
	getTokenMetadata() {
		try {
			const d = JSON.parse(localStorage.getItem(KEY) || '{}');
			return { updatedAt: d.updatedAt || null, createdAt: d.createdAt || null };
		} catch {
			return { updatedAt: null, createdAt: null };
		}
	},
	validateTokenFormat(token: string): boolean {
		return !!token && token.length >= 10;
	},
	// udo3 admin routes need "Authorization: Bearer <token>". Instead of adding it to every
	// fetch() call, wrap window.fetch once: requests to apiBase get the saved token unless
	// they already set one. Called from the root +layout.svelte.
	installAuthFetch(apiBase: string) {
		if (typeof window === 'undefined' || (window as any).__udoAuthFetch) return;
		(window as any).__udoAuthFetch = true;
		const original = window.fetch.bind(window);
		const getToken = () => this.getToken();
		let warned = false;
		window.fetch = async (input: RequestInfo | URL, init: RequestInit = {}) => {
			const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
			const token = getToken();
			if (!url.startsWith(apiBase)) return original(input, init);
			const headers = new Headers(init.headers ?? (input instanceof Request ? input.headers : undefined));
			if (token && !headers.has('Authorization')) headers.set('Authorization', 'Bearer ' + token);
			const res = await original(input, { ...init, headers });
			if ((res.status === 401 || res.status === 403) && url.startsWith(apiBase + 'admin/') && !warned) {
				warned = true;
				alert('Please sign in as an admin to use this page.');
			}
			return res;
		};
	}
};
