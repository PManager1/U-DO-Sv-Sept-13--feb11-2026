<script lang="ts">
	import { onMount } from 'svelte';
	import tokenManager from '$lib/tokenManager';
	import API_BASE from '$lib/api';
	import GroceryItemModal from '$lib/GroceryItemModal.svelte';
	import ReplacementModal from '$lib/ReplacementModal.svelte';
	import { addToCart } from '$lib/cart.svelte';
	import { storePath } from '$lib/storePath';

	let orders = $state<any[]>([]);
	let loading = $state(true);
	let loadingMore = $state(false);
	let error = $state('');
	let modalItem = $state<any>(null);
	let modalStore = $state<any>(null);
	let replacementCtx = $state<any>(null);

	let searchQuery = $state('');
	let page = $state(1);
	const pageSize = 10;
	let total = $state(0);
	let hasMore = $state(false);

	const isSearching = $derived(searchQuery.trim().length > 0);

	let searchTimer: ReturnType<typeof setTimeout> | undefined;

	async function loadOrders(opts: { page: number; search?: string; append?: boolean } = { page: 1 }) {
		const headers = tokenManager.getHeaders();
		if (!headers.Authorization) {
			loading = false;
			return;
		}

		const params = new URLSearchParams();
		params.set('page', String(opts.page));
		params.set('pageSize', String(pageSize));
		const q = (opts.search ?? searchQuery).trim();
		if (q) params.set('search', q);

		if (opts.append) {
			loadingMore = true;
		} else {
			loading = true;
		}
		try {
			const res = await fetch(`${API_BASE}orders?${params.toString()}`, { headers });
			if (res.ok) {
				const data = await res.json();
				if (Array.isArray(data)) {
					orders = data.map(mapOrderToDisplay);
					total = orders.length;
					hasMore = false;
				} else if (data && Array.isArray(data.orders)) {
					const mapped = data.orders.map(mapOrderToDisplay);
					if (opts.append) {
						orders = [...orders, ...mapped];
					} else {
						orders = mapped;
					}
					total = Number(data.total) || mapped.length;
					hasMore = Boolean(data.hasMore);
				} else {
					orders = [];
					total = 0;
					hasMore = false;
				}
			} else if (res.status === 401 || res.status === 404) {
				orders = [];
				total = 0;
				hasMore = false;
			}
		} catch (err) {
			console.error('Error loading orders:', err);
			if (!opts.append) error = 'Failed to load orders';
		} finally {
			loading = false;
			loadingMore = false;
		}
	}

	function onSearchInput() {
		if (searchTimer) clearTimeout(searchTimer);
		searchTimer = setTimeout(() => {
			page = 1;
			loadOrders({ page: 1, search: searchQuery.trim() });
		}, 300);
	}

	function clearSearch() {
		if (searchTimer) clearTimeout(searchTimer);
		searchQuery = '';
		page = 1;
		loadOrders({ page: 1 });
	}

	function loadMore() {
		if (loadingMore) return;
		const next = page + 1;
		page = next;
		loadOrders({ page: next, search: searchQuery.trim(), append: true });
	}

	function imgString(img: any): string {
		if (!img) return '';
		if (typeof img === 'string') return img;
		if (typeof img.url === 'string') return img.url;
		if (Array.isArray(img) && img.length) {
			const first = img[0];
			return typeof first === 'string' ? first : first?.url || '';
		}
		return '';
	}

	function openItem(item: any, order: any) {
		const img = imgString(item.image) || imgString(Array.isArray(item.images) ? item.images[0] : '') || '';
		modalItem = {
			id: item.id || item.productId,
			productId: item.productId,
			name: item.name,
			price: Number(item.price) || 0,
			image: img,
			raw_image_url: img,
			images: (Array.isArray(item.images) && item.images.length ? item.images : img ? [img] : []).map((u: any) => ({ url: typeof u === 'string' ? u : u?.url || '' }))
		};
		modalStore = {
			id: order.storeId,
			name: order.storeName,
			logo: order.storeLogo
		};
	}

	function openReplacement(item: any, order: any) {
		const img = imgString(item.image) || imgString(Array.isArray(item.images) ? item.images[0] : '') || '';
		replacementCtx = {
			order,
			item: {
				id: item.id || item.productId,
				productId: item.productId,
				name: item.name,
				price: Number(item.price) || 0,
				image: img,
				raw_image_url: img,
				images: img ? [{ url: img }] : []
			},
			replacements: Array.isArray(item.replacements) ? item.replacements : []
		};
	}

	function formatDate(isoString: string): string {
		if (!isoString) return '';
		try {
			const date = new Date(isoString);
			return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
		} catch {
			return isoString;
		}
	}

	function formatDateTime(isoString: string): string {
		if (!isoString) return '';
		try {
			const date = new Date(isoString);
			const d = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
			const t = date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
			return `${d} at ${t}`;
		} catch {
			return isoString;
		}
	}

	function formatStatus(status: string): string {
		if (!status) return 'Unknown';
		return status.charAt(0).toUpperCase() + status.slice(1).replace(/_/g, ' ');
	}

	function formatSlot(ds: any): string {
		if (!ds) return '';
		try {
			const d = ds.date ? new Date(`${ds.date}T00:00`) : null;
			const dateStr = d
				? d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
				: ds.date || '';
			const time = (t: string) =>
				t
					? new Date(`1970-01-01T${t}`).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
					: '';
			const start = time(ds.startTime);
			const end = time(ds.endTime);
			if (dateStr && start && end) return `${dateStr} · ${start} – ${end}`;
			return [dateStr, start, end].filter(Boolean).join(' ');
		} catch {
			return [ds.date, ds.startTime, ds.endTime].filter(Boolean).join(' ');
		}
	}

	function mapOrderToDisplay(order: any): any {
		const storeId = order.storeId || order.brandId || order._id || order.id;
		return {
			id: order.id || order._id,
			orderNumber: order.orderNumber || String(order.id || order._id || '').slice(-6) || '—',
			date: formatDate(order.createdAt),
			dateTime: formatDateTime(order.createdAt),
			storeId,
			isGrocery: Boolean(order.isGrocery),
			// storeName: order.brandName || order.restaurantName || 'Unknown Store',
			// storeLogo: order.brandLogo || order.restaurantLogo || order.restaurantImage || '',

			// Update lines 206-207 to check snake_case properties from the API:
			storeName: order.brand_name || order.brandName || order.restaurantName || 'Unknown Store',
			storeLogo: order.brand_logo || order.brandLogo || order.restaurantLogo || order.restaurantImage || '',

			items: (order.items || []).map((item: any) => ({
				id: item.productId || item.id || '',
				productId: item.productId || item.id || '',
				name: item.itemName || item.nameSnapshot || item.name || 'Item',
				qty: item.quantity || 1,
				price: item.pricePaid ?? (item.price != null ? item.price : item.totalPrice ?? 0),
				image: item.image || item.imageURL || (Array.isArray(item.images) && item.images[0]) || '',
				images: (Array.isArray(item.images) && item.images.length
					? item.images
					: item.image || item.imageURL
						? [item.image || item.imageURL]
						: []
				).filter(Boolean).slice(0, 4),
				note: item.note || '',
				replacements: Array.isArray(item.replacements)
					? item.replacements.map((r: any) => ({ ...r, image: imgString(r.image) }))
					: []
			})),
			total: order.total ?? order.totalAmount ?? 0,
			subtotal: order.subtotal ?? 0,
			deliveryFee: order.deliveryFee ?? 0,
			serviceFee: order.serviceFee ?? 0,
			tax: order.tax ?? 0,
			orderType: order.isGrocery ? 'Grocery' : order.brandType || 'Regular',
			status: formatStatus(order.status),
			deliverySchedule: order.deliverySchedule || null
		};
	}

	onMount(async () => {
		const headers = tokenManager.getHeaders();
		if (!headers.Authorization) {
			loading = false;
			return;
		}
		await loadOrders({ page: 1 });
	});

	function storeHref(order: any): string {
		const id = order?.storeId;
		if (!id) return '';
		return storePath({ id, brandType: order.isGrocery ? 'grocery' : 'regular' });
	}

	function getStatusColor(status: string) {
		switch (status) {
			case 'Delivered':
				return 'bg-green-100 text-green-700';
			case 'In Progress':
				return 'bg-blue-100 text-blue-700';
			case 'Preparing':
				return 'bg-orange-100 text-orange-700';
			case 'Cancelled':
				return 'bg-red-100 text-red-700';
			default:
				return 'bg-gray-100 text-gray-700';
		}
	}
</script>

<svelte:head>
	<title>Orders · U-DO</title>
</svelte:head>

<div class="min-h-screen bg-gray-50">
	<div class="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
				<div class="mb-8">
					<h1 class="text-2xl sm:text-3xl font-bold text-gray-900">Your Orders</h1>
					<p class="text-sm text-gray-500 mt-1">Your complete order history</p>

					<div class="mt-5 max-w-md">
						<div class="relative">
							<svg class="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
							<input
								type="text"
								bind:value={searchQuery}
								oninput={onSearchInput}
								placeholder="Search your past orders"
								class="w-full pl-10 pr-10 py-3 bg-gray-100 rounded-xl border-0 focus:outline-none focus:ring-2 focus:ring-orange-400 text-sm"
							/>
							{#if searchQuery}
								<button
									onclick={clearSearch}
									class="absolute right-2 top-1/2 -translate-y-1/2 w-6 h-6 flex items-center justify-center text-gray-400 hover:text-gray-600 rounded-full bg-white"
									aria-label="Clear search"
								>
									<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" /></svg>
								</button>
							{/if}
						</div>
					</div>
				</div>

				{#if loading}
					<div class="flex items-center justify-center min-h-[400px]">
						<div class="animate-spin rounded-full h-12 w-12 border-4 border-orange-500 border-t-transparent"></div>
					</div>
				{:else if error}
					<div class="bg-red-50 border border-red-200 rounded-2xl p-6 text-center">
						<p class="text-red-700 font-medium">{error}</p>
					</div>
				{:else}
					<div class="space-y-4">
						{#if orders.length === 0 && !isSearching}
							<div class="bg-white rounded-2xl shadow-sm border border-gray-200 p-12 text-center">
								<svg class="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
								</svg>
								<p class="text-gray-500 text-lg font-medium">No orders yet</p>
								<p class="text-gray-400 text-sm mt-2">Your order history will appear here</p>
							</div>
						{:else if isSearching && orders.length === 0}
							<div class="bg-white rounded-2xl shadow-sm border border-gray-200 p-12 text-center">
								<svg class="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
								</svg>
								<p class="text-gray-500 text-lg font-medium">{searchQuery.trim()}</p>
								<p class="text-gray-400 text-sm mt-2">No past purchases match your search</p>
							</div>
						{:else}
							{#each orders as order}
								{@const orderHref = storeHref(order)}
								<div class="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 hover:shadow-lg transition-shadow">
									<div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
										<div class="flex items-center gap-3">
											<div class="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center">
												<svg class="w-6 h-6 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
													<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
												</svg>
											</div>
											<div>
												<p class="font-semibold text-gray-900">{order.orderNumber}</p>
												<p class="mt-0.5 inline-flex items-center gap-1.5 text-sm font-semibold text-gray-800">
													<svg class="w-4 h-4 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M8 7V3m8 4V3M3 9h18M5 5h14a1 1 0 011 1v13a1 1 0 01-1 1H5a1 1 0 01-1-1V6a1 1 0 011-1z" /></svg>
													{order.dateTime || order.date}
												</p>
												{#if order.deliverySchedule}
													<p class="text-sm text-orange-600 font-medium mt-0.5">Expected delivery {formatSlot(order.deliverySchedule)}</p>
												{/if}
											</div>
										</div>
										<div class="flex items-center gap-2">
											<span class="px-3 py-1 rounded-full text-xs font-semibold bg-purple-100 text-purple-700">
												{order.orderType}
											</span>
											<span class={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(order.status)}`}>
												{order.status}
											</span>
										</div>
									</div>

									<div class="flex items-center gap-3 mb-4 pb-4 border-b border-gray-100">
										{#if orderHref}
											<a href={orderHref} class="flex items-center gap-3 group" title={`Visit ${order.storeName}`}>
												<div class="w-10 h-10 bg-gray-100 rounded-lg overflow-hidden flex items-center justify-center flex-shrink-0 group-hover:ring-2 group-hover:ring-orange-400 group-hover:ring-offset-1 transition">
													{#if order.storeLogo}
														<img src={order.storeLogo} alt={order.storeName} class="w-full h-full object-cover" />
													{:else}
														<span class="text-xs font-bold text-gray-600">{order.storeName.charAt(0)}</span>
													{/if}
												</div>
												<p class="font-medium text-gray-900 group-hover:text-orange-600 transition">{order.storeName}</p>
											</a>
										{:else}
											<div class="w-10 h-10 bg-gray-100 rounded-lg overflow-hidden flex items-center justify-center flex-shrink-0">
												{#if order.storeLogo}
													<img src={order.storeLogo} alt={order.storeName} class="w-full h-full object-cover" />
												{:else}
													<span class="text-xs font-bold text-gray-600">{order.storeName.charAt(0)}</span>
												{/if}
											</div>
											<p class="font-medium text-gray-900">{order.storeName}</p>
										{/if}
									</div>

									<div class="mb-4">
										<div class="flex items-center gap-2 mb-2">
											<p class="text-sm text-black">
												{order.items.length} {order.items.length === 1 ? 'item' : 'items'}
											</p>
										</div>
										<div class="space-y-2">
											{#each order.items as item}
												<div class="rounded-xl border border-gray-100 bg-gray-50/60">
													<div
														onclick={() => openItem(item, order)}
														class="flex items-center gap-3 p-3 cursor-pointer active:bg-gray-100 transition rounded-xl"
														role="button"
														tabindex="0"
														onkeydown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openItem(item, order); } }}>
														<div class="w-11 h-11 rounded-xl overflow-hidden bg-white flex-shrink-0">
															{#if item.image}
																<img src={item.image} alt={item.name} class="w-full h-full object-contain" />
															{:else}
																<div class="w-full h-full flex items-center justify-center text-gray-300">📦</div>
															{/if}
														</div>
														<div class="flex-1 min-w-0">
															<p class="text-sm font-semibold text-gray-900 truncate">{item.name}</p>
															{#if item.note}
																<p class="text-xs text-gray-400 truncate">📝 {item.note}</p>
															{/if}
														</div>
														<div class="text-right flex-shrink-0">
															<p class="text-sm font-medium text-gray-600">{item.qty} ×</p>
															<p class="text-sm font-bold text-orange-500">${(item.qty * item.price).toFixed(2)}</p>
														</div>
													</div>

													{#if item.replacements?.length}
														<div class="mx-3 mb-3 border-l-2 border-dashed border-orange-200 pl-3">
															<div class="flex items-center gap-1.5 mb-2 mt-1">
																<svg class="w-3.5 h-3.5 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>
																<span class="text-[10px] font-bold uppercase tracking-wider text-orange-600">Backup choice</span>
																<span class="text-[10px] text-gray-400">· Substitute if out of stock</span>
															</div>
															{#each item.replacements as r}
																<div
																	onclick={() => openReplacement(item, order)}
																	class="flex items-center gap-2 bg-white/70 border border-gray-100 rounded-lg px-2.5 py-2 mb-1.5 last:mb-0 cursor-pointer active:bg-gray-100 transition"
																	role="button"
																	tabindex="0"
																	onkeydown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openReplacement(item, order); } }}>
																	<div class="w-8 h-8 rounded-md overflow-hidden bg-gray-100 flex-shrink-0">
																		{#if r.image}
																			<img src={r.image} alt={r.name} class="w-full h-full object-contain" />
																		{:else}
																			<div class="w-full h-full flex items-center justify-center text-gray-300 text-sm">📦</div>
																		{/if}
																	</div>
																	<div class="flex-1 min-w-0">
																		<p class="text-xs font-medium text-gray-800 truncate">{r.name || 'Backup item'}</p>
																		{#if r.price != null}
																			<p class="text-[11px] text-gray-500">Charged only if substituted: ${Number(r.price || 0).toFixed(2)}</p>
																		{/if}
																	</div>
																</div>
															{/each}
														</div>
													{/if}
												</div>
											{/each}
										</div>
									</div>

									{#if !isSearching}
										<div class="space-y-1 text-sm text-black pt-4 border-t border-gray-100">
											<div class="flex items-center justify-between">
												<span>Subtotal</span>
												<span class="text-gray-900">${order.subtotal.toFixed(2)}</span>
											</div>
											{#if order.deliveryFee > 0}
												<div class="flex items-center justify-between">
													<span>Delivery Fee</span>
													<span class="text-gray-900">${order.deliveryFee.toFixed(2)}</span>
												</div>
											{/if}
											{#if order.serviceFee > 0}
												<div class="flex items-center justify-between">
													<span>Service Fee</span>
													<span class="text-gray-900">${order.serviceFee.toFixed(2)}</span>
												</div>
											{/if}
											{#if order.tax > 0}
												<div class="flex items-center justify-between">
													<span>Tax</span>
													<span class="text-gray-900">${order.tax.toFixed(2)}</span>
												</div>
											{/if}
										</div>

										<div class="flex items-center justify-between pt-4 border-t border-gray-100">
											<span class="text-sm text-black-500">Total</span>
											<span class="text-xl font-bold text-gray-900">${order.total.toFixed(2)}</span>
										</div>
									{/if}
								</div>
							{/each}

							{#if hasMore}
								<div class="pt-2 flex justify-center">
									<button
										onclick={loadMore}
										disabled={loadingMore}
										class="inline-flex items-center gap-2 px-6 py-2.5 rounded-full border border-gray-200 bg-white text-sm font-semibold text-gray-700 hover:border-orange-400 hover:text-orange-600 transition disabled:opacity-50 disabled:cursor-not-allowed"
									>
										{#if loadingMore}
											<div class="animate-spin rounded-full h-4 w-4 border-2 border-orange-500 border-t-transparent"></div>
										{:else}
											<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7" /></svg>
										{/if}
										{loadingMore ? 'Loading…' : 'Load more orders'}
									</button>
								</div>
							{/if}
						{/if}
					</div>
				{/if}
			</div>
</div>

{#if modalItem}
	<GroceryItemModal item={modalItem} store={modalStore} recommended={[]} onClose={() => (modalItem = null)} />
{/if}

{#if replacementCtx}
	<ReplacementModal
		item={replacementCtx.item}
		store={{
			id: replacementCtx.order.storeId,
			name: replacementCtx.order.storeName,
			logo: replacementCtx.order.storeLogo
		}}
		recommended={[]}
		initialReplacements={replacementCtx.replacements}
		initialNote={replacementCtx.item.note || ''}
		onBack={() => (replacementCtx = null)}
		onClose={() => (replacementCtx = null)}
		onCommit={(replacements, note) => {
			addToCart(
				{ id: replacementCtx.order.storeId, name: replacementCtx.order.storeName, logo: replacementCtx.order.storeLogo },
				{
					id: replacementCtx.item.productId,
					name: replacementCtx.item.name,
					price: Number(replacementCtx.item.price) || 0,
					image: replacementCtx.item.image || '',
					images: replacementCtx.item.images || [],
					note,
					replacements
				}
			);
			replacementCtx = null;
		}}
	/>
{/if}
