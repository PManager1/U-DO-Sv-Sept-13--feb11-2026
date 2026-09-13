import API_BASE from './api';
import { supabase } from './supabase';
import tokenManager from './tokenManager';

let registered = false;

export async function exchangeSupabaseSession(): Promise<boolean> {
	const { data: { session } } = await supabase.auth.getSession();
	if (!session?.access_token) return false;
	if (tokenManager.getToken()) return true;
	try {
		const res = await fetch(API_BASE + 'auth/supabase', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ supabaseToken: session.access_token })
		});
		if (!res.ok) return false;
		const data = await res.json();
		if (!data.token) return false;
		tokenManager.saveToken(data.token);
		return true;
	} catch {
		return false;
	}
}

export function registerSupabaseSessionHandler() {
	if (registered || typeof window === 'undefined') return;
	registered = true;
	supabase.auth.onAuthStateChange((event, session) => {
		if ((event === 'INITIAL_SESSION' || event === 'SIGNED_IN') && session?.access_token) {
			exchangeSupabaseSession();
		}
		if (event === 'SIGNED_OUT') {
			tokenManager.clearAllTokens();
		}
	});
}
