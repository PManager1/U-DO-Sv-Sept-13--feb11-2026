<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { openSignUp } from '$lib/authModal.svelte';
	import { supabase } from '$lib/supabase';
	import { exchangeSupabaseSession } from '$lib/authBridge';
	import { signup, clearStored } from '$lib/signup.svelte';

	let phoneNumber = $state('');
	let loading = $state(false);
	let message = $state<{ text: string; type: string }>({ text: '', type: '' });
	let mobileMenuOpen = $state(false);

	let showEmailLogin = $state(false);
	let emailAddress = $state('');
	let emailOtpSent = $state(false);
	let emailOtpCode = $state('');
	let emailLoading = $state(false);
	let emailVerifyLoading = $state(false);
	let emailSuccessMsg = $state('');

	let googleLoading = $state(false);
	let appleLoading = $state(false);

	function formatPhoneNumber(value: string) {
		const digits = value.replace(/\D/g, '');
		if (digits.length > 10) return value.substring(0, 12);
		let formatted = '';
		for (let i = 0; i < digits.length && i < 10; i++) {
			if (i === 3 || i === 6) formatted += '-';
			formatted += digits[i];
		}
		return formatted;
	}

	function isValidPhone(value: string) {
		return value.replace(/\D/g, '').length === 10;
	}

	function isValidEmail(email: string) {
		return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
	}

	function handlePhoneChange(e: Event) {
		const el = e.currentTarget as HTMLInputElement;
		phoneNumber = formatPhoneNumber(el.value);
		if (message.text) message = { text: '', type: '' };
	}

	async function handleSendPhoneOTP() {
		if (!isValidPhone(phoneNumber)) {
			message = { text: 'Please enter a valid 10-digit phone number', type: 'error' };
			return;
		}
		loading = true;
		message = { text: '', type: '' };
		try {
			const cleanedNumber = phoneNumber.replace(/\D/g, '');
			const result = await supabase.auth.signInWithOtp({
				phone: '+1' + cleanedNumber,
				options: {
					data: {
						full_name: signup.fullName || ''
					}
				}
			});
			if (result.error) throw new Error(result.error.message);
			clearStored();
			message = { text: 'OTP sent successfully! Redirecting...', type: 'success' };
			setTimeout(() => {
				goto(`/verifyOtp?phone=${encodeURIComponent(phoneNumber)}`);
			}, 1500);
		} catch (error: any) {
			message = { text: error.message || 'Failed to send OTP. Please try again.', type: 'error' };
			loading = false;
		}
	}

	async function handleSendEmailOTP() {
		if (!isValidEmail(emailAddress)) {
			message = { text: 'Please enter a valid email address', type: 'error' };
			return;
		}
		emailLoading = true;
		message = { text: '', type: '' };
		try {
			const result = await supabase.auth.signInWithOtp({ email: emailAddress.toLowerCase().trim() });
			if (result.error) throw new Error(result.error.message);
			emailOtpSent = true;
			emailSuccessMsg = `Code sent to ${emailAddress}!`;
		} catch (error: any) {
			message = { text: error.message || 'Failed to send email code. Please try again.', type: 'error' };
		} finally {
			emailLoading = false;
		}
	}

	async function handleVerifyEmailOTP() {
		if (emailOtpCode.length !== 6) return;
		emailVerifyLoading = true;
		message = { text: '', type: '' };
		try {
			const result = await supabase.auth.verifyOtp({
				email: emailAddress.toLowerCase().trim(),
				type: 'email',
				token: emailOtpCode
			});
			if (result.error) throw new Error(result.error.message);
			const exchanged = await exchangeSupabaseSession();
			if (exchanged) {
				message = { text: 'Login successful! Redirecting...', type: 'success' };
				setTimeout(() => goto('/'), 1500);
			} else {
				throw new Error('Failed to exchange session');
			}
		} catch (error: any) {
			message = { text: error.message || 'Invalid code. Please try again.', type: 'error' };
		} finally {
			emailVerifyLoading = false;
		}
	}

	async function handleGoogleSignIn(e: Event) {
		e.preventDefault();
		googleLoading = true;
		message = { text: '', type: '' };
		try {
			const { error } = await supabase.auth.signInWithOAuth({
				provider: 'google',
				options: { redirectTo: window.location.origin }
			});
			if (error) throw error;
		} catch (error: any) {
			message = { text: error.message || 'Google sign-in failed', type: 'error' };
			googleLoading = false;
		}
	}

	async function handleAppleSignIn(e: Event) {
		e.preventDefault();
		appleLoading = true;
		message = { text: '', type: '' };
		try {
			const { error } = await supabase.auth.signInWithOAuth({
				provider: 'apple',
				options: { redirectTo: window.location.origin }
			});
			if (error) throw error;
		} catch (error: any) {
			message = { text: error.message || 'Apple sign-in failed', type: 'error' };
			appleLoading = false;
		}
	}

	onMount(async () => {
		const ok = await exchangeSupabaseSession();
		if (ok) goto('/');
		if (signup.phone) {
			const digits = signup.phone.replace(/\D/g, '');
			let formatted = '';
			for (let i = 0; i < digits.length && i < 10; i++) {
				if (i === 3 || i === 6) formatted += '-';
				formatted += digits[i];
			}
			phoneNumber = formatted;
		}
	});
</script>

<svelte:head><title>Sign in · U-DO</title></svelte:head>

<div class="min-h-screen flex flex-col">
{#if mobileMenuOpen}
	<div class="fixed inset-0 bg-white z-9999 flex flex-col p-4 px-8 pb-8 lg:hidden">
		<button onclick={() => (mobileMenuOpen = false)} class="absolute top-4 right-4 p-2 text-gray-800 z-10">
			<svg class="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" /></svg>
		</button>
		<div class="w-full flex justify-center items-center mb-12">
			<a href="/" onclick={() => (mobileMenuOpen = false)} class="text-3xl font-bold"><span class="text-orange-500">U <span class="-mx-1"></span>-</span><span class="text-gray-800">DO</span></a>
		</div>
		<nav class="flex flex-col gap-6 w-full">
			<a href="/login/" onclick={() => (mobileMenuOpen = false)} class="text-2xl font-bold text-gray-800 border-b border-gray-100 pb-4 w-full">Sign in</a>
			<a href="/signup/" onclick={(e) => { e.preventDefault(); openSignUp(); }} class="bg-orange-500 text-white text-xl font-bold py-4 px-8 rounded-full shadow-md text-center mt-4">Join</a>
		</nav>
	</div>
{/if}

<header class="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-200 shadow-sm">
	<div class="absolute left-6 sm:left-12 top-1/2 -translate-y-1/2 z-60 hover:opacity-90 transition">
		<a href="/" class="text-3xl sm:text-4xl font-bold"><span class="text-orange-500">U <span class="-mx-1"></span>-</span><span class="text-gray-800">DO</span></a>
		<p class="text-sm text-gray-600 font-medium -mt-1">let someone do it for you</p>
	</div>
	<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between gap-4">
		<div class="w-48 hidden lg:block"></div>
		<div class="flex-1 max-w-3xl hidden lg:block">
			<div class="relative">
				<input type="text" placeholder="Search" readonly class="w-full pl-5 pr-12 py-3.5 bg-[#DADAD3] border border-gray-300 rounded-full text-base focus:outline-none focus:ring-2 focus:ring-gray-400/50 transition shadow-sm cursor-pointer" />
				<button class="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700">
					<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
				</button>
			</div>
		</div>
		<div class="flex items-center gap-2 lg:hidden ml-auto">
			<button class="p-3 rounded-full hover:bg-gray-100 transition-colors">
				<svg class="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
			</button>
			<button onclick={() => (mobileMenuOpen = true)} class="p-2 rounded-lg hover:bg-gray-100 transition">
				<svg class="w-8 h-8 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" /></svg>
			</button>
		</div>
		<div class="hidden lg:flex items-center gap-3">
			<a href="/signup/" onclick={(e) => { e.preventDefault(); openSignUp(); }} class="text-black hover:text-orange-500 font-semibold text-base transition">Sign up</a>
		</div>
	</div>
</header>

<main class="flex-1 flex items-center justify-center px-4 py-12 relative">
	<div class="w-full max-w-md bg-white rounded-2xl shadow-xl p-8 md:p-10 relative">
		<div class="text-center mb-8 mt-4">
			<h1 class="text-4xl font-bold mb-2"><span class="text-orange-500">U-</span><span class="text-black">DO</span></h1>
			<h2 class="text-2xl font-semibold text-gray-900">Sign in with your phone</h2>
			<p class="text-gray-600 mt-2">We'll send you a verification code</p>
		</div>

		<div>
			<div>
				<label for="phoneNumber" class="block text-sm font-medium text-gray-700 mb-2">Phone Number</label>
				<input type="tel" id="phoneNumber" value={phoneNumber} oninput={handlePhoneChange} maxlength={12} autocomplete="tel" placeholder="123-456-7890" class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition" />
			</div>

			{#if message.text}
				<div class={`mt-4 text-center p-4 rounded-xl text-sm font-medium ${message.type === 'error' ? 'bg-red-50 text-red-600 border border-red-200' : 'bg-green-50 text-green-700 border border-green-200'}`}>{message.text}</div>
			{/if}

			<div class="h-48 hidden md:block"></div>
			<div class="h-12 md:hidden"></div>

			<button type="button" onclick={handleSendPhoneOTP} disabled={!isValidPhone(phoneNumber) || loading} class="w-full bg-orange-500 hover:bg-orange-600 text-white font-semibold py-3.5 px-6 rounded-lg text-lg transition duration-300 shadow-md hover:shadow-lg flex items-center justify-center gap-2 disabled:bg-gray-300 disabled:cursor-not-allowed disabled:hover:shadow-none">
				<span>{loading ? 'Sending...' : 'Send me OTP'}</span>
				{#if loading}<div class="w-5 h-5 border-3 border-white/30 border-t-white rounded-full animate-spin"></div>{/if}
			</button>
		</div>

		<div class="mt-6 flex items-center gap-3">
			<div class="flex-1 h-px bg-gray-200"></div>
			<span class="text-gray-400 text-sm font-medium">OR</span>
			<div class="flex-1 h-px bg-gray-200"></div>
		</div>

		<div class="mt-4 space-y-3">
			<button type="button" onclick={handleGoogleSignIn} disabled={googleLoading} class="w-full bg-white hover:bg-gray-50 text-gray-800 font-semibold py-3 px-6 rounded-lg text-base transition duration-300 shadow-md border border-gray-300 flex items-center justify-center gap-2 disabled:bg-gray-100 disabled:cursor-not-allowed">
				{#if googleLoading}<div class="w-5 h-5 border-3 border-gray-300/30 border-t-gray-600 rounded-full animate-spin"></div>{/if}
				<span>{googleLoading ? 'Signing in...' : 'Continue with Google'}</span>
			</button>
			<button type="button" onclick={handleAppleSignIn} disabled={appleLoading} class="w-full bg-black hover:bg-gray-900 text-white font-semibold py-3 px-6 rounded-lg text-base transition duration-300 shadow-md flex items-center justify-center gap-2 disabled:bg-gray-700 disabled:cursor-not-allowed">
				{#if appleLoading}<div class="w-5 h-5 border-3 border-gray-400/30 border-t-white rounded-full animate-spin"></div>{/if}
				<span>{appleLoading ? 'Signing in...' : 'Continue with Apple'}</span>
			</button>
		</div>

		<div class="mt-4 text-center">
			<button type="button" onclick={() => {
				showEmailLogin = !showEmailLogin;
				if (showEmailLogin) { emailOtpSent = false; emailSuccessMsg = ''; emailAddress = ''; emailOtpCode = ''; }
			}} class="inline-flex items-center gap-2 text-orange-500 hover:text-orange-600 font-semibold text-sm transition">
				<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
				Lost your phone? Send login code to your email
			</button>
		</div>

		{#if showEmailLogin}
			<div class="mt-4 space-y-4">
				<div>
					<label for="email" class="block text-sm font-medium text-gray-700 mb-2">Email Address</label>
					<input type="email" id="email" value={emailAddress} oninput={(e) => (emailAddress = (e.currentTarget as HTMLInputElement).value)} autocomplete="email" placeholder="you@example.com" class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition" />
				</div>
				{#if emailSuccessMsg}
					<div class="flex items-center gap-2 text-green-600 text-sm font-medium bg-green-50 border border-green-200 p-3 rounded-xl">
						<svg class="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" /></svg>
						{emailSuccessMsg}
					</div>
				{/if}
				{#if !emailOtpSent}
					<button type="button" onclick={handleSendEmailOTP} disabled={!isValidEmail(emailAddress) || emailLoading} class="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg text-base transition duration-300 shadow-md flex items-center justify-center gap-2 disabled:bg-gray-300 disabled:cursor-not-allowed">
						{emailLoading ? 'Sending...' : 'Send Code to Email'}
						{#if emailLoading}<div class="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>{/if}
					</button>
				{/if}
				{#if emailOtpSent}
					<div class="space-y-4">
						<div>
							<label for="emailOtp" class="block text-sm font-medium text-gray-700 mb-2">Enter 6-digit code</label>
							<input type="text" id="emailOtp" value={emailOtpCode} oninput={(e) => { const el = e.currentTarget as HTMLInputElement; const digits = el.value.replace(/\D/g, '').slice(0, 6); emailOtpCode = digits; }} maxlength={6} inputmode="numeric" autocomplete="one-time-code" placeholder="••••••" class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition text-center text-2xl font-bold tracking-[0.5em]" />
						</div>
						<button type="button" onclick={handleVerifyEmailOTP} disabled={emailOtpCode.length !== 6 || emailVerifyLoading} class="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-6 rounded-lg text-base transition duration-300 shadow-md flex items-center justify-center gap-2 disabled:bg-gray-300 disabled:cursor-not-allowed">
							{emailVerifyLoading ? 'Verifying...' : 'Verify & Login'}
							{#if emailVerifyLoading}<div class="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>{/if}
						</button>
					</div>
				{/if}
			</div>
		{/if}

		<div class="mt-6 text-center">
			<p class="text-gray-500 text-sm leading-relaxed">By providing your phone number, you agree to receive a one-time text message from U-DO for account verification. Message and data rates may apply. View our <a href="/privacy/" class="text-blue-600 font-medium hover:text-blue-800 transition">Privacy Policy</a>.</p>
		</div>
	</div>
</main>

<footer class="bg-[#b0b0a8] text-gray-800">
	<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
		<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8">
			<div>
				<h3 class="text-2xl font-bold mb-4"><span class="text-orange-500">U-</span><span class="text-black">DO</span></h3>
				<p class="text-gray-700 text-sm leading-relaxed">UDO Let someone else do it for you.</p>
			</div>
			<div>
				<h4 class="text-lg font-semibold mb-4 text-gray-800">Quick Links</h4>
				<ul class="space-y-2"><li><a href="/" class="text-gray-700 hover:text-orange-500 transition">Home</a></li></ul>
			</div>
			<div>
				<h4 class="text-lg font-semibold mb-4 text-gray-800">Support</h4>
				<ul class="space-y-2"><li><a href="/contact-us/" class="text-gray-700 hover:text-orange-500 transition">Help Center</a></li></ul>
			</div>
			<div>
				<h4 class="text-lg font-semibold mb-4 text-gray-800">Legal</h4>
				<ul class="space-y-2"><li><a href="/terms/" class="text-gray-700 hover:text-orange-500 transition">Terms of Service</a></li><li><a href="/privacy/" class="text-gray-700 hover:text-orange-500 transition">Privacy Policy</a></li></ul>
			</div>
			<div>
				<h4 class="text-lg font-semibold mb-4 text-gray-800">Language</h4>
				<select class="w-full bg-white text-gray-800 border border-gray-400 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-orange-500 cursor-pointer"><option value="en">English</option><option value="es">Español</option><option value="fr">Français</option></select>
			</div>
		</div>
		<div class="border-t border-gray-400 mt-10 pt-8 flex flex-col md:flex-row justify-between items-center">
			<p class="text-gray-700 text-sm mb-4 md:mb-0">© 2026 U-DO, Inc. All rights reserved.</p>
		</div>
	</div>
</footer>
</div>
