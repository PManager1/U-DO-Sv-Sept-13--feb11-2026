<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { cart, totalItems } from './cart.svelte';
	import AddressModal from './AddressModal.svelte';
	import AddressTypeModal from './AddressTypeModal.svelte';
	import AddressDetailsModal from './AddressDetailsModal.svelte';
	import API_BASE from './api';
	import tokenManager from './tokenManager';
	import { openSignIn, openSignUp } from './authModal.svelte';
	import ScheduleModal from './ScheduleModal.svelte';
	import {
		deliveryAddress,
		setDeliveryAddress,
		ensureAddressLoaded,
		reloadAddress,
		touchAddress,
		shortAddress
	} from './address.svelte';
	import BrandSuggestions from './BrandSuggestions.svelte';
	import { storePath } from './storePath';

	let {
		onToggleSidebar,
		onToggleCart,
		home = false
	}: { onToggleSidebar: () => void; onToggleCart: () => void; home?: boolean } = $props();
	let searchOpen = $state(false);
	let searchQuery = $state('');
	let searchFocused = $state(false);
	let brandSuggestions = $state<BrandSuggestions>();

	function pickBrand(brand: any) {
		window.location.href = storePath(brand);
		searchQuery = '';
	}

	function onSearchKeydown(e: KeyboardEvent) {
		if (brandSuggestions?.handleKeydown(e)) return;
		if (e.key === 'Enter') window.location.href = '/search?q=' + encodeURIComponent(searchQuery);
	}
	let deliveryMode = $state('delivery');
	const AVAIL_USER = '694d8d3a37070a1a20678d63';
	let availSlots = $state<any[]>([]);

	function fmtDay(d: Date) {
		const today = new Date();
		today.setHours(0, 0, 0, 0);
		const tmr = new Date(today);
		tmr.setDate(tmr.getDate() + 1);
		const sd = new Date(d);
		sd.setHours(0, 0, 0, 0);
		if (sd.getTime() === today.getTime()) return 'Today';
		if (sd.getTime() === tmr.getTime()) return 'Tomorrow';
		return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
	}
	function fmtTime(t: string) {
		const [hh, mm] = t.split(':').map(Number);
		const period = hh >= 12 ? 'PM' : 'AM';
		let h = hh % 12;
		if (h === 0) h = 12;
		return `${h}:${String(mm).padStart(2, '0')} ${period}`;
	}
	function fallbackEta() {
		const h = new Date().getHours();
		if (h < 11) return 'Delivery by Today 3:00 PM';
		if (h < 15) return 'Delivery by Today 6:00 PM';
		return 'Delivery by Tomorrow 12:00 PM';
	}
	const deliveryEta = $derived.by(() => {
		if (availSlots.length === 0) return fallbackEta();
		const now = new Date();
		let best: { date: string; startTime: string } | null = null;
		for (const a of availSlots) {
			if (!a.date || !a.startTime) continue;
			const dt = new Date(`${a.date}T${a.startTime}`);
			if (isNaN(dt.getTime()) || dt <= now) continue;
			if (!best || dt < new Date(`${best.date}T${best.startTime}`))
				best = { date: a.date, startTime: a.startTime };
		}
		if (!best) return fallbackEta();
		const d = new Date(`${best.date}T${best.startTime}`);
		return `Delivery by ${fmtDay(d)} ${fmtTime(best.startTime)}`;
	});
	let addressModalOpen = $state(false);
	let scheduleModalOpen = $state(false);
	let addressTypeOpen = $state(false);
	let selectedAddressType = $state('house');
	let addressDetailsOpen = $state(false);
	let editingAddressId = $state<string | null>(null);
	let deliveryPreference = $state('leave_at_door');
	let deliveryInstructions = $state('');
	let personalLabel = $state('none');
	let isGifting = $state(false);
	let savingAddress = $state(false);
	const totalCount = $derived(totalItems());

	let isLoggedIn = $state(false);
	let userName = $state('');
	let userInitials = $state('');
	let dropdownOpen = $state(false);

	onMount(() => {
		const closeDropdown = () => (dropdownOpen = false);
		document.addEventListener('mousedown', closeDropdown);

		ensureAddressLoaded();

		fetch(API_BASE + 'availabilities?userId=' + AVAIL_USER)
			.then((r) => (r.ok ? r.json() : []))
			.then((data) => {
				if (Array.isArray(data)) availSlots = data;
			})
			.catch(() => {});

		const headers = tokenManager.getHeaders();
		if (!headers.Authorization) return;
		fetch(API_BASE + 'me', { headers })
			.then((r) => r.json())
			.then((data) => {
				const user = data.user || data;
				const first = user.firstName || '';
				const last = user.lastName || '';
				const fullName = [first, last].filter(Boolean).join(' ') || 'User';
				userName = fullName;
				const initials = [first, last]
					.filter(Boolean)
					.map((n) => n.charAt(0).toUpperCase())
					.join('');
				if (initials) userInitials = initials;
				isLoggedIn = true;
			})
			.catch(() => {});

		return () => document.removeEventListener('mousedown', closeDropdown);
	});

	async function handleSignOut() {
		tokenManager.clearAllTokens();
		try {
			const { supabase } = await import('./supabase');
			await supabase.auth.signOut();
		} catch {
			// Supabase not configured — fall back to backend token clear only
		}
		await goto('/login/');
	}

	async function handleSaveAddress(savedLabel?: string) {
		if (savingAddress) return;
		savingAddress = true;
		try {
			const headers = tokenManager.getHeaders();
			if (!headers.Authorization) {
				window.location.href = '/login/';
				return;
			}
			const lbl = savedLabel !== undefined ? savedLabel : personalLabel;
			const body = {
				street: deliveryAddress.value,
				cityStateZip: '',
				latitude: 0,
				longitude: 0,
				label: lbl === 'none' ? '' : lbl,
				addressType: selectedAddressType,
				deliveryPreference,
				deliveryInstructions,
				isGifting
			};
			try {
				const res = await fetch(
					editingAddressId ? API_BASE + 'addresses/' + editingAddressId : API_BASE + 'addresses',
					{
						method: editingAddressId ? 'PUT' : 'POST',
						headers,
						body: JSON.stringify(body)
					}
				);
				if (res.ok) {
					addressDetailsOpen = false;
					addressTypeOpen = false;
					addressModalOpen = false;
					editingAddressId = null;
					const data = await res.json().catch(() => ({}));
					const addressId = data.id || data._id;
					touchAddress(addressId);
					await fetch(API_BASE + 'addresses/' + addressId + '/set-default', {
						method: 'PUT',
						headers
					})
					.then(() => reloadAddress())
					.catch(() => {});
				} else {
					const data = await res.json().catch(() => ({}));
					console.error('Failed to save address:', data.message || data.error || res.status);
				}
			} catch (err) {
				console.error('Network error saving address:', err);
			}
		} finally {
			savingAddress = false;
		}
	}
</script>

<header
	class="sticky top-0 z-50 border-b border-[#e5e5e5] bg-white/85 shadow-sm backdrop-blur-md transition-all duration-300"
>
	<div class="mx-auto max-w-[1400px] px-4 sm:px-8">
		<!-- Mobile row -->
		<div class="flex h-14 items-center justify-between md:hidden">
			<button onclick={onToggleSidebar} class="-ml-2 p-2 text-gray-700">
				<svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"
					><path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M4 6h16M4 12h16M4 18h16"
					/></svg
				>
			</button>
			<a href="/" class="flex-shrink-0 text-xl font-bold"
				><span class="text-orange-500">U-</span><span class="text-gray-800">DO</span></a
			>
			<div class="flex items-center gap-1">
				<button onclick={() => (searchOpen = !searchOpen)} class="p-2 text-gray-600">
					<svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"
						><path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
						/></svg
					>
				</button>
				<button onclick={onToggleCart} class="relative p-2 text-gray-600">
					<svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"
						><path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 100 4 2 2 0 000-4z"
						/></svg
					>
					{#if totalCount > 0}<span
							class="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white"
							>{totalCount > 9 ? '9+' : totalCount}</span
						>{/if}
				</button>
			</div>
		</div>

		{#if searchOpen}
			<div class="pb-3 md:hidden">
				<div class="relative">
					<input
						type="text"
						placeholder="Search stores, or items..."
						bind:value={searchQuery}
						onkeydown={onSearchKeydown}
						onfocus={() => (searchFocused = true)}
						onblur={() => setTimeout(() => (searchFocused = false), 150)}
						class="w-full rounded-full border border-gray-400 bg-white py-2.5 pr-4 pl-10 text-sm focus:ring-2 focus:ring-gray-400/50 focus:outline-none"
						autofocus
					/>
					<svg
						class="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-gray-500"
						fill="none"
						stroke="currentColor"
						viewBox="0 0 24 24"
						><path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
						/></svg
					>
					<BrandSuggestions
						bind:this={brandSuggestions}
						query={searchQuery}
						focused={searchFocused}
						onPick={pickBrand}
					/>
				</div>
			</div>
		{/if}

		<!-- Mobile Delivery / Pickup toggle -->
		<div class="pt-2 pb-3 md:hidden">
			<div
				class="grid cursor-pointer grid-cols-2 gap-0.5 rounded-full border border-[#e5e5e5] bg-gray-100 p-0.5 shadow-inner"
			>
				<button
					onclick={() => (deliveryMode = 'delivery')}
					class={`cursor-pointer rounded-full px-4 py-2 text-center text-xs font-semibold transition-all duration-200 ${deliveryMode === 'delivery' ? 'bg-white text-orange-600 shadow-lift' : 'text-gray-500'}`}
					>Delivery</button
				>
				<button
					onclick={() => (deliveryMode = 'pickup')}
					class={`cursor-pointer rounded-full px-4 py-2 text-center text-xs font-semibold transition-all duration-200 ${deliveryMode === 'pickup' ? 'bg-white text-orange-600 shadow-lift' : 'text-gray-500'}`}
					>Pickup</button
				>
			</div>
		</div>

		<!-- Desktop row -->
		<div class="hidden h-16 shrink-0 items-center gap-4 md:flex">
			<button
				onclick={onToggleSidebar}
				class="-ml-2 p-2 text-gray-700 transition hover:text-orange-500"
			>
				<svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"
					><path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M4 6h16M4 12h16M4 18h16"
					/></svg
				>
			</button>
			<a
				href="/"
				class={`${home ? 'text-[28px]' : 'text-2xl'} flex-shrink-0 font-bold tracking-tight`}
				><span class="text-orange-500">U-</span><span class="text-gray-800">DO</span></a
			>
			<div class="max-w-2xl flex-1">
				<div class="relative">
					<input
						type="text"
						placeholder="Search stores, or items..."
						bind:value={searchQuery}
						onkeydown={onSearchKeydown}
						onfocus={() => (searchFocused = true)}
						onblur={() => setTimeout(() => (searchFocused = false), 150)}
						class="w-full rounded-full border border-[#e5e5e5] bg-white py-2.5 pr-12 pl-5 text-sm shadow-sm transition focus:ring-2 focus:ring-orange-400/50 focus:outline-none"
					/>
					<svg
						class="absolute top-1/2 right-4 h-5 w-5 -translate-y-1/2 text-orange-500"
						fill="none"
						stroke="currentColor"
						viewBox="0 0 24 24"
						><path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
						/></svg
					>
					<BrandSuggestions
						bind:this={brandSuggestions}
						query={searchQuery}
						focused={searchFocused}
						onPick={pickBrand}
					/>
				</div>
			</div>
			<div
				class="grid flex-shrink-0 cursor-pointer grid-cols-2 gap-0.5 rounded-full border border-[#e5e5e5] bg-gray-100 p-0.5 shadow-inner"
			>
				<button
					onclick={() => (deliveryMode = 'delivery')}
					class={`cursor-pointer rounded-full px-4 py-2 text-center text-xs font-semibold transition-all duration-200 ${deliveryMode === 'delivery' ? 'bg-white text-orange-600 shadow-lift' : 'text-gray-500 hover:text-gray-700'}`}
					>Delivery</button
				>
				<button
					onclick={() => (deliveryMode = 'pickup')}
					class={`cursor-pointer rounded-full px-4 py-2 text-center text-xs font-semibold transition-all duration-200 ${deliveryMode === 'pickup' ? 'bg-white text-orange-600 shadow-lift' : 'text-gray-500 hover:text-gray-700'}`}
					>Pickup</button
				>
			</div>
			<div
				class="inline-flex h-10 min-w-[280px] flex-shrink-0 items-center rounded-full bg-gray-100 p-1"
			>
				<button
					onclick={() => (addressModalOpen = true)}
					class="flex min-w-0 flex-shrink-0 cursor-pointer items-center gap-1.5 rounded-full px-3 py-1.5 text-sm whitespace-nowrap transition-colors duration-150 ease-in-out hover:bg-gray-200"
				>
					<svg
						class="h-4 w-4 flex-shrink-0 text-gray-600"
						fill="none"
						stroke="currentColor"
						viewBox="0 0 24 24"
						><path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
						/><path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
						/></svg
					>
					<span class="max-w-[140px] truncate text-black lg:max-w-[180px]"
						>{deliveryAddress.value
							? shortAddress(deliveryAddress.value)
							: 'Please input your address.'}</span
					>
					<svg
						class="h-3 w-3 flex-shrink-0 text-gray-400"
						fill="none"
						stroke="currentColor"
						viewBox="0 0 24 24"
						><path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M19 9l-7 7-7-7"
						/></svg
					>
				</button>
				<span
					class="pointer-events-none my-1 w-px flex-shrink-0 self-stretch bg-gray-200"
					aria-hidden="true"
				></span>
				<button
					onclick={() => (scheduleModalOpen = true)}
					class="flex min-w-0 flex-shrink-0 cursor-pointer items-center gap-1 rounded-full px-3 py-1.5 text-sm font-semibold whitespace-nowrap text-[#B7410E] transition-colors duration-150 ease-in-out hover:bg-gray-200"
				>
					<span class="truncate">{deliveryEta}</span>
					<svg
						class="h-3 w-3 flex-shrink-0 text-gray-400"
						fill="none"
						stroke="currentColor"
						viewBox="0 0 24 24"
						><path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M19 9l-7 7-7-7"
						/></svg
					>
				</button>
			</div>
			<button class="relative flex-shrink-0 p-2 text-gray-600 transition hover:text-orange-500 cursor-pointer">
				<svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"
					><path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
					/></svg
				>
			</button>
			<button
				onclick={onToggleCart}
				class="relative flex-shrink-0 cursor-pointer p-2 text-gray-600 transition hover:text-orange-500"
			>
				<svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"
					><path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 100 4 2 2 0 000-4z"
					/></svg
				>
				{#if totalCount > 0}<span
						class="absolute -top-0.5 -right-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white"
						>{totalCount > 99 ? '99+' : totalCount}</span
					>{/if}
			</button>
			{#if isLoggedIn}
				<div
					class="relative flex-shrink-0"
					onclick={(e) => e.stopPropagation()}
					onmousedown={(e) => e.stopPropagation()}
				>
					<button
						onclick={() => (dropdownOpen = !dropdownOpen)}
						class="flex cursor-pointer items-center gap-2 rounded-full border border-gray-200 px-2 py-1.5 transition hover:bg-gray-100"
					>
						<div
							class="flex h-7 w-7 items-center justify-center rounded-full bg-orange-500 text-xs font-semibold text-white"
						>
							{userInitials}
						</div>
						<svg class="h-3 w-3 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"
							><path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M19 9l-7 7-7-7"
							/></svg
						>
					</button>
					{#if dropdownOpen}
						<div
							class="absolute top-full right-0 z-50 mt-2 w-56 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl"
						>
							<div class="border-b border-gray-100 px-4 py-3">
								<a
									href="/profile/"
									class="block cursor-pointer text-sm font-semibold transition hover:text-orange-500"
									>{userName}</a
								>
							</div>
							<div class="py-1">
								<a
									href="/settings/"
									onclick={() => (dropdownOpen = false)}
									class="block px-4 py-2.5 text-sm hover:bg-gray-50">Settings</a
								>
							</div>
							<div class="border-t border-gray-100">
								<button
									onclick={() => {
										dropdownOpen = false;
										handleSignOut();
									}}
									class="w-full cursor-pointer px-4 py-2.5 text-left text-sm text-red-600 hover:bg-gray-50"
									>Sign Out</button
								>
							</div>
						</div>
					{/if}
				</div>
			{:else}
				<div class="flex flex-shrink-0 items-center gap-2">
					<a
						href="/login/"
						onclick={(e) => {
							e.preventDefault();
							openSignIn();
						}}
						class="text-sm font-semibold text-black transition hover:text-orange-500">Sign In</a
					>
					<a
						href="/signup/"
						onclick={(e) => {
							e.preventDefault();
							openSignUp();
						}}
						class="rounded-full bg-orange-500 px-4 py-1.5 text-sm font-bold text-white transition hover:bg-orange-600"
						>Sign Up</a
					>
				</div>
			{/if}
		</div>
	</div>
</header>

<ScheduleModal
	open={scheduleModalOpen}
	onClose={() => (scheduleModalOpen = false)}
	onSelect={() => (scheduleModalOpen = false)}
/>

<AddressModal
	open={addressModalOpen}
	currentAddress={deliveryAddress.value}
	onClose={() => (addressModalOpen = false)}
	onSelect={(a: string) => setDeliveryAddress(a)}
	onSelectNew={(a: string) => {
		editingAddressId = null;
		setDeliveryAddress(a);
		addressTypeOpen = true;
	}}
	onEdit={(a: any) => {
		editingAddressId = a.id;
		setDeliveryAddress(a.street || '');
		selectedAddressType = a.addressType || 'house';
		deliveryPreference = a.deliveryPreference || 'leave_at_door';
		deliveryInstructions = a.deliveryInstructions || '';
		personalLabel = a.label || 'none';
		isGifting = !!a.isGifting;
		addressModalOpen = false;
		addressTypeOpen = true;
	}}
/>
<AddressTypeModal
	open={addressTypeOpen}
	address={deliveryAddress.value}
	bind:selectedType={selectedAddressType}
	onNext={() => {
		addressTypeOpen = false;
		addressDetailsOpen = true;
	}}
	onBack={() => (addressTypeOpen = false)}
	onClose={() => (addressTypeOpen = false)}
/>
<AddressDetailsModal
    open={addressDetailsOpen}
    bind:address={deliveryAddress.value}
    bind:deliveryPreference
    bind:deliveryInstructions
    bind:personalLabel
    bind:isGifting
    saving={savingAddress}
    onSave={handleSaveAddress}
    onBack={() => {
        addressDetailsOpen = false;
        addressTypeOpen = true;
    }}
    onClose={() => (addressDetailsOpen = false)}
/>
