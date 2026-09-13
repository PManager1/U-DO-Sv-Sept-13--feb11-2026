<script lang="ts">
	import { onMount } from 'svelte';
	import tokenManager from '$lib/tokenManager';
	import API_BASE from '$lib/api';
	import GroceryItemModal from '$lib/GroceryItemModal.svelte';
	import ReplacementModal from '$lib/ReplacementModal.svelte';
	import { addToCart } from '$lib/cart.svelte';

	let activeTab = $state<'overview' | 'favorites'>('overview');

	let firstName = $state('');
	let lastName = $state('');
	let email = $state('');
	let phone = $state('');
	let profileImage = $state('');
	let userInitials = $state('');

	let favorites = $state<any[]>([]);
	let orders = $state<any[]>([]);
	let loading = $state(true);
	let error = $state('');
	let modalItem = $state<any>(null);
	let modalStore = $state<any>(null);
	let replacementCtx = $state<any>(null);

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

	function mapOrderToDisplay(order: any): any {
		const storeId = order.storeId || order.brandId || order._id || order.id;
		return {
			id: order.id || order._id,
			orderNumber: order.orderNumber || String(order.id || order._id || '').slice(-6) || '—',
			date: formatDate(order.createdAt),
			dateTime: formatDateTime(order.createdAt),
			storeId,
			storeName: order.brandName || order.restaurantName || 'Unknown Store',
			storeLogo: order.brandLogo || order.restaurantLogo || order.restaurantImage || '',
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
			status: formatStatus(order.status)
		};
	}

	onMount(async () => {
		const headers = tokenManager.getHeaders();
		if (!headers.Authorization) {
			loading = false;
			return;
		}

		try {
			const [userRes, favRes, ordersRes] = await Promise.all([
				fetch(API_BASE + 'me', { headers }),
				fetch(API_BASE + 'favorites', { headers }),
				fetch(API_BASE + 'orders', { headers })
			]);

			if (ordersRes.ok) {
				const ordersData = await ordersRes.json();
				if (Array.isArray(ordersData)) {
					orders = ordersData.map(mapOrderToDisplay);
				}
			} else if (ordersRes.status === 401 || ordersRes.status === 404) {
				orders = [];
			}

			if (userRes.ok) {
				const userData = await userRes.json();
				const user = userData.user || userData;
				if (user.firstName) firstName = user.firstName;
				if (user.lastName) lastName = user.lastName;
				if (user.email) email = user.email;
				if (user.phoneNumber) phone = user.phoneNumber;
				if (user.profileImage || user.profileImageUrl) {
					profileImage = user.profileImage || user.profileImageUrl;
				} else {
					const initials = [user.firstName, user.lastName]
						.filter(Boolean)
						.map((n: string) => n.charAt(0).toUpperCase())
						.join('');
					userInitials = initials || 'U';
				}
			}

			if (favRes.ok) {
				const favData = await favRes.json();
				if (Array.isArray(favData)) {
					const brandIds = favData.map((f: any) => f.brandId).filter(Boolean);
					const storePromises = brandIds.map(async (id: string) => {
						try {
							const res = await fetch(API_BASE + 'brands/' + id);
							if (res.ok) {
								const data = await res.json();
								return data;
							}
						} catch {}
						return null;
					});
					const stores = await Promise.all(storePromises);
					favorites = stores.filter(Boolean);
				}
			}
		} catch (err) {
			console.error('Error loading profile:', err);
			error = 'Failed to load profile data';
		} finally {
			loading = false;
		}
	});

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
	<title>Profile · U-DO</title>
</svelte:head>

<div class="min-h-screen bg-gray-50">
	<div class="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
				{#if loading}
					<div class="flex items-center justify-center min-h-[400px]">
						<div class="animate-spin rounded-full h-12 w-12 border-4 border-orange-500 border-t-transparent"></div>
					</div>
				{:else if error}
					<div class="bg-red-50 border border-red-200 rounded-2xl p-6 text-center">
						<p class="text-red-700 font-medium">{error}</p>
					</div>
				{:else}
					<!-- Profile Header -->
					<div class="mb-8">
						<div class="bg-gradient-to-r from-orange-400 to-orange-600 rounded-3xl p-6 sm:p-8 text-white shadow-lg">
							<div class="flex flex-col sm:flex-row items-center sm:items-start gap-6">
								<div class="relative">
									<div class="w-24 h-24 sm:w-28 sm:h-28 rounded-full border-4 border-white/30 overflow-hidden bg-white/20 flex items-center justify-center text-3xl font-bold">
										{#if profileImage}
											<img src={profileImage} alt="Profile" class="w-full h-full object-cover" />
										{:else}
											{userInitials}
										{/if}
									</div>
									<div class="absolute bottom-0 right-0 w-8 h-8 bg-green-400 rounded-full border-4 border-orange-500"></div>
								</div>
								<div class="text-center sm:text-left flex-1">
									<h1 class="text-2xl sm:text-3xl font-bold mb-2">
										{firstName || 'User'} {lastName || ''}
									</h1>
									<p class="text-white/90 text-sm sm:text-base mb-4">{email}</p>
									<div class="flex flex-wrap justify-center sm:justify-start gap-3 sm:gap-6">
										<div class="text-center">
											<p class="text-2xl sm:text-3xl font-bold">{orders.length}</p>
											<p class="text-xs sm:text-sm text-white/80">Orders</p>
										</div>
										<div class="text-center">
											<p class="text-2xl sm:text-3xl font-bold">{favorites.length}</p>
											<p class="text-xs sm:text-sm text-white/80">Favorites</p>
										</div>
										<div class="text-center">
											<p class="text-2xl sm:text-3xl font-bold">
												{orders.reduce((sum, o) => sum + o.total, 0).toFixed(0)}
											</p>
											<p class="text-xs sm:text-sm text-white/80">Spent $</p>
										</div>
									</div>
								</div>
							</div>
						</div>
					</div>

					<div class="mb-6">
						<a
							href="/orders/"
							class="inline-flex items-center gap-2 bg-white border border-gray-200 text-gray-700 hover:border-orange-300 hover:text-orange-600 rounded-xl px-4 py-2.5 text-sm font-semibold shadow-sm hover:shadow transition">
							<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
							</svg>
							View all orders
						</a>
					</div>

					<!-- Tab Navigation -->
					<div class="mb-6">
						<div class="bg-white rounded-2xl shadow-sm border border-gray-200 p-2">
							<div class="flex gap-2 overflow-x-auto">
								<button
									onclick={() => (activeTab = 'overview')}
									class={`px-4 sm:px-6 py-3 rounded-xl text-sm sm:text-base font-semibold transition-all whitespace-nowrap ${
										activeTab === 'overview'
											? 'bg-orange-500 text-white shadow-md'
											: 'text-gray-600 hover:bg-gray-100'
									}`}>
									<svg class="w-4 h-4 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
									</svg>
									Overview
								</button>
								<button
									onclick={() => (activeTab = 'favorites')}
									class={`px-4 sm:px-6 py-3 rounded-xl text-sm sm:text-base font-semibold transition-all whitespace-nowrap ${
										activeTab === 'favorites'
											? 'bg-orange-500 text-white shadow-md'
											: 'text-gray-600 hover:bg-gray-100'
									}`}>
									<svg class="w-4 h-4 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
									</svg>
									Favorite Stores
								</button>
							</div>
						</div>
					</div>

					<!-- Tab Content -->
					{#if activeTab === 'overview'}
						<div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
							<!-- Personal Information -->
						

							<!-- Account Stats -->
							<div class="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
								<h2 class="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
									<svg class="w-5 h-5 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
									</svg>
									Account Statistics
								</h2>
								<div class="grid grid-cols-2 gap-4">
									<div class="p-4 bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl text-center">
										<p class="text-3xl font-bold text-orange-600">{orders.length}</p>
										<p class="text-sm text-orange-700 mt-1">Total Orders</p>
									</div>
									<div class="p-4 bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl text-center">
										<p class="text-3xl font-bold text-blue-600">{favorites.length}</p>
										<p class="text-sm text-blue-700 mt-1">Favorite Stores</p>
									</div>
									<div class="p-4 bg-gradient-to-br from-green-50 to-green-100 rounded-xl text-center">
										<p class="text-3xl font-bold text-green-600">${orders.reduce((sum, o) => sum + o.total, 0).toFixed(0)}</p>
										<p class="text-sm text-green-700 mt-1">Total Spent</p>
									</div>
									<div class="p-4 bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl text-center">
										<p class="text-3xl font-bold text-purple-600">{Math.round(orders.reduce((sum, o) => sum + o.total, 0) / (orders.length || 1))}</p>
										<p class="text-sm text-purple-700 mt-1">Avg Order</p>
									</div>
								</div>
							</div>
						</div>

					{:else if activeTab === 'favorites'}
						<div>
							{#if favorites.length === 0}
								<div class="bg-white rounded-2xl shadow-sm border border-gray-200 p-12 text-center">
									<svg class="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
									</svg>
									<p class="text-gray-500 text-lg font-medium">No favorite stores yet</p>
									<p class="text-gray-400 text-sm mt-2">Browse and save your favorite stores</p>
								</div>
							{:else}
								<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
									{#each favorites as store}
										<div class="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-lg transition-all hover:-translate-y-1">
											<div class="h-32 bg-gradient-to-br from-orange-400 to-orange-600 relative">
												{#if store.logo || store.logoURL}
													<img src={store.logo || store.logoURL} alt={store.name} class="w-full h-full object-cover" />
												{/if}
												<button class="absolute top-3 right-3 p-2 bg-white/90 hover:bg-white rounded-full shadow-sm transition">
													<svg class="w-4 h-4 text-red-500" fill="currentColor" viewBox="0 0 24 24">
														<path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
													</svg>
												</button>
											</div>
											<div class="p-4">
												<h3 class="font-bold text-gray-900 mb-2">{store.name || 'Store Name'}</h3>
												<div class="flex items-center gap-4 text-sm text-gray-500 mb-3">
													{#if store.rating || store.avgRating}
														<div class="flex items-center gap-1">
															<svg class="w-4 h-4 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
																<path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
															</svg>
															<span class="font-semibold text-gray-900">{(store.rating || store.avgRating || 0).toFixed(1)}</span>
														</div>
													{/if}
													{#if store.estimatedTimeMin || store.deliveryTime}
														<div class="flex items-center gap-1">
															<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
																<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
															</svg>
															<span>{store.estimatedTimeMin || store.deliveryTime || '—'}</span>
														</div>
													{/if}
												</div>
												<a href={`/store/${store.id || store._id}/`} class="block w-full bg-orange-500 hover:bg-orange-600 text-white text-center py-2.5 rounded-xl font-semibold text-sm transition">
													View Store
												</a>
											</div>
										</div>
									{/each}
								</div>
							{/if}
						</div>
					{/if}
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
