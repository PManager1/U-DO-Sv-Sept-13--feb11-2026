<script lang="ts">
	import { goto } from '$app/navigation';
	import { signup, saveStep1 } from './signup.svelte';
	import { authModal, closeSignUp, openSignIn } from './authModal.svelte';
	import { supabase } from './supabase';

	let fullName = $state(signup.fullName || '');
	let phone = $state(signup.phone || '');
	let nameError = $state(false);
	let phoneError = $state(false);
	let phoneOverflow = $state(false);
	let phoneErrorMsg = $derived.by(() => {
		const d = phone.replace(/\D/g, '');
		if (phoneOverflow) return 'Phone number can only be 10 digits after the country code.';
		if (d.length === 0) return '';
		if (d.length < 11) return 'Phone number must be 10 digits.';
		return '';
	});
	let loading = $state(false);
	let message = $state<{ text: string; type: string }>({ text: '', type: '' });

	$effect(() => {
		if (!authModal.signUp) return;
		fullName = signup.fullName || '';
		phone = signup.phone || '';
		nameError = false;
		phoneError = false;
		phoneOverflow = false;
		message = { text: '', type: '' };
	});

	$effect(() => {
		if (!authModal.signUp) return;
		const onKey = (e: KeyboardEvent) => {
			if (e.key === 'Escape') closeSignUp();
		};
		window.addEventListener('keydown', onKey);
		return () => window.removeEventListener('keydown', onKey);
	});

	function handlePhoneChange(e: Event) {
		const el = e.currentTarget as HTMLInputElement;
		let value = el.value.replace(/\D/g, '');
		phoneOverflow = value.length > 11;
		if (value.length > 0) {
			if (!value.startsWith('1')) value = '1' + value;
			let formatted = '+1';
			if (value.length > 1) formatted += ' (' + value.substring(1, 4);
			if (value.length > 4) formatted += ') ' + value.substring(4, 7);
			if (value.length > 7) formatted += '-' + value.substring(7, 11);
			el.value = formatted;
			phone = formatted;
		} else {
			phone = '';
		}
		validatePhone(el.value);
	}

	function validatePhone(value: string) {
		const digits = (value || phone).replace(/\D/g, '');
		const isValid = digits.length === 11;
		phoneError = digits.length > 0 && !isValid;
		phoneOverflow = digits.length > 11;
		return isValid;
	}

	function validateName(value: string) {
		const v = (value || fullName).trim();
		const isValid = v.length >= 2;
		nameError = fullName.length > 0 && !isValid;
		return isValid;
	}

	async function handleSubmit(e: SubmitEvent) {
		e.preventDefault();
		const nameValid = validateName(fullName);
		const phoneValid = validatePhone(phone);
		if (!nameValid || !phoneValid) return;
		saveStep1({ fullName: fullName.trim(), phone });
		message = { text: '', type: '' };
		loading = true;
		try {
			const digits = phone.replace(/\D/g, '');
			const national = digits.slice(-10);
			const e164 = '+1' + national;
			const result = await supabase.auth.signInWithOtp({
				phone: e164,
				options: { data: { full_name: fullName.trim() } }
			});
			if (result.error) throw new Error(result.error.message);
			closeSignUp();
			goto(`/verifyOtp?phone=${encodeURIComponent(national)}`);
		} catch (error: any) {
			message = { text: error.message || 'Failed to send code. Please try again.', type: 'error' };
			loading = false;
		}
	}
</script>

{#if authModal.signUp}
	<div class="fixed inset-0 z-[100] flex items-center justify-center p-4">
		<div class="absolute inset-0 bg-black/40 backdrop-blur-sm" onclick={closeSignUp}></div>
		<div class="relative w-full max-w-md bg-white rounded-2xl shadow-xl p-8 md:p-10 overflow-y-auto max-h-[90vh] animate-[fadeIn_0.2s_ease-out]">
			<button onclick={closeSignUp} class="absolute top-4 right-4 w-9 h-9 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-900 transition z-10" aria-label="Close">
				<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
			</button>

			<div class="text-center mb-8 mt-2">
				<h1 class="text-4xl font-bold mb-2"><span class="text-orange-500">U-</span><span class="text-black">DO</span></h1>
				<h2 class="text-xl font-semibold text-gray-900">You're just a few steps away from getting started</h2>
				<p class="text-gray-600 mt-2">Verify your number to continue with UDO</p>
			</div>

			<form onsubmit={handleSubmit} class="space-y-4">
				<div>
					<label for="signupFullName" class="block text-sm font-medium text-gray-700 mb-2">Full Name</label>
					<input type="text" id="signupFullName" value={fullName} oninput={(e) => { fullName = (e.currentTarget as HTMLInputElement).value; validateName(fullName); }} required placeholder="Jane Smith" class={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition ${nameError ? 'border-red-500' : 'border-gray-300'}`} />
					{#if nameError}<p class="text-red-500 text-sm mt-1">Please enter your name</p>{/if}
				</div>

				<div>
					<label for="signupPhone" class="block text-sm font-medium text-gray-700 mb-2">Phone Number</label>
					<input type="tel" id="signupPhone" value={phone} oninput={handlePhoneChange} required placeholder="+1 (555) 123-4567" class={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition ${phoneError ? 'border-red-500' : 'border-gray-300'}`} />
					{#if phoneError}<p class="text-red-500 text-sm mt-1">{phoneErrorMsg}</p>{/if}
				</div>

				{#if message.text}
					<div class={`p-4 rounded-xl text-sm font-medium ${message.type === 'error' ? 'bg-red-50 text-red-600 border border-red-200' : 'bg-green-50 text-green-700 border border-green-200'}`}>{message.text}</div>
				{/if}

				<div class="space-y-3 text-gray-500">
					<p class="text-xs">Message and data rates may apply</p>
					<p class="text-sm">You can unsubscribe at any time</p>
					<p class="flex items-center gap-1 text-sm">
						<svg class="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" /></svg>
						<span>Your information is Secure & protected</span>
					</p>

				</div>

				<button type="submit" class="w-full bg-orange-500 hover:bg-orange-600 text-white font-semibold py-3.5 px-6 rounded-lg text-lg transition duration-300 shadow-md hover:shadow-lg flex items-center justify-center gap-2">
					Continue
					<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" /></svg>
				</button>

				<p class="text-center text-sm text-gray-600">You'll stay signed in for faster access</p>
				<p class="text-xs text-gray-500 text-center leading-relaxed">By continuing, I agree to the <a href="/terms/" class="text-orange-500 hover:underline">User Terms</a>, <a href="/privacy/" class="text-orange-500 hover:underline">Privacy Policy</a> and I authorize U-DO and its partner technology companies to send me text notifications.</p>
			</form>

			<p class="text-center text-gray-600 mt-6">Already have an account? <a href="/login/" onclick={(e) => { e.preventDefault(); closeSignUp(); openSignIn(); }} class="text-orange-500 font-semibold hover:underline">Sign in</a></p>
		</div>
	</div>
{/if}
