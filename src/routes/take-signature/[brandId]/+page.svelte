<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/state';
	import API_BASE from '$lib/api';
	import SignaturePad from '$lib/SignaturePad.svelte';

	const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
	const PHONE_RE = /^\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}$/;

	const CONSENT_TERMS = `
U-DO MENU PUBLICATION CONSENT & TERMS OF SERVICE

By signing below, you (the "Restaurant Owner" or "Authorized Representative") grant U-DO (udonow.com) and its affiliates the non-exclusive, royalty-free, worldwide right and license to:

1. Host, display, publish, reproduce, and distribute your restaurant's menu content, including but not limited to menu items, descriptions, prices, categories, modifiers, and nutritional information.

2. Use, reproduce, and display your restaurant's logos, trademarks, and brand assets for the purpose of listing and promoting your restaurant on the U-DO platform.

3. Create derivative works such as aggregated menu data, analytics, and search indexes based on your menu content.

This consent shall remain in effect until revoked in writing by the authorized representative. You represent that you have the authority to grant these rights on behalf of the restaurant.

ELECTRONIC SIGNATURE CONSENT
You agree that your electronic signature is legally binding and equivalent to a handwritten signature under the US ESIGN Act (15 U.S.C. § 7001 et seq.) and any applicable state laws. You acknowledge receipt of this agreement electronically and agree to conduct this transaction electronically.
`;

	const brandId = $derived(page.params.brandId);

	let brandName = $state('');
	let restaurantName = $state('');
	let authorizedName = $state('');
	let email = $state('');
	let phone = $state('');
	let esignConsent = $state(false);
	let submitting = $state(false);
	let error = $state('');
	let success = $state(false);
	let signatureDataUrl = $state('');
	let signatureEmpty = $state(true);

	onMount(() => {
		fetch(API_BASE + `brands/${brandId}`)
			.then((r) => (r.ok ? r.json() : null))
			.then((data) => {
				if (data?.name) brandName = data.name;
			})
			.catch(() => {});
	});

	function formatPhone(value: string) {
		const digits = value.replace(/\D/g, '');
		let formatted = '';
		for (let i = 0; i < digits.length && i < 10; i++) {
			if (i === 3 || i === 6) formatted += '-';
			formatted += digits[i];
		}
		return formatted;
	}

	function validate() {
		if (!restaurantName.trim()) return 'Restaurant name is required';
		if (!authorizedName.trim()) return 'Authorized person name is required';
		if (!EMAIL_RE.test(email)) return 'A valid email is required';
		if (!PHONE_RE.test(phone)) return 'A valid phone number is required (e.g. 555-123-4567)';
		if (!esignConsent) return 'You must agree to conduct business electronically';
		if (signatureEmpty) return 'Please provide your signature above';
		return '';
	}

	async function handleSubmit(e: SubmitEvent) {
		e.preventDefault();
		error = '';
		const msg = validate();
		if (msg) { error = msg; return; }

		submitting = true;
		try {
			const payload = {
				brandId,
				restaurantName: restaurantName.trim(),
				authorizedName: authorizedName.trim(),
				email: email.trim(),
				phone: phone.trim(),
				esignConsent: true,
				signaturePngBase64: signatureDataUrl,
				userAgent: navigator.userAgent,
				consentTimestamp: new Date().toISOString()
			};

			const res = await fetch(API_BASE + 'admin/take-signature', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(payload)
			});

			if (!res.ok) {
				const body = await res.text();
				throw new Error(body || `Server responded ${res.status}`);
			}

			success = true;
		} catch (err: any) {
			error = err.message || 'Submission failed. Please try again.';
		} finally {
			submitting = false;
		}
	}
</script>

<svelte:head><title>U-DO Menu Consent</title></svelte:head>

{#if success}
	<div class="min-h-screen bg-[#f9f7f5] flex items-center justify-center p-4">
		<div class="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 max-w-md w-full text-center">
			<div class="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-5">
				<svg class="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg>
			</div>
			<h2 class="text-2xl font-bold text-gray-900 mb-2">Consent Recorded</h2>
			<p class="text-gray-500 text-sm mb-6">Your digital consent and signature have been successfully recorded. A confirmation has been sent to {email}.</p>
			<button onclick={() => window.close()} class="px-6 py-2.5 bg-violet-600 hover:bg-violet-700 text-white font-semibold rounded-xl transition cursor-pointer">Done</button>
			<p class="text-xs text-gray-400 mt-4">This tab can be closed safely.</p>
		</div>
	</div>
{:else}
	<div class="min-h-screen bg-[#f9f7f5]">
		<div class="max-w-lg mx-auto px-4 py-8">
			<div class="text-center mb-8">
				<h1 class="text-2xl font-bold text-gray-900">U-DO Menu Consent</h1>
				{#if brandName}<p class="text-gray-500 mt-1 text-sm">{brandName}</p>{/if}
				<p class="text-gray-400 text-xs mt-2">Authorize U-DO to host and display your menu</p>
			</div>

			<form onsubmit={handleSubmit} class="space-y-6" novalidate>
				<div class="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
					<h2 class="font-semibold text-gray-900 text-sm">Restaurant Information</h2>

					<div>
						<label class="block text-sm font-medium text-gray-700 mb-1">Restaurant Name</label>
						<input type="text" bind:value={restaurantName} placeholder="e.g. Pizza Hut Downtown" class="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-violet-400 placeholder:text-gray-400" />
					</div>
					<div>
						<label class="block text-sm font-medium text-gray-700 mb-1">Authorized Person Name</label>
						<input type="text" bind:value={authorizedName} placeholder="e.g. John Doe" class="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-violet-400 placeholder:text-gray-400" />
					</div>
					<div>
						<label class="block text-sm font-medium text-gray-700 mb-1">Email</label>
						<input type="email" bind:value={email} placeholder="e.g. john@restaurant.com" class="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-violet-400 placeholder:text-gray-400" />
					</div>
					<div>
						<label class="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
						<input type="tel" value={phone} oninput={(e) => (phone = formatPhone((e.currentTarget as HTMLInputElement).value))} placeholder="e.g. 555-123-4567" class="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-violet-400 placeholder:text-gray-400" />
					</div>
				</div>

				<div class="bg-white rounded-xl border border-gray-200 p-5">
					<h2 class="font-semibold text-gray-900 text-sm mb-3">Terms of Service</h2>
					<div class="bg-gray-50 rounded-lg p-4 text-xs text-gray-600 leading-relaxed whitespace-pre-line max-h-48 overflow-y-auto border border-gray-100">{CONSENT_TERMS}</div>
				</div>

				<div class="bg-white rounded-xl border border-gray-200 p-5">
					<label class="flex items-start gap-3 cursor-pointer">
						<input type="checkbox" bind:checked={esignConsent} class="mt-0.5 h-4 w-4 rounded border-gray-300 text-violet-600 focus:ring-violet-500" />
						<span class="text-sm text-gray-700 leading-relaxed">I agree to conduct business electronically and acknowledge that my electronic signature is legally binding under the US ESIGN Act.</span>
					</label>
				</div>

				<div class="bg-white rounded-xl border border-gray-200 p-5">
					<h2 class="font-semibold text-gray-900 text-sm mb-3">Signature</h2>
					<p class="text-xs text-gray-500 mb-3">Sign using your finger or mouse above the line</p>
					<SignaturePad bind:dataUrl={signatureDataUrl} bind:isEmpty={signatureEmpty} />
				</div>

				{#if error}
					<div class="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">{error}</div>
				{/if}

				<button type="submit" disabled={submitting} class="w-full py-3 bg-violet-600 hover:bg-violet-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition text-base cursor-pointer">
					{#if submitting}
						<span class="flex items-center justify-center gap-2">
							<svg class="animate-spin h-4 w-4" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" fill="none" /><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" /></svg>
							Submitting...
						</span>
					{:else}
						Submit Consent & Signature
					{/if}
				</button>
			</form>
		</div>
	</div>
{/if}
