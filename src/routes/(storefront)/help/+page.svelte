<script lang="ts">
	import { onMount } from 'svelte';
	import API_BASE from '$lib/api';
	import tokenManager from '$lib/tokenManager';
	import { openSignIn } from '$lib/authModal.svelte';

	const categories = [
		{ label: 'Order Issue', value: 'order-issues' },
		{ label: 'Billing & Refunds', value: 'billing' },
		{ label: 'Technical Bug', value: 'bug' },
		{ label: 'General Inquiry', value: 'general' }
	];

	const faqs = [
		{
			q: 'Where is my order?',
			a: 'You can track your order in real time from Orders & Reorders in your account. If it still has not arrived after the estimated time, reach out to us and include your order number so we can look into it quickly.'
		},
		{
			q: 'How do refunds work?',
			a: 'Refunds are issued back to your original payment method once a request is approved, typically within 5–7 business days. Contact us with your order details and we will review the issue right away.'
		},
		{
			q: 'How do I change my delivery address?',
			a: 'You can update your saved address on an active order, or manage your saved addresses in Account Settings. For orders already in transit, contact us ASAP so we can try to update the drop-off.'
		},
		{
			q: 'How do I cancel an order?',
			a: 'Go to Orders & Reorders ( udonow.com/orders) and open the active order to cancel it. If the order is already being prepared or on its way, send us a message and we will do our best to help.'
		}
	];

	const helpfulLinks = [
		{ label: 'Orders & Reorders', icon: '📦', href: '/orders/' },
		{ label: 'Saved Addresses', icon: '📍', href: '/settings/#addresses' },
		{ label: 'Payment Methods / Wallet', icon: '💳', href: '/paymentmethods' }
	];

	let isLoggedIn = $state(tokenManager.hasValidToken());

	let openFaq = $state<number | null>(0);
	let topic = $state('');
	let orderNumber = $state('');
	let message = $state('');
	let name = $state('');
	let email = $state('');
	let attachmentName = $state('');

	let submitting = $state(false);
	let submitted = $state<{ ticketId: string } | null>(null);
	let error = $state<string | null>(null);
	let fieldErrors = $state<Record<string, string>>({});

	const showOrderField = $derived(topic === 'order-issues');

	onMount(() => {
		if (!isLoggedIn) return;
		const headers = tokenManager.getHeaders();
		fetch(API_BASE + 'me', { headers })
			.then((r) => r.json())
			.then((data) => {
				const u = data.user || data;
				const first = u.firstName || '';
				const last = u.lastName || '';
				name = [first, last].filter(Boolean).join(' ') || u.name || '';
				email = u.email || '';
			})
			.catch(() => {});
	});

	function validate(): boolean {
		const errors: Record<string, string> = {};
		if (!name.trim()) errors.name = 'Please enter your full name.';
		if (!email.trim()) errors.email = 'Please enter your email address.';
		else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()))
			errors.email = 'Enter a valid email address.';
		if (!topic) errors.topic = 'Please select a topic.';
		if (showOrderField && !orderNumber.trim())
			errors.orderNumber = 'Please enter your order number.';
		if (!message.trim()) errors.message = 'Please tell us what happened.';
		else if (message.trim().length < 10)
			errors.message = 'Please add a bit more detail (at least 10 characters).';
		fieldErrors = errors;
		return Object.keys(errors).length === 0;
	}

	function clearError(field: string) {
		if (fieldErrors[field]) {
			const next = { ...fieldErrors };
			delete next[field];
			fieldErrors = next;
		}
	}

	async function onSubmit() {
		error = null;
		if (!isLoggedIn) {
			openSignIn('Please sign in to contact support.');
			return;
		}
		if (!validate()) return;

		submitting = true;
		const parts = [`${message.trim()}`];
		if (showOrderField && orderNumber.trim()) parts.unshift(`Order #${orderNumber.trim()}`);
		if (attachmentName) parts.push(`[Attachment included: ${attachmentName}]`);
		const description = parts.join('\n\n');

		try {
			const headers = tokenManager.getHeaders();
			const res = await fetch(API_BASE + 'issues', {
				method: 'POST',
				headers,
				body: JSON.stringify({
					category: topic,
					issueTitle: categories.find((c) => c.value === topic)?.label || topic,
					description
				})
			});

			if (res.status === 429) {
				error = 'Too many requests. Please wait a few minutes and try again.';
				return;
			}
			if (res.status === 401) {
				isLoggedIn = false;
				openSignIn('Your session expired. Please sign in again.');
				return;
			}
			if (!res.ok) {
				let detail = 'Something went wrong. Please try again.';
				try {
					const body = await res.json();
					if (body?.message) detail = body.message;
				} catch {
					/* ignore parse errors */
				}
				error = detail;
				return;
			}

			const data = await res.json();
			const id = data?.id || data?.ticket?.id || '';
			const short = id ? id.slice(-6).toUpperCase() : '—';
			submitted = { ticketId: short };
		} catch {
			error = 'Network error. Please check your connection and try again.';
		} finally {
			submitting = false;
		}
	}

	function formatTicket(id: string) {
		return `TK-${id
			.replace(/[^0-9A-Z]/gi, '')
			.padStart(6, '0')
			.slice(-6)}`;
	}
</script>

<svelte:head>
	<title>Help &amp; Support</title>
</svelte:head>

<div class="mx-auto max-w-3xl">
	<!-- Header -->
	<header class="mb-6">
		<h1 class="text-3xl font-extrabold text-ink">How can we help you?</h1>
		<p class="mt-2 text-ink-soft">
			We typically respond within 24 hours. Support is available Mon–Fri, 9 AM – 5 PM EST.
		</p>
	</header>

	{#if submitted}
		<section
			class="animate-[riseIn_0.3s_ease] rounded-2xl border border-line bg-white p-8 text-center shadow-soft"
		>
			<div class="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-fresh/10">
				<svg class="h-8 w-8 text-fresh" fill="none" stroke="currentColor" viewBox="0 0 24 24"
					><path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M5 13l4 4L19 7"
					/></svg
				>
			</div>
			<h2 class="mt-4 text-2xl font-bold text-ink">Message received!</h2>
			<p class="mt-2 text-ink-soft">
				Your ticket ID is <span class="font-bold text-ink">{formatTicket(submitted.ticketId)}</span
				>. A confirmation email has been sent to
				<span class="font-semibold text-ink">{email || 'your email'}</span>. Our team will get back
				to you within 24 hours.
			</p>
			<p class="mt-4 text-sm text-ink-soft">
				Please keep this ticket ID handy when following up with us.
			</p>
		</section>
	{:else}
		{#if error}
			<div
				class="mb-6 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
			>
				<svg class="h-5 w-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"
					><path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
					/></svg
				>
				<span>{error}</span>
			</div>
		{/if}

		<!-- FAQ accordion -->
		<section class="mb-8">
			<h2 class="mb-3 text-lg font-bold text-ink">Frequently asked questions</h2>
			<div
				class="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-white shadow-soft"
			>
				{#each faqs as faq, i}
					<button
						type="button"
						onclick={() => (openFaq = openFaq === i ? null : i)}
						class="flex w-full cursor-pointer items-center justify-between gap-4 px-5 py-4 text-left"
						aria-expanded={openFaq === i}
					>
						<span class="font-semibold text-ink">{faq.q}</span>
						<svg
							class={`h-5 w-5 flex-shrink-0 text-ink-soft transition-transform ${openFaq === i ? 'rotate-180' : ''}`}
							fill="none"
							stroke="currentColor"
							viewBox="0 0 24 24"
							stroke-width="2"
							><path stroke-linecap="round" stroke-linejoin="round" d="M5 15l7-7 7 7" /></svg
						>
					</button>
					{#if openFaq === i}
						<div class="animate-[fadeIn_0.2s_ease] px-5 pb-4 text-sm text-ink-soft">{faq.a}</div>
					{/if}
				{/each}
			</div>
		</section>

		<!-- Helpful links -->
		<section class="mb-8">
			<h2 class="mb-3 text-lg font-bold text-ink">Quick self-service</h2>
			<div class="grid gap-3 sm:grid-cols-3">
				{#each helpfulLinks as link}
					<a
						href={link.href}
						class="flex items-center gap-3 rounded-xl border border-line bg-white px-4 py-3 shadow-soft transition hover:border-coral/40 hover:shadow-lift"
					>
						<span class="text-xl">{link.icon}</span>
						<span class="text-sm font-semibold text-ink">{link.label}</span>
					</a>
				{/each}
			</div>
		</section>

		<!-- Contact form -->
		<section class="rounded-2xl border border-line bg-white p-6 shadow-soft sm:p-8">
			<h2 class="text-xl font-bold text-ink">Contact support</h2>
			<p class="mt-1 text-sm text-ink-soft">
				Fill out the form and we will get back to you as soon as we can.
			</p>

			<div class="mt-6 grid gap-5 sm:grid-cols-2">
				<div>
					<label for="cs-name" class="mb-1.5 block text-sm font-semibold text-ink">Full name</label>
					<input
						id="cs-name"
						class="w-full rounded-lg border border-line bg-white px-3 py-2.5 text-sm text-ink focus:border-coral focus:outline-none"
						bind:value={name}
						readonly={isLoggedIn}
						disabled={submitting}
						placeholder="Jane Doe"
						oninput={() => clearError('name')}
					/>
					{#if fieldErrors.name}<p class="mt-1 text-xs text-red-600">{fieldErrors.name}</p>{/if}
				</div>
				<div>
					<label for="cs-email" class="mb-1.5 block text-sm font-semibold text-ink"
						>Email address</label
					>
					<input
						id="cs-email"
						type="email"
						class="w-full rounded-lg border border-line bg-white px-3 py-2.5 text-sm text-ink focus:border-coral focus:outline-none"
						bind:value={email}
						readonly={isLoggedIn}
						disabled={submitting}
						placeholder="you@example.com"
						oninput={() => clearError('email')}
					/>
					{#if fieldErrors.email}<p class="mt-1 text-xs text-red-600">{fieldErrors.email}</p>{/if}
				</div>
			</div>

			<div class="mt-5">
				<label for="cs-topic" class="mb-1.5 block text-sm font-semibold text-ink">Topic</label>
				<select
					id="cs-topic"
					class="w-full rounded-lg border border-line bg-white px-3 py-2.5 text-sm text-ink focus:border-coral focus:outline-none"
					bind:value={topic}
					disabled={submitting}
					onchange={() => {
						clearError('topic');
						if (topic !== 'order-issues') orderNumber = '';
					}}
				>
					<option value="" disabled>Select a topic…</option>
					{#each categories as c}<option value={c.value}>{c.label}</option>{/each}
				</select>
				{#if fieldErrors.topic}<p class="mt-1 text-xs text-red-600">{fieldErrors.topic}</p>{/if}
			</div>

			{#if showOrderField}
				<div class="mt-5 animate-[fadeIn_0.2s_ease]">
					<label for="cs-order" class="mb-1.5 block text-sm font-semibold text-ink"
						>Order number</label
					>
					<input
						id="cs-order"
						class="w-full rounded-lg border border-line bg-white px-3 py-2.5 text-sm text-ink focus:border-coral focus:outline-none"
						bind:value={orderNumber}
						disabled={submitting}
						placeholder="e.g. 8F2K3M"
						oninput={() => clearError('orderNumber')}
					/>
					{#if fieldErrors.orderNumber}<p class="mt-1 text-xs text-red-600">
							{fieldErrors.orderNumber}
						</p>{/if}
				</div>
			{/if}

			<div class="mt-5">
				<label for="cs-message" class="mb-1.5 block text-sm font-semibold text-ink">Message</label>
				<textarea
					id="cs-message"
					rows="5"
					class="w-full rounded-lg border border-line bg-white px-3 py-2.5 text-sm text-ink focus:border-coral focus:outline-none"
					bind:value={message}
					disabled={submitting}
					placeholder="Tell us what happened. Include the order number, what went wrong, and what you'd like us to do."
					oninput={() => clearError('message')}></textarea>
				{#if fieldErrors.message}<p class="mt-1 text-xs text-red-600">{fieldErrors.message}</p>{/if}
			</div>

			<div class="mt-5">
				<label for="cs-attachment" class="mb-1.5 block text-sm font-semibold text-ink">
					Attachment <span class="font-normal text-ink-soft">(optional)</span>
				</label>
				<label
					class="flex cursor-pointer items-center justify-between gap-3 rounded-lg border border-dashed border-line bg-cream px-4 py-3 text-sm text-ink-soft transition hover:border-coral/50"
				>
					<span class="truncate"
						>{attachmentName || 'Attach a screenshot or receipt (JPG, PNG, PDF)'}</span
					>
					<span class="flex-shrink-0 font-semibold text-coral">Choose file</span>
					<input
						id="cs-attachment"
						type="file"
						accept=".jpg,.jpeg,.png,.pdf"
						class="hidden"
						disabled={submitting}
						onchange={(e) => {
							const f = (e.currentTarget as HTMLInputElement).files?.[0];
							attachmentName = f ? f.name : '';
						}}
					/>
				</label>
				<p class="mt-1 text-xs text-ink-soft">
					Attachment upload is not yet active — note your file name in the message so we can follow
					up.
				</p>
			</div>

			{#if !isLoggedIn}
				<p class="mt-5 text-sm text-amber-700">
					You need to be signed in to send a message. You'll be taken to sign in when you submit.
				</p>
			{/if}

			<div class="mt-6 flex items-center gap-3">
				<button
					type="button"
					onclick={onSubmit}
					disabled={submitting}
					class="inline-flex items-center gap-2 rounded-full bg-coral px-6 py-3 text-sm font-bold text-white transition hover:bg-coral-dark disabled:cursor-not-allowed disabled:opacity-60"
				>
					{#if submitting}
						<svg class="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24"
							><circle
								class="opacity-25"
								cx="12"
								cy="12"
								r="10"
								stroke="currentColor"
								stroke-width="4"
							></circle><path
								class="opacity-75"
								fill="currentColor"
								d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
							></path></svg
						>
						Sending…
					{:else}
						Submit Ticket
					{/if}
				</button>
			</div>
		</section>
	{/if}
</div>
