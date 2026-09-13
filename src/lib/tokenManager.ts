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
	}
};
