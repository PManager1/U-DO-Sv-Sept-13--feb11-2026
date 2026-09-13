import API_BASE from './api';
import tokenManager from './tokenManager';

export const admin = $state({ isAdmin: false });

let loaded = false;
let loadingPromise: Promise<void> | null = null;

export async function ensureAdminLoaded() {
	if (loaded) return;
	if (loadingPromise) return loadingPromise;
	loadingPromise = (async () => {
		try {
			const headers = tokenManager.getHeaders();
			if (!headers.Authorization) return;
			const res = await fetch(API_BASE + 'me', { headers });
			if (!res.ok) return;
			const data = await res.json();
			const user = data.user || {};
			const roles = Array.isArray(user.roles)
				? user.roles.map((r: any) => String(r).toLowerCase())
				: user.role
					? [String(user.role).toLowerCase()]
					: [];
			admin.isAdmin = roles.includes('admin');
		} catch {
			/* leave false */
		} finally {
			loaded = true;
		}
	})();
	return loadingPromise;
}
