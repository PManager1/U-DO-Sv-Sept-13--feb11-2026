<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import {
		cart,
		totalItems,
		totalPrice,
		clearActiveCartAfterCheckout,
		flushSave,
		hydrateCart,
		extractImages
	} from '$lib/cart.svelte';
	import AddressModal from '$lib/AddressModal.svelte';
	import PaymentMethodsModal from '$lib/PaymentMethodsModal.svelte';
	import ScheduleModal from '$lib/ScheduleModal.svelte';
	import BackButton from '$lib/BackButton.svelte';
	import { decodeCartIds, decodeCartItems } from '$lib/cartUrl';
	import { fetchStoreById, fetchStoreMenu } from '$lib/storefront';
	import { slugify } from '$lib/slug';
	import API_BASE from '$lib/api';
	import tokenManager from '$lib/tokenManager';
	import { openSignIn } from '$lib/authModal.svelte';
	

	let address = $state('');
	let addressModalOpen = $state(false);
	let deliveryAddress = $state<{
		street: string;
		city: string;
		state: string;
		zip: string;
		instructions?: string;
	} | null>(null);
	let paymentModalOpen = $state(false);
	let mode = $state('delivery'); // delivery | pickup
	let speed = $state('standard');
	let scheduleModalOpen = $state(false);
	let scheduleNotice = $state('');
	let schedule = $state<string | null>(null);
	let scheduleMeta = $state<{
		date: string;
		slotId: string;
		startTime: string;
		endTime: string;
	} | null>(null);
	let orderError = $state('');
	let card = $state('Visa •••• 4242');
	let promoOpen = $state(false);
	let promoCode = $state('');
	let promoApplied = $state(false);
	let shareConsent = $state(true);
	let placed = $state(false);
	let brandType = $state('');
	let isGrocery = $state(false);
	let userId = $state('');
	let tipPct = $state<number | 'custom'>(0);
	let customTipAmount = $state(5);


	
	const DELIVERY_OPTIONS = [
		// { id: 'priority', title: 'Priority', desc: 'As soon as possible', fee: 4.99, badge: null },
		// { id: 'standard', title: 'Standard', desc: 'Delivered within 2 hours', fee: 0, badge: 'Fast' },
		{ id: 'schedule', title: 'Schedule', desc: 'Pick a delivery time later', fee: 0, badge: null }
	];

	const itemCount = $derived(totalItems());
	const subtotal = $derived(totalPrice());
	const retailer = $derived(cart.storeName || 'pick a store');
	const savings = promoApplied ? 6.99 : 4.7;
	const deliveryFee = $derived(mode === 'pickup' ? 0 : speed === 'priority' ? 4.99 : 2.99);
	const priorityFee = $derived(speed === 'priority' ? 4.99 : 0);
	const serviceFee = 1.5;
	const taxes = $derived(+(subtotal * 0.08).toFixed(2));
	const tip = $derived(
		tipPct === 'custom'
			? +(Number(customTipAmount) || 0).toFixed(2)
			: +(subtotal * (tipPct / 100)).toFixed(2)
	);
	const total = $derived(+(subtotal + deliveryFee + serviceFee + taxes + tip).toFixed(2));

	onMount(async () => {
		// Fetch user's default address from backend
		try {
			const headers = tokenManager.getHeaders();
			if (headers.Authorization) {
				const res = await fetch(API_BASE + 'addresses', { headers });
				if (res.ok) {
					const data = await res.json();
					const list = Array.isArray(data) ? data : data.addresses || [];
					if (list.length > 0) {
						const first = list[0];
						address =
							[first.street, first.cityStateZip].filter(Boolean).join(', ') || first.street || '';
					}
				}
			}
		} catch {
			// ignore errors, address will remain empty
		}

		const itemsParam = page.url.searchParams.get('items');
		const storeParam = page.url.searchParams.get('store');
		const storeNameParam = page.url.searchParams.get('storeName');
		const storeLogoParam = page.url.searchParams.get('storeLogo');

		// Immediately seed store details from URL params so the logo renders synchronously
		if (storeNameParam) cart.storeName = storeNameParam;
		if (storeLogoParam) cart.storeLogo = storeLogoParam;

		// Logged-in users: the backend `carts` API is the source of truth for the
		// active store's cart (reconciles changes made in another tab/session).
		const loggedIn = cart.isLoggedIn || !!tokenManager.hasValidToken();
		if (loggedIn && (cart.activeStoreId || storeParam)) {
			try {
				const res = await fetch(API_BASE + 'carts', { headers: tokenManager.getHeaders() });
				if (res.ok) {
					const data = await res.json();
					const list = Array.isArray(data) ? data : data.carts || [];
					const targetStoreId = cart.activeStoreId || storeParam;
					const c = list.find((cc: any) => cc.brandId === targetStoreId);
					if (c && Array.isArray(c.items)) {
						cart.storeName = c.brandName || cart.storeName;
						cart.storeLogo = c.brandLogo || cart.storeLogo;
						hydrateCart(c.items.map((it: any) => ({ ...it })));
					}
				}
			} catch {
				/* keep current cart */
			}
		}

		// Guest fallback: hydrate from URL query params only when not logged in.
		if (loggedIn || !itemsParam || !storeParam || cart.items.length > 0) return;
		// Prefer the enriched JSON format (carries images, note, replacements).
		const enriched = decodeCartItems(itemsParam);
		if (enriched && enriched.length > 0) {
			(async () => {
				try {
					const storeRes = await fetchStoreById(storeParam);
					const s = storeRes.store;
					if (!s) return;
					isGrocery = s.brandType === 'grocery';
					brandType = s.brandType || '';
					// 👈 ADD THIS LINE HERE TO CATCH THE STORE LOGO TOO:
					cart.storeLogo = cart.storeLogo || s.logo || s.image || '';
					hydrateCart(
						enriched.map((it) => ({
							...it,
							storeId: storeParam,
							storeName: s.name,
							storeLogo: s.logo || ''
						}))
					);
				} catch {
					/* leave cart empty */
				}
			})();
		} else {
			const idQty = decodeCartIds(itemsParam);
			if (!idQty || idQty.length === 0) return;
			(async () => {
				try {
					const storeRes = await fetchStoreById(storeParam);
					const s = storeRes.store;
					if (!s) return;
					const isGrocery = s.brandType === 'grocery';
					const menuRes = await fetchStoreMenu(storeParam, isGrocery);
					const lookup: Record<string, any> = {};
					(menuRes.menu || []).forEach((section: any) =>
						(section.items || []).forEach((it: any) => {
							const key = it.id || slugify(it.name);
							lookup[key] = it;
						})
					);
					const rebuilt = idQty
						.map(({ id, qty }) => {
							const it = lookup[id];
							if (!it) return null;
							return {
								productId: id,
								name: it.name,
								price: it.price,
								quantity: qty,
								images: extractImages(it),
								image: it.raw_image_url || '',
								storeId: storeParam,
								storeName: s.name,
								storeLogo: s.logo || ''
							};
						})
						.filter(Boolean);
					if (rebuilt.length > 0) hydrateCart(rebuilt);
				} catch {
					/* leave cart empty */
				}
			})();
		}

		// Determine brand type (grocery/restaurant) for the order.
		if (cart.storeId) {
			fetchStoreById(cart.storeId)
				.then((res: any) => {
					const s = res?.store;
					if (s) {
						brandType = s.brandType || '';
						isGrocery = s.brandType === 'grocery';
					}
				})
				.catch(() => {});
		}

		// Capture the logged-in user id.
		const hdrs = tokenManager.getHeaders();
		if (hdrs.Authorization) {
			fetch(API_BASE + 'me', { headers: hdrs })
				.then((r) => (r.ok ? r.json() : null))
				.then((data) => {
					const u = data?.user || data;
					if (u?.id) userId = u.id;
				})
				.catch(() => {});
		}
	});

	async function confirmOrder() {
		if (!tokenManager.hasValidToken()) {
			openSignIn('Please sign in to submit your order.');
			return;
		}
		if (!schedule) {
			scheduleNotice = 'Please select a delivery date & time to continue with your order.';
			scheduleModalOpen = true;
			return;
		}
		scheduleNotice = '';
		orderError = '';
		const ok = await placeOrder();
		if (!ok) return;
		placed = true;
		await clearActiveCartAfterCheckout();
	}

	async function placeOrder(): Promise<boolean> {
		try {
			// Persist the active store's cart before submitting (scoped snapshot).
			await flushSave();
			// 👇 ADD THIS LINE RIGHT HERE TO POPULATE userId 👇

            // userId = tokenManager.getUserId ? tokenManager.getUserId() : (tokenManager.getToken ? tokenManager.getToken()?.userId : '') || '';
			// 👇 ADD THIS PARSER TO EXTRACT THE userId FROM THE JWT TOKEN 👇
            try {
                const token = tokenManager.getToken();
                if (token) {
                    const base64Url = token.split('.')[1];
                    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
                    const jsonPayload = decodeURIComponent(atob(base64).split('').map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)).join(''));
                    const claims = JSON.parse(jsonPayload);
                    userId = claims.sub || claims.userId || '';
                }
            } catch (e) {
                console.error('Failed to parse userId from token', e);
            }
			
			let brandLogo = cart.storeLogo || '';

			if (!brandType && cart.storeId) {
				try {
					const sres = await fetchStoreById(cart.storeId);
					const s = sres?.store;
					if (s) {
						brandType = s.brandType || '';
						isGrocery = s.brandType === 'grocery';
					}
				} catch {
					/* keep current */
				}
			}
			const items = (cart.items || []).map((i: any) => ({
				productId: i.productId || '',
				sku: i.sku || '',
				nameSnapshot: i.name || '',
				pricePaid: i.price || 0,
				quantity: i.quantity || 1,
				aisle: i.aisle || '',
				image: i.image || (Array.isArray(i.images) && i.images[0]) || '',
				images: Array.isArray(i.images) ? i.images.filter(Boolean).slice(0, 4) : [],
				note: i.note || '',
				replacements: Array.isArray(i.replacements) ? i.replacements : []
			}));
			const urlStoreId = page.url.searchParams.get('store') || '';
			const brandId = urlStoreId || cart.storeId || cart.activeStoreId || '';
			const brandName = cart.storeName || '';
			
			if (!brandLogo && brandId && cart.otherCarts?.[brandId]) {
                brandLogo = cart.otherCarts[brandId].brandLogo || '';
            }

			if (!brandId) {
				orderError = 'No store selected. Please add items from a store to continue.';
				return false;
			}
			const payload = {
				userId,
				brandId,
				brandName,
				brandLogo, // 👈
				brandType,
				isGrocery,
				status: 'pending',
				totalAmount: total,
				subtotal,
				deliveryFee,
				serviceFee,
				tax: taxes,
				tip,
				orderType: mode,
				deliveryInfo: {
					address,
					street: deliveryAddress?.street || '',
					city: deliveryAddress?.city || '',
					state: deliveryAddress?.state || '',
					zip: deliveryAddress?.zip || '',
					instructions: deliveryAddress?.instructions || ''
				},
				...(scheduleMeta
					? {
							deliverySchedule: {
								date: scheduleMeta.date,
								slotId: scheduleMeta.slotId,
								startTime: scheduleMeta.startTime,
								endTime: scheduleMeta.endTime
							}
						}
					: {}),
				items
			};
			const res = await fetch(API_BASE + 'checkout/order', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json', ...tokenManager.getHeaders() },
				body: JSON.stringify(payload)
			});
			if (res.status === 409) {
				let errMsg = 'A database conflict occurred. Please try again.';
				try {
					const errData = await res.json();
					errMsg = errData.message || errData.error || errMsg;
				} catch {}
				orderError = errMsg;
				console.error('Order 409 conflict:', errMsg);
				return false;
			}
			if (!res.ok) {
				console.error('Order save failed', await res.text());
				orderError = 'Something went wrong placing your order. Please try again.';
				return false;
			}
			const data = await res.json();
			await goto('/orders/');
			return false;
		} catch (e) {
			console.error('Order save error', e);
			orderError = 'Something went wrong placing your order. Please try again.';
			return false;
		}
	}

	function applyPromo() {
		promoApplied = !!promoCode.trim();
		promoCode = '';
		promoOpen = false;
	}
</script>

<svelte:head><title>Checkout · U-DO</title></svelte:head>

{#if placed}
	<div class="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center text-center">
		<div class="mb-4 text-6xl">🎉</div>
		<h1 class="text-2xl font-bold text-black">Order placed!</h1>
		<p class="mt-2 text-sm text-gray-600">
			Your order from {retailer} is on its way. We'll send you updates by text.
		</p>
		<a
			href="/"
			class="mt-6 rounded-full bg-gradient-to-r from-orange-500 to-orange-600 px-6 py-3 text-sm font-bold text-white shadow-lg shadow-orange-500/30 transition hover:from-orange-600 hover:to-orange-700"
			>Continue shopping</a
		>

		<a
			href="/orders"
			class="mt-6 rounded-full bg-gradient-to-r from-orange-500 to-orange-600 px-6 py-3 text-sm font-bold text-white shadow-lg shadow-orange-500/30 transition hover:from-orange-600 hover:to-orange-700"
			>View Order Details</a
		>
	</div>
{:else}
	<div class="min-h-screen bg-gradient-to-br from-[#fbfaf8] via-[#f8f6f3] to-[#f1ede8]">
		<div class="mx-auto max-w-6xl px-3 py-8 sm:px-6">
			<!-- Header -->
			<div class="relative mb-8 flex items-center justify-center">
				<BackButton fallback="/" />
				<div class="text-center">
					<div class="flex items-center justify-center gap-3">
						{#if cart.storeLogo}
							<img
								src={cart.storeLogo}
								alt={retailer}
								class="h-10 w-10 rounded-xl object-cover shadow-sm ring-1 ring-black/[0.06]"
							/>
						{:else}
							<div
								class="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-500 text-lg font-bold text-white shadow-sm"
							>
								{(retailer || 'S').charAt(0)}
							</div>
						{/if}
						<h1 class="text-3xl font-extrabold tracking-tight text-black">Checkout</h1>
					</div>
					<div
						class="mx-auto mt-2 h-1 w-12 rounded-full bg-gradient-to-r from-orange-400 to-orange-600"
					></div>
					<p class="mt-2 text-sm text-gray-600">Secure checkout • from {retailer}</p>
				</div>
			</div>

			<div class="flex flex-col gap-8 lg:flex-row">
				<!-- LEFT COLUMN -->
				<div class="space-y-4 lg:w-[65%]">
					<!-- Deliver To -->
					<div
						class="rounded-2xl bg-white p-6 shadow-[0_8px_30px_rgba(0,0,0,0.06)] ring-1 ring-black/[0.06]"
					>
						<div class="flex items-start justify-between gap-3">
							<div>
								<p class="text-sm font-semibold text-black">Deliver to</p>
								<div class="mt-1 flex items-center gap-1.5 text-sm text-black">
									<svg
										class="h-4 w-4 text-orange-500"
										fill="none"
										stroke="currentColor"
										viewBox="0 0 24 24"
										stroke-width="2"
										><path
											stroke-linecap="round"
											stroke-linejoin="round"
											d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
										/><path
											stroke-linecap="round"
											stroke-linejoin="round"
											d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
										/></svg
									>
									{address}
								</div>
								<p class="mt-0.5 text-xs text-black">
									Delivery instructions can be added at checkout
								</p>
							</div>
							<button
								onclick={() => (mode = mode === 'delivery' ? 'pickup' : 'delivery')}
								class="flex-shrink-0 text-sm font-semibold text-orange-600 hover:text-orange-700"
								>{mode === 'delivery' ? 'Switch to pickup' : 'Switch to delivery'}</button
							>
						</div>
						<button
							onclick={() => (addressModalOpen = true)}
							class="mt-4 flex w-full items-center justify-between rounded-xl bg-gray-50 px-3 py-2.5 text-sm text-black ring-1 ring-black/[0.04] transition hover:bg-gray-100"
						>
							<span class="flex items-center gap-2">
								<svg
									class="h-4 w-4 text-gray-400"
									fill="none"
									stroke="currentColor"
									viewBox="0 0 24 24"
									stroke-width="2"
									><path
										stroke-linecap="round"
										stroke-linejoin="round"
										d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125"
									/></svg
								>
								Edit address
							</span>
							<svg
								class="h-4 w-4 text-gray-300"
								fill="none"
								stroke="currentColor"
								viewBox="0 0 24 24"
								><path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M9 5l7 7-7 7"
								/></svg
							>
						</button>
					</div>

					<!-- Delivery speed -->
					<div
						class="cursor-pointer rounded-2xl bg-white p-6 shadow-[0_8px_30px_rgba(0,0,0,0.06)] ring-1 ring-black/[0.06]"
					>
						<p class="mb-3 text-sm font-semibold text-black">Delivery speed</p>
						<div class="space-y-2.5">
							{#each DELIVERY_OPTIONS as opt}
								<button
									onclick={() => {
										if (opt.id === 'schedule') {
											scheduleModalOpen = true;
											return;
										}
										speed = opt.id;
									}}
									class={`flex w-full cursor-pointer items-center justify-between rounded-xl border-2 px-4 py-3 transition ${speed === opt.id ? 'border-orange-400 bg-orange-50 shadow-lg ring-2 shadow-orange-500/10 ring-orange-500/60' : 'border-black/[0.06] bg-white hover:border-black/[0.14]'}`}
								>
									<div class="flex items-center gap-3">
										<span
											class={`flex h-4 w-4 items-center justify-center rounded-full border-2 ${speed === opt.id ? 'border-orange-500' : 'border-gray-300'}`}
										>
											{#if speed === opt.id}<span class="h-2 w-2 rounded-full bg-orange-500"
												></span>{/if}
										</span>
										<div class="text-left">
											<p class="flex items-center gap-2 text-sm font-semibold text-black">
												{opt.title}{#if opt.badge}<span
														class="rounded-full bg-green-100 px-1.5 py-0.5 text-[10px] font-bold text-green-700"
														>{opt.badge}</span
													>{/if}
											</p>
											<p class="text-xs text-black">
												{opt.id === 'schedule' && schedule ? `Delivery on ${schedule}` : opt.desc}
											</p>
										</div>
									</div>
									<span class="text-sm font-semibold text-black"
										>{opt.fee === 0 ? 'Free' : `+$${opt.fee.toFixed(2)}`}</span
									>
								</button>
							{/each}
						</div>
					</div>

					<!-- Payment & promos -->
					<div
						class="space-y-4 rounded-2xl bg-white p-6 shadow-[0_8px_30px_rgba(0,0,0,0.06)] ring-1 ring-black/[0.06]"
					>
						<div class="flex items-center justify-between">
							<p class="text-sm font-semibold text-black">Payment method</p>
							<button
								onclick={() => (paymentModalOpen = true)}
								class="text-sm font-semibold text-orange-600 hover:text-orange-700">Edit</button
							>
						</div>
						<div class="flex items-center gap-3 rounded-xl px-3 py-3 ring-1 ring-black/[0.06]">
							<div
								class="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50 text-xs font-bold text-blue-600"
							>
								VISA
							</div>
							<span class="text-sm text-gray-700">{card}</span>
						</div>

						<div class="border-t border-black/[0.06] pt-4">
							<button
								onclick={() => (promoOpen = !promoOpen)}
								class="flex w-full items-center justify-between text-sm font-semibold text-black"
							>
								Offers and promo codes
								<svg
									class={`h-4 w-4 text-gray-400 transition-transform ${promoOpen ? 'rotate-180' : ''}`}
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
							{#if promoOpen}
								<div class="mt-3 flex gap-2">
									<input
										type="text"
										bind:value={promoCode}
										placeholder="Enter code"
										class="flex-1 rounded-xl border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-orange-400 focus:outline-none"
									/>
									<button
										onclick={applyPromo}
										class="rounded-xl bg-gradient-to-r from-orange-500 to-orange-600 px-4 py-2 text-sm font-semibold text-white transition hover:from-orange-600 hover:to-orange-700"
										>Apply</button
									>
								</div>
							{/if}
							{#if promoApplied}<p class="mt-2 text-xs font-medium text-green-600">
									✓ Promo applied
								</p>{/if}
						</div>
					</div>
				</div>

				<!-- RIGHT COLUMN (summary) -->
				<div class="lg:w-[35%]">
					<div class="space-y-4 lg:sticky lg:top-24">
						<div
							class="overflow-hidden rounded-2xl bg-white shadow-xl ring-1 shadow-gray-200/70 ring-black/5"
						>
							<div class="border-b border-black/[0.06] p-6">
								<div class="flex items-center gap-3">
									{#if cart.storeLogo}
										<img
											src={cart.storeLogo}
											alt={retailer}
											class="h-9 w-9 rounded-lg object-cover ring-1 ring-black/[0.06]"
										/>
									{:else}
										<div
											class="flex h-9 w-9 items-center justify-center rounded-lg bg-orange-500 text-base font-bold text-white"
										>
											{(retailer || 'S').charAt(0)}
										</div>
									{/if}
									<div class="min-w-0 flex-1">
										<p class="text-sm font-semibold text-black">{retailer}</p>
										<p class="mt-0.5 truncate text-xs text-gray-600">
											{mode === 'pickup' ? 'Pickup' : 'Delivery'} • {address}
										</p>
									</div>
								</div>
								<button
									onclick={confirmOrder}
									class="mt-4 w-full cursor-pointer rounded-xl bg-orange-500 py-3.5 text-base font-bold text-white shadow-lg shadow-orange-500/30 transition hover:bg-orange-600 active:scale-[0.98]"
									>Place Order</button
								>
								{#if orderError}
									<p class="mt-3 text-sm font-semibold text-red-600">{orderError}</p>
								{/if}
							</div>

							<div class="flex items-center gap-2 border-b border-green-100 bg-green-50 px-6 py-3">
								<svg
									class="h-4 w-4 text-green-600"
									fill="none"
									stroke="currentColor"
									viewBox="0 0 24 24"
									stroke-width="2"
									><path
										stroke-linecap="round"
										stroke-linejoin="round"
										d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
									/></svg
								>
								<p class="text-sm font-semibold text-green-700">
									You're saving ${savings.toFixed(2)}
								</p>
							</div>

							<div class="space-y-2 p-6 text-sm">
								<div class="flex justify-between font-semibold text-black">
									<span>Subtotal ({itemCount} items)</span><span>${subtotal.toFixed(2)}</span>
								</div>
								<div class="flex justify-between text-black text-gray-700">
									<span>Delivery fee</span><span
										>{deliveryFee === 0 ? 'Free' : `$${deliveryFee.toFixed(2)}`}</span
									>
								</div>
								<div class="flex justify-between text-black text-gray-700">
									<span>Service fee</span><span>${serviceFee.toFixed(2)}</span>
								</div>
								{#if priorityFee > 0}
									<div class="flex justify-between text-black text-gray-700">
										<span>Priority fee</span><span>${priorityFee.toFixed(2)}</span>
									</div>
								{/if}
								<div class="flex justify-between text-black text-gray-700">
									<span>Estimated taxes</span><span>${taxes.toFixed(2)}</span>
								</div>
							</div>

							<div class="border-t border-black/[0.06] px-6 pt-3 pb-6">
								<p class="text-sm font-bold text-black">Tip your shopper</p>
								<p class="mt-0.5 mb-3 text-xs text-black">Goes 100% to your shopper.</p>
								<div class="grid grid-cols-5 gap-2">
									{#each [15, 20, 30] as pct}
										<button
											onclick={() => (tipPct = pct)}
											class={`flex cursor-pointer flex-col items-center justify-center rounded-xl border py-3 text-sm font-semibold transition active:scale-95 ${tipPct === pct ? 'border-orange-500 bg-orange-500 text-white' : 'border-gray-200 bg-white text-gray-700 hover:border-orange-400'}`}
										>
											<span>{pct}%</span>
											<span class={`text-xs ${tipPct === pct ? 'text-white/90' : 'text-gray-400'}`}
												>${(subtotal * (pct / 100)).toFixed(2)}</span
											>
										</button>
									{/each}
									<button
										onclick={() => (tipPct = 'custom')}
										class={`flex cursor-pointer flex-col items-center justify-center rounded-xl border py-3 text-sm font-semibold transition active:scale-95 ${tipPct === 'custom' ? 'border-orange-500 bg-orange-500 text-white' : 'border-gray-200 bg-white text-gray-700 hover:border-orange-400'}`}
									>
										<span>Custom</span>
										<span
											class={`text-xs ${tipPct === 'custom' ? 'text-white/90' : 'text-gray-400'}`}
											>${customTipAmount}.00</span
										>
									</button>
									<button
										onclick={() => (tipPct = 0)}
										class={`flex cursor-pointer flex-col items-center justify-center rounded-xl border py-3 text-sm font-semibold transition active:scale-95 ${tipPct === 0 ? 'border-orange-500 bg-orange-500 text-white' : 'border-gray-200 bg-white text-gray-700 hover:border-orange-400'}`}
									>
										<span>No tip</span>
									</button>
								</div>
								{#if tipPct === 'custom'}
									<div class="mt-3 flex items-center gap-2">
										<span class="text-sm font-semibold text-gray-600">$</span>
										<input
											type="number"
											min="0"
											step="0.01"
											bind:value={customTipAmount}
											class="w-28 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-orange-500 focus:outline-none"
											placeholder="5.00"
										/>
									</div>
								{/if}
								<div
									class="mt-4 flex justify-between border-t border-black/[0.06] pt-3 text-base font-extrabold text-black"
								>
									<span>Total</span>
									<span>{total.toFixed(2)}</span>
								</div>
								{#if tip > 0}
									<p class="mt-1 text-right text-xs text-gray-500">
										Includes {tip.toFixed(2)} tip for your shopper
									</p>
								{/if}
							</div>

							<div class="border-t border-black/[0.06] px-6 pt-3 pb-6">
								<label class="flex cursor-pointer items-start gap-2.5">
									<input
										type="checkbox"
										bind:checked={shareConsent}
										class="mt-0.5 h-4 w-4 rounded border-gray-300 text-orange-500 focus:ring-orange-500"
									/>
									<span class="text-xs text-gray-600"
										>Share your name, contact details, delivery address and order history with <span
											class="font-semibold">{retailer}</span
										> to better tailor your shopping experience.</span
									>
								</label>
								<p class="mt-2 text-[11px] text-gray-500">
									{retailer} will use your information in accordance with {retailer}'s Privacy
									Notice. Opt out of sharing your personal data with {retailer} by unchecking the box.
								</p>
								<div
									class="mt-4 max-h-48 space-y-3 overflow-y-auto pr-1 text-[11px] leading-relaxed text-gray-500"
								>
									<p>
										<span class="font-semibold text-gray-700">Promotions:</span> Promotions are estimates,
										not guaranteed, and may depend on item and promotion availability in store. You will
										be charged the in-store price for available items in your cart.
									</p>
									<p>
										<span class="font-semibold text-gray-700">Pricing transparency:</span> Prices may
										be lower in store. The Merchant determines prices in the app and in the Merchant's
										store. The prices you see in the app ("In-App Price") may be different from the prices
										in the Merchant's store ("In-Store Price"). You will only pay the In-App Price (displayed
										above).
									</p>
									<p>
										<span class="font-semibold text-gray-700">Delivery responsibility:</span> If you're
										not around when the delivery person arrives, they'll leave your order at the door.
										By placing your order, you agree to take full responsibility for it once it's delivered.
										Orders containing alcohol or other restricted items may not be eligible for leave
										at door and will be returned to the store if you are not available.
									</p>
									<p>
										<span class="font-semibold text-gray-700"
											>Estimated pricing & substitutions:</span
										> We'll put a hold on your card for up to the order total to account for replacements
										or actual weight of items. Your shopper will send you replacement options and select
										an item of similar price and quality if you do not respond. You will see the final
										charge on your receipt.
									</p>
									<p>
										<span class="font-semibold text-gray-700">Replacement cost caps:</span> For a "Replace
										with any similar item" replacement, you'll pay for the cost of the substitute item
										selected by your shopper. The price difference is capped at the greater of either
										$5.00 or 30% above the original item's price. Adjust your replacement preferences
										anytime on the item's detail page.
									</p>
									<p>
										<span class="font-semibold text-gray-700">Fulfillment location:</span> Your order
										may be fulfilled by another location of the same brand. While fees or promotions may
										vary, the total basket price will always be the same or less.
									</p>
								</div>
							</div>
						</div>
					</div>
				</div>
			</div>

			<AddressModal
				open={addressModalOpen}
				currentAddress={address}
				onClose={() => (addressModalOpen = false)}
				onSelect={(a: string) => {
					address = a;
					const parts = a.split(', ');
					const street = parts[0] || '';
					const cityStateZip = parts.slice(1).join(', ') || '';
					const cityStateZipParts = cityStateZip.split(', ');
					const city = cityStateZipParts[0] || '';
					const state = cityStateZipParts[1] || '';
					const zip = cityStateZipParts[2] || '';
					deliveryAddress = { street, city, state, zip };
				}}
				onSelectNew={(a: string) => {
					address = a;
					const parts = a.split(', ');
					const street = parts[0] || '';
					const cityStateZip = parts.slice(1).join(', ') || '';
					const cityStateZipParts = cityStateZip.split(', ');
					const city = cityStateZipParts[0] || '';
					const state = cityStateZipParts[1] || '';
					const zip = cityStateZipParts[2] || '';
					deliveryAddress = { street, city, state, zip };
				}}
			/>
			<ScheduleModal
				open={scheduleModalOpen}
				notice={scheduleNotice}
				onClose={() => (scheduleModalOpen = false)}
				onSelect={(s: string, meta: any) => {
					schedule = s;
					scheduleMeta = meta ?? null;
					speed = 'schedule';
				}}
			/>
			<PaymentMethodsModal
				open={paymentModalOpen}
				onClose={() => (paymentModalOpen = false)}
				onSelect={(label: string) => (card = label)}
			/>
		</div>
	</div>
{/if}
