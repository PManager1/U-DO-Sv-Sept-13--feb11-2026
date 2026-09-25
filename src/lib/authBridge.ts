import API_BASE from './api';
import { supabase } from './supabase';
import tokenManager from './tokenManager';

let registered = false;

export type OtpMode = 'phone' | 'email';

// OTP login goes through udo-3 (/api/v1/auth/send-otp, /auth/verify-otp),
// which talks to Supabase server-side and returns a udo session token.
export async function sendOtp(mode: OtpMode, identifier: string): Promise<void> {
	const res = await fetch(API_BASE + 'auth/send-otp', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ mode, identifier })
	});
	const data = await res.json().catch(() => ({}));
	if (!res.ok || !data.success) throw new Error(data.message || 'Failed to send code');
}

export async function verifyOtp(mode: OtpMode, identifier: string, code: string): Promise<void> {
	const res = await fetch(API_BASE + 'auth/verify-otp', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ mode, identifier, code })
	});
	const data = await res.json().catch(() => ({}));
	if (!res.ok || !data.session_token) throw new Error(data.message || 'Invalid code');
	tokenManager.saveToken(data.session_token);
}

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
