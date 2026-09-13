<script lang="ts">
	import API_BASE from './api';
	import tokenManager from './tokenManager';
	import { authModal, closeSignIn, openSignUp } from './authModal.svelte';
	import { supabase } from './supabase';
	import { exchangeSupabaseSession } from './authBridge';

	let mode = $state<'phone' | 'email'>('phone');
	let stage = $state<'entry' | 'otp'>('entry');
	let phone = $state('');
	let phoneOverflow = $state(false);
	let phoneError = $derived.by(() => {
		const d = phone.replace(/\D/g, '');
		if (phoneOverflow) return 'Phone number can only be 10 digits.';
		if (d.length === 0) return '';
		if (d.length < 10) return 'Phone number must be exactly 10 digits.';
		return '';
	});
	let email = $state('');
	let otp = $state<string[]>(['', '', '', '', '', '']);
	let loading = $state(false);
	let message = $state<{ text: string; type: string }>({ text: '', type: '' });
	let refs: (HTMLInputElement | null)[] = [];

	$effect(() => {
		if (!authModal.open) return;
		mode = 'phone';
		stage = 'entry';
		phone = '';
		phoneOverflow = false;
		email = '';
		otp = ['', '', '', '', '', ''];
		message = { text: '', type: '' };
	});

	$effect(() => {
		if (!authModal.open) return;
		const onKey = (e: KeyboardEvent) => {
			if (e.key === 'Escape') closeSignIn();
		};
		window.addEventListener('keydown', onKey);
		return () => window.removeEventListener('keydown', onKey);
	});

	function formatPhone(value: string) {
		const digits = value.replace(/\D/g, '');
		phoneOverflow = digits.length > 10;
		let formatted = '';
		for (let i = 0; i < digits.length && i < 10; i++) {
			if (i === 3 || i === 6) formatted += '-';
			formatted += digits[i];
		}
		return formatted;
	}

	function isValidPhone() {
		return phone.replace(/\D/g, '').length === 10;
	}

	function isValidEmail() {
		return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
	}

	// function cleanPhone(raw: string): string {
	// 	const digits = raw.replace(/\D/g, '');
	// 	const national = digits.length === 11 && digits.startsWith('1') ? digits.slice(1) : digits;
	// 	return '+1' + national;
	// }

	function cleanPhone(raw: string): string {
  if (!raw) return '';
  // 1. Extract only numeric digits
  const digits = raw.replace(/\D/g, '');
  
  // 2. Take strictly the LAST 10 digits (the US area code + number)
  const last10 = digits.slice(-10);
  
  // 3. Prepend exactly one '+1'
  return '+1' + last10;
}

	async function sendCode() {
		message = { text: '', type: '' };
		if (mode === 'phone' && !isValidPhone()) {
			message = { text: 'Please enter a valid 10-digit phone number', type: 'error' };
			return;
		}
		if (mode === 'email' && !isValidEmail()) {
			message = { text: 'Please enter a valid email address', type: 'error' };
			return;
		}
		loading = true;
		try {
			if (mode === 'phone') {
				const result = await supabase.auth.signInWithOtp({
					phone: cleanPhone(phone)
				});
				if (result.error) throw new Error(result.error.message);
			} else {
				const result = await supabase.auth.signInWithOtp({
					email: email.toLowerCase().trim()
				});
				if (result.error) throw new Error(result.error.message);
			}
			stage = 'otp';
			otp = ['', '', '', '', '', ''];
			message = { text: mode === 'phone' ? 'Code sent to your phone' : `Code sent to ${email}`, type: 'success' };
			setTimeout(() => refs[0]?.focus(), 50);
		} catch (e: any) {
			message = { text: e.message || 'Failed to send code', type: 'error' };
		} finally {
			loading = false;
		}
	}

	function handleOtpChange(index: number, value: string) {
		if (!/^\d*$/.test(value)) return;
		const next = [...otp];
		if (value.length > 1) {
			const digits = value.slice(0, 6);
			for (let i = 0; i < 6; i++) next[i] = digits[i] || '';
			otp = next;
			const nextEmpty = next.findIndex((d) => d === '');
			refs[nextEmpty === -1 ? 5 : nextEmpty]?.focus();
		} else {
			next[index] = value;
			otp = next;
			if (value && index < 5) refs[index + 1]?.focus();
		}
		if (message.text) message = { text: '', type: '' };
	}

	function handleOtpKeyDown(index: number, e: KeyboardEvent) {
		if (e.key === 'Backspace' && !otp[index] && index > 0) refs[index - 1]?.focus();
	}

	function handleOtpPaste(e: ClipboardEvent) {
		e.preventDefault();
		const pasted = e.clipboardData?.getData('text').replace(/\D/g, '').slice(0, 6) || '';
		const next = [...otp];
		for (let i = 0; i < 6; i++) next[i] = pasted[i] || '';
		otp = next;
		refs[5]?.focus();
	}

	async function verify() {
		const code = otp.join('');
		if (code.length !== 6) {
			message = { text: 'Please enter the 6-digit code', type: 'error' };
			return;
		}
		loading = true;
		message = { text: '', type: '' };
		try {
			let result;
			if (mode === 'phone') {
				result = await supabase.auth.verifyOtp({
					phone: cleanPhone(phone),
					type: 'sms',
					token: code
				});
			} else {
				result = await supabase.auth.verifyOtp({
					email: email.toLowerCase().trim(),
					type: 'email',
					token: code
				});
			}
			if (result.error) throw new Error(result.error.message);
			const exchanged = await exchangeSupabaseSession();
			if (exchanged) {
				message = { text: 'Verified!', type: 'success' };
				setTimeout(() => {
					closeSignIn();
					window.location.reload();
				}, 800);
			} else {
				throw new Error('Failed to exchange session');
			}
		} catch (e: any) {
			message = { text: e.message || 'Verification failed. Please try again.', type: 'error' };
			loading = false;
		}
	}

	async function resend() {
		message = { text: '', type: '' };
		try {
			if (mode === 'phone') {
				const result = await supabase.auth.signInWithOtp({
					phone: cleanPhone(phone)
				});
				if (result.error) throw new Error(result.error.message);
			} else {
				const result = await supabase.auth.signInWithOtp({
					email: email.toLowerCase().trim()
				});
				if (result.error) throw new Error(result.error.message);
			}
			otp = ['', '', '', '', '', ''];
			message = { text: 'New code sent!', type: 'success' };
			setTimeout(() => refs[0]?.focus(), 50);
		} catch {
			message = { text: 'Failed to resend. Try again.', type: 'error' };
		}
	}

	async function demoLogin() {
		loading = true;
		message = { text: '', type: '' };
		try {
			const res = await fetch(API_BASE + 'demo-login', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ phoneNumber: '+10000000001' })
			});
			if (!res.ok) throw new Error('Demo login failed');
			const data = await res.json();
			if (!data.token) throw new Error('No token received');
			tokenManager.saveToken(data.token);
			message = { text: 'Logged in as test account!', type: 'success' };
			setTimeout(() => {
				closeSignIn();
				window.location.reload();
			}, 800);
		} catch (e: any) {
			message = { text: e.message || 'Demo login failed', type: 'error' };
		} finally {
			loading = false;
		}
	}
</script>

{#if authModal.open}
	<div class="fixed inset-0 z-[100] flex items-center justify-center p-4">
		<div class="absolute inset-0 bg-black/40 backdrop-blur-sm" onclick={closeSignIn}></div>
		<div class="relative w-full max-w-md bg-white rounded-2xl shadow-xl p-8 md:p-10 overflow-y-auto max-h-[90vh] animate-[fadeIn_0.2s_ease-out]">
			{#if authModal.notice}
				<div class="mb-4 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm font-semibold text-red-600">{authModal.notice}</div>
			{/if}
			<button onclick={closeSignIn} class="absolute top-4 right-4 w-9 h-9 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-900 transition z-10" aria-label="Close">
				<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
			</button>

			{#if stage === 'otp'}
				<button onclick={() => (stage = 'entry')} class="absolute top-4 left-4 w-9 h-9 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-700 transition z-10" aria-label="Back">
					<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7" /></svg>
				</button>
			{/if}

			<div class="text-center mb-6 mt-2 px-8">
				<h1 class="text-4xl font-bold mb-2"><span class="text-orange-500">U-</span><span class="text-black">DO</span></h1>
				<h2 class="text-2xl font-semibold text-gray-900">
					{#if stage === 'otp'}
						Verify your {mode === 'phone' ? 'phone' : 'email'}
					{:else}
						Sign in with your {mode}
					{/if}
				</h2>
				<p class="text-black mt-2">We'll send you a verification code</p>
			</div>

			{#if stage === 'entry'}
				{#if mode === 'phone'}
					<form onsubmit={(e) => { e.preventDefault(); if (!loading && isValidPhone()) sendCode(); }}>
						<div>
							<label class="block text-sm font-medium text-gray-700 mb-2">Phone Number</label>
							<input
								type="tel"
								value={phone}
								oninput={(e) => (phone = formatPhone((e.currentTarget as HTMLInputElement).value))}
								maxlength={12}
								autocomplete="tel"
								placeholder="123-456-7890"
								enterkeyhint="next"
								class="w-full px-4 py-3 ${phoneError ? 'border border-red-500' : 'border border-gray-300'} rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition"
							/>
							{#if phoneError}<p class="text-red-500 text-sm mt-1">{phoneError}</p>{/if}
						</div>

						{#if message.text}
							<div class={`mt-4 text-center p-4 rounded-xl text-sm font-medium ${message.type === 'error' ? 'bg-red-50 text-red-600 border border-red-200' : 'bg-green-50 text-green-700 border border-green-200'}`}>{message.text}</div>
						{/if}

						<button type="submit" disabled={loading || !isValidPhone()} class="mt-5 w-full bg-orange-500 hover:bg-orange-600 text-white font-semibold py-3.5 px-6 rounded-lg text-lg transition duration-300 shadow-md hover:shadow-lg flex items-center justify-center gap-2 disabled:bg-gray-300 disabled:cursor-not-allowed disabled:hover:shadow-none">
							<span>{loading ? 'Sending...' : 'Send me OTP'}</span>
							{#if loading}<div class="w-5 h-5 border-3 border-white/30 border-t-white rounded-full animate-spin"></div>{/if}
						</button>
					</form>

					<button onclick={demoLogin} disabled={loading} class="mt-3 w-full bg-gray-800 hover:bg-gray-900 text-white font-semibold py-3 px-6 rounded-lg text-base transition duration-300 shadow-md flex items-center justify-center gap-2 disabled:bg-gray-300 disabled:cursor-not-allowed">
						{loading ? 'Logging in...' : 'Test/Demo login'}
					</button>

					<div class="mt-6 flex items-center gap-3">
						<div class="flex-1 h-px bg-gray-200"></div>
						<span class="text-gray-400 text-sm font-medium">OR</span>
						<div class="flex-1 h-px bg-gray-200"></div>
					</div>

					<div class="mt-4 text-center">
						<button type="button" onclick={() => { mode = 'email'; message = { text: '', type: '' }; }} class="inline-flex items-center gap-2 text-orange-500 hover:text-orange-600 font-semibold text-sm transition">
							<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
							Lost your phone? Send login code to your email
						</button>
					</div>
				{:else}
					<form onsubmit={(e) => { e.preventDefault(); if (!loading && isValidEmail()) sendCode(); }}>
						<div>
							<label class="block text-sm font-medium text-gray-700 mb-2">Email Address</label>
							<input
								type="email"
								value={email}
								oninput={(e) => (email = (e.currentTarget as HTMLInputElement).value)}
								autocomplete="email"
								placeholder="you@example.com"
								enterkeyhint="done"
								class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
							/>
						</div>

						{#if message.text}
							<div class={`mt-4 text-center p-4 rounded-xl text-sm font-medium ${message.type === 'error' ? 'bg-red-50 text-red-600 border border-red-200' : 'bg-green-50 text-green-700 border border-green-200'}`}>{message.text}</div>
						{/if}

						<button type="submit" disabled={loading || !isValidEmail()} class="mt-5 w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg text-base transition duration-300 shadow-md flex items-center justify-center gap-2 disabled:bg-gray-300 disabled:cursor-not-allowed">
							<span>{loading ? 'Sending...' : 'Send Code to Email'}</span>
							{#if loading}<div class="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>{/if}
						</button>

						<div class="mt-4 text-center">
							<button type="button" onclick={() => { mode = 'phone'; message = { text: '', type: '' }; }} class="inline-flex items-center gap-2 text-orange-500 hover:text-orange-600 font-semibold text-sm transition">
								<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" /></svg>
								Use phone instead
							</button>
						</div>
					</form>
				{/if}
			{:else}
				<div class="text-center mb-1">
					<p class="text-sm text-black">Enter the 6-digit code we sent to</p>
					<p class="text-xs text-black mt-0.5">{mode === 'phone' ? phone : email}</p>
				</div>
				<div class="flex gap-2 justify-center my-5">
					{#each otp as digit, i}
						<input
							bind:this={refs[i]}
							type="text"
							inputmode="numeric"
							value={digit}
							oninput={(e) => handleOtpChange(i, (e.currentTarget as HTMLInputElement).value)}
							onkeydown={(e) => handleOtpKeyDown(i, e)}
							onpaste={handleOtpPaste}
							maxlength={6}
							class="w-12 h-14 text-center text-2xl font-bold border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition"
						/>
					{/each}
				</div>

				{#if message.text}
					<div class={`mb-4 p-3 rounded-xl text-sm font-medium text-center ${message.type === 'error' ? 'bg-red-50 text-red-600 border border-red-200' : 'bg-green-50 text-green-700 border border-green-200'}`}>{message.text}</div>
				{/if}

				<button onclick={verify} disabled={loading || otp.join('').length !== 6} class="w-full bg-orange-500 hover:bg-orange-600 text-white font-semibold py-3.5 px-6 rounded-lg text-base transition duration-300 shadow-md flex items-center justify-center gap-2 disabled:bg-gray-300 disabled:cursor-not-allowed">
					<span>{loading ? 'Verifying...' : 'Verify & Login'}</span>
					{#if loading}<div class="w-5 h-5 border-3 border-white/30 border-t-white rounded-full animate-spin"></div>{/if}
				</button>

				<div class="flex items-center justify-end mt-3 text-sm">
					<button onclick={resend} class="text-orange-500 hover:text-orange-600 font-semibold transition">Resend code</button>
				</div>
			{/if}

			<div class="mt-6 text-center">
				<p class="text-gray-500 text-sm leading-relaxed">By providing your phone number, you agree to receive a one-time text message from U-DO for account verification. Message and data rates may apply. View our <a href="/privacy/" class="text-blue-600 font-medium hover:text-blue-800 transition">Privacy Policy</a>.</p>
			</div>

			<p class="text-center text-gray-600 text-sm mt-3">
				Don't have an account?
				<a href="/signup/" onclick={(e) => { e.preventDefault(); closeSignIn(); openSignUp(); }} class="text-orange-500 font-semibold hover:underline">Sign up</a>
			</p>
		</div>
	</div>
{/if}
