<script lang="ts">
	import { supabase } from '$lib/supabase';
	import { exchangeSupabaseSession } from '$lib/authBridge';
	import { goto } from '$app/navigation';
	import { openSignIn, openSignUp } from '$lib/authModal.svelte';

	let { data } = $props();
	let phone = $derived(data.phone);

	let otp = $state<string[]>(['', '', '', '', '', '']);
	let loading = $state(false);
	let mobileMenuOpen = $state(false);
	let message = $state<{ text: string; type: string }>({ text: '', type: '' });

	let refs: (HTMLInputElement | null)[] = [];

	$effect(() => {
		if (!phone) {
			goto('/login/');
			return;
		}
		refs[0]?.focus();
	});

	function handleChange(index: number, value: string) {
		if (!/^\d*$/.test(value)) return;
		const newOtp = [...otp];
		if (value.length > 1) {
			const digits = value.slice(0, 6);
			for (let i = 0; i < 6; i++) newOtp[i] = digits[i] || '';
			otp = newOtp;
			const nextEmpty = newOtp.findIndex((d) => d === '');
			const focusIndex = nextEmpty === -1 ? 5 : nextEmpty;
			refs[focusIndex]?.focus();
		} else {
			newOtp[index] = value;
			otp = newOtp;
			if (value && index < 5) refs[index + 1]?.focus();
		}
		if (message.text) message = { text: '', type: '' };
	}

	function handleKeyDown(index: number, e: KeyboardEvent) {
		if (e.key === 'Backspace' && !otp[index] && index > 0) refs[index - 1]?.focus();
	}

	function handlePaste(e: ClipboardEvent) {
		e.preventDefault();
		const pasted = e.clipboardData?.getData('text').replace(/\D/g, '').slice(0, 6) || '';
		const newOtp = [...otp];
		for (let i = 0; i < 6; i++) newOtp[i] = pasted[i] || '';
		otp = newOtp;
		const nextEmpty = newOtp.findIndex((d) => d === '');
		const focusIndex = nextEmpty === -1 ? 5 : nextEmpty;
		refs[focusIndex]?.focus();
	}

	async function handleSubmit(e: SubmitEvent) {
		e.preventDefault();
		const code = otp.join('');
		if (code.length !== 6) {
			message = { text: 'Please enter the 6-digit code', type: 'error' };
			return;
		}
		loading = true;
		const cleanedNumber = phone.replace(/\D/g, '');
		const finalNumber = '+1' + cleanedNumber;
		try {
			const result = await supabase.auth.verifyOtp({
				phone: finalNumber,
				type: 'sms',
				token: code
			});
			if (result.error) throw new Error(result.error.message);
			const exchanged = await exchangeSupabaseSession();
			if (exchanged) {
				message = { text: 'Verified! Redirecting...', type: 'success' };
				setTimeout(() => goto('/'), 1000);
			} else {
				throw new Error('Failed to exchange session');
			}
		} catch (error: any) {
			message = { text: error.message || 'Verification failed. Please try again.', type: 'error' };
			loading = false;
		}
	}

	async function handleResend() {
		message = { text: '', type: '' };
		const cleanedNumber = phone.replace(/\D/g, '');
		const finalNumber = '+1' + cleanedNumber;
		try {
			const result = await supabase.auth.signInWithOtp({ phone: finalNumber });
			if (result.error) throw new Error(result.error.message);
			message = { text: 'New code sent!', type: 'success' };
			otp = ['', '', '', '', '', ''];
			refs[0]?.focus();
		} catch {
			message = { text: 'Failed to resend. Try again.', type: 'error' };
		}
	}
</script>

<svelte:head><title>Verify code · U-DO</title></svelte:head>

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
			<a href="/login/" onclick={(e) => { e.preventDefault(); mobileMenuOpen = false; openSignIn(); }} class="text-2xl font-bold text-gray-800 border-b border-gray-100 pb-4 w-full">Sign in</a>
			<a href="/signup/" onclick={() => (mobileMenuOpen = false)} class="bg-orange-500 text-white text-xl font-bold py-4 px-8 rounded-full shadow-md text-center mt-4">Join</a>
		</nav>
	</div>
{/if}

<header class="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-200 shadow-sm">
	<div class="absolute left-6 sm:left-12 top-1/2 -translate-y-1/2 z-60 hover:opacity-90 transition">
		<a href="/" class="text-3xl sm:text-4xl font-bold"><span class="text-orange-500">U-</span><span class="text-black">DO</span></a>
		<p class="text-sm text-gray-600 font-medium -mt-1">let someone do it for you</p>
	</div>
	<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between gap-4">
		<div class="w-48 hidden lg:block"></div>
		<div class="flex-1 max-w-3xl hidden lg:block">
			<div class="relative">
				<input type="text" placeholder="Search" readonly class="w-full pl-5 pr-12 py-3.5 bg-[#DADAD3] border border-gray-300 rounded-full text-base focus:outline-none focus:ring-2 focus:ring-gray-400/50 transition shadow-sm cursor-pointer" />
				<button class="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"><svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg></button>
			</div>
		</div>
		<div class="flex items-center gap-2 lg:hidden ml-auto">
			<button class="p-3 rounded-full hover:bg-gray-100 transition-colors"><svg class="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg></button>
			<button onclick={() => (mobileMenuOpen = true)} class="p-2 rounded-lg hover:bg-gray-100 transition"><svg class="w-8 h-8 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" /></svg></button>
		</div>
		<div class="hidden lg:flex items-center gap-3"><a href="/signup/" onclick={(e) => { e.preventDefault(); openSignUp(); }} class="text-black hover:text-orange-500 font-semibold text-base transition">Sign up</a></div>
	</div>
</header>

<main class="flex-1 flex items-center justify-center px-4 py-12">
	<div class="w-full max-w-md bg-white rounded-2xl shadow-xl p-8 md:p-10">
		<div class="text-center mb-8 mt-4">
			<h1 class="text-4xl font-bold mb-2"><span class="text-orange-500">U-</span><span class="text-black">DO</span></h1>
			<h2 class="text-2xl font-semibold text-gray-900">Enter your code</h2>
			<p class="text-gray-600 mt-2">We sent a 6-digit code to<br /><span class="font-medium text-gray-900">{phone}</span></p>
		</div>

		<form onsubmit={handleSubmit}>
			<div class="flex justify-center gap-3 mb-6" onpaste={handlePaste}>
				{#each otp as digit, i}
					<input bind:this={refs[i]} type="text" inputmode="numeric" maxlength={6} value={digit} oninput={(e) => handleChange(i, (e.currentTarget as HTMLInputElement).value)} onkeydown={(e) => handleKeyDown(i, e)} class="w-12 h-14 text-center text-2xl font-bold border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition" />
				{/each}
			</div>

			{#if message.text}
				<div class={`mb-4 text-center p-4 rounded-xl text-sm font-medium ${message.type === 'error' ? 'bg-red-50 text-red-600 border border-red-200' : 'bg-green-50 text-green-700 border border-green-200'}`}>{message.text}</div>
			{/if}

			<button type="submit" disabled={otp.join('').length !== 6 || loading} class="w-full bg-orange-500 hover:bg-orange-600 text-white font-semibold py-3.5 px-6 rounded-lg text-lg transition duration-300 shadow-md hover:shadow-lg flex items-center justify-center gap-2 disabled:bg-gray-300 disabled:cursor-not-allowed disabled:hover:shadow-none">
				<span>{loading ? 'Verifying...' : 'Verify'}</span>
				{#if loading}<div class="w-5 h-5 border-3 border-white/30 border-t-white rounded-full animate-spin"></div>{/if}
			</button>
		</form>

		<div class="mt-6 text-center">
			<p class="text-gray-500 text-sm">Didn't get a code? <button onclick={handleResend} class="text-orange-500 font-medium hover:text-orange-600 transition">Resend</button></p>
		</div>
		<div class="mt-4 text-center">
			<a href="/login/" class="text-gray-500 text-sm hover:text-gray-700 transition">← Back to login</a>
		</div>
	</div>
</main>

<footer class="bg-[#b0b0a8] text-gray-800">
	<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
		<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8">
			<div><h3 class="text-2xl font-bold mb-4"><span class="text-orange-500">U-</span><span class="text-black">DO</span></h3><p class="text-gray-700 text-sm leading-relaxed">UDO Let someone else do it for you.</p></div>
			<div><h4 class="text-lg font-semibold mb-4 text-gray-800">Quick Links</h4><ul class="space-y-2"><li><a href="/" class="text-gray-700 hover:text-orange-500 transition">Home</a></li></ul></div>
			<div><h4 class="text-lg font-semibold mb-4 text-gray-800">Support</h4><ul class="space-y-2"><li><a href="/contact-us/" class="text-gray-700 hover:text-orange-500 transition">Help Center</a></li></ul></div>
			<div><h4 class="text-lg font-semibold mb-4 text-gray-800">Legal</h4><ul class="space-y-2"><li><a href="/terms/" class="text-gray-700 hover:text-orange-500 transition">Terms of Service</a></li><li><a href="/privacy/" class="text-gray-700 hover:text-orange-500 transition">Privacy Policy</a></li></ul></div>
			<div><h4 class="text-lg font-semibold mb-4 text-gray-800">Language</h4><select class="w-full bg-white text-gray-800 border border-gray-400 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-orange-500 cursor-pointer"><option value="en">English</option><option value="es">Español</option><option value="fr">Français</option></select></div>
		</div>
		<div class="border-t border-gray-400 mt-10 pt-8 flex flex-col md:flex-row justify-between items-center"><p class="text-gray-700 text-sm mb-4 md:mb-0">© 2026 U-DO, Inc. All rights reserved.</p></div>
	</div>
</footer>
</div>
