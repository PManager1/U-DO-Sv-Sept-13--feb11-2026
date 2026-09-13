<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import tokenManager from '$lib/tokenManager';
	import Sidebar from '$lib/mystore/Sidebar.svelte';
	import StoreBrandInfo from '$lib/mystore/StoreBrandInfo.svelte';
	import ItemDrawer from '$lib/mystore/ItemDrawer.svelte';
	import CategoryModal from '$lib/mystore/CategoryModal.svelte';
	import ModifierGroupModal from '$lib/mystore/ModifierGroupModal.svelte';
	import StoreSwitcher from '$lib/mystore/StoreSwitcher.svelte';
	import AddStoreModal from '$lib/mystore/AddStoreModal.svelte';
	import OnboardingScreen from '$lib/mystore/OnboardingScreen.svelte';
	import Toast from '$lib/mystore/Toast.svelte';
	import * as api from '$lib/mystore/api';
	import defaultStores from '$lib/mystore/stores.json';

	let sidebarCollapsed = $state(false);
	let loading = $state(true);
	let searchQuery = $state('');
	let syncStatus = $state('checking');

	let categories = $state<any[]>([]);
	let items = $state<any[]>([]);
	let modifierGroups = $state<any[]>([]);
	let restaurantName = $state('Restaurant Name');
	let logoUrl = $state('');
	let referralCode = $state('');
	let editingReferral = $state(false);
	let referralInput = $state('');
	let editingName = $state(false);
	let nameInput = $state('');
	let menuUploading = $state(false);

	let currentCategory = $state<string | null>(null);
	let categoryItems = $state<any[]>([]);

	let toast = $state<{ show: boolean; message: string; type: string }>({ show: false, message: '', type: 'success' });

	let itemDrawerOpen = $state(false);
	let editingItem = $state<string | null>(null);
	let categoryModalOpen = $state(false);
	let editingCategory = $state<string | null>(null);
	let modifierModalOpen = $state(false);
	let editingModifierGroup = $state<string | null>(null);

	let stores = $state<any[]>(defaultStores.stores);
	let activeStoreId = $state(defaultStores.stores[0]?.id || 'store_1');
	let addStoreModalOpen = $state(false);

	let isFirstTimeUser = $state(false);
	let onboardingDismissed = $state(false);

	function showToast(message: string, type = 'success') {
		toast = { show: true, message, type };
		setTimeout(() => (toast = { show: false, message: '', type: 'success' }), 3000);
	}

	function handleAddStore(newStore: any) {
		stores = [...stores, newStore];
		activeStoreId = newStore.id;
		addStoreModalOpen = false;
		showToast(`"${newStore.name}" added!`);
	}

	function handleSwitchStore(storeId: string) {
		activeStoreId = storeId;
		const store = stores.find((s) => s.id === storeId);
		if (store?.name) restaurantName = store.name;
		showToast(`Switched to ${store?.name || 'store'}`);
	}

	function updateStoreWithProfile(name: string, logo: string) {
		stores = stores.map((s, i) => (i === 0 ? { ...s, name: s.name || name, logoUrl: s.logoUrl || logo } : s));
	}

	async function loadAllData() {
		try {
			const [cats, allItems, groups, profile] = await Promise.all([
				api.getCategories().catch(() => []),
				api.getItems().catch(() => []),
				api.getModifierGroups().catch(() => []),
				api.getProfile().catch(() => ({}))
			]);
			categories = cats;
			items = allItems;
			modifierGroups = groups;
			const name = profile.restaurantName || profile.storeName || profile.name || 'Restaurant Name';
			restaurantName = name;
			if (profile.logoURL || profile.logo) logoUrl = profile.logoURL || profile.logo;
			if (profile.referralCode) referralCode = profile.referralCode;
			updateStoreWithProfile(name, profile.logoURL || profile.logo);
			syncStatus = 'online';
			const hasData = cats.length > 0 || allItems.length > 0 || profile.referralCode;
			isFirstTimeUser = !hasData;
		} catch (err) {
			console.error('Failed to load data:', err);
			syncStatus = 'error';
		} finally {
			loading = false;
		}
	}

	onMount(() => {
		if (!tokenManager.hasValidToken()) {
			goto('/login');
			return;
		}
		localStorage.removeItem('udo-signed-out');
		sidebarCollapsed = window.innerWidth < 768;
		api.healthCheck().then((ok) => (syncStatus = ok ? 'online' : 'offline'));
		loadAllData();
	});

	const filteredItems = $derived(
		searchQuery
			? items.filter((i) => (i.name || '').toLowerCase().includes(searchQuery.toLowerCase()) || (i.description || '').toLowerCase().includes(searchQuery.toLowerCase()))
			: items
	);

	async function openCategoryDetail(catId: string) {
		currentCategory = catId;
		try {
			categoryItems = await api.getItemsByCategory(catId);
		} catch {
			categoryItems = items.filter((i) => (i.categoryId || i.category_id) === catId);
		}
	}

	function showDashboard() {
		currentCategory = null;
		categoryItems = [];
	}

	async function handleLogoUpload(e: Event) {
		const file = (e.currentTarget as HTMLInputElement).files?.[0];
		if (!file) return;
		try {
			const url = await api.uploadImageToGCS(file);
			await api.patchProfile({ logoURL: url });
			logoUrl = url;
			showToast('Logo updated!');
		} catch {
			showToast('Failed to upload logo', 'error');
		}
	}

	async function handleDeleteItem(id: string) {
		if (!window.confirm('Are you sure you want to delete this item?')) return;
		try {
			await api.deleteItem(id);
			showToast('Item deleted!');
			await loadAllData();
			if (currentCategory) await openCategoryDetail(currentCategory);
		} catch {
			showToast('Failed to delete item', 'error');
		}
	}

	async function handleToggleAvailability(type: string, id: string) {
		try {
			if (type === 'item') {
				await api.toggleItemAvailability(id);
			} else if (type === 'category') {
				const cat = categories.find((c) => c.id === id);
				const newStatus = !(cat?.available ?? cat?.isActive ?? false);
				await api.updateCategory(id, { available: newStatus });
			}
			showToast('Availability updated');
			await loadAllData();
		} catch {
			showToast('Failed to toggle availability', 'error');
		}
	}

	function openItemDrawer(itemId: string | null = null) { editingItem = itemId; itemDrawerOpen = true; }
	function closeItemDrawer() { itemDrawerOpen = false; editingItem = null; }
	function openCategoryModal(catId: string | null = null) { editingCategory = catId; categoryModalOpen = true; }
	function closeCategoryModal() { categoryModalOpen = false; editingCategory = null; }
	function openModifierModal(groupId: string | null = null) { editingModifierGroup = groupId; modifierModalOpen = true; }
	function closeModifierModal() { modifierModalOpen = false; editingModifierGroup = null; }

	function startEditReferral() { referralInput = referralCode; editingReferral = true; }
	function cancelEditReferral() { editingReferral = false; referralInput = ''; }
	async function saveReferralCode() {
		const code = referralInput.trim().toUpperCase().slice(0, 4);
		if (!code) { showToast('Referral code cannot be empty', 'error'); return; }
		try {
			await api.patchProfile({ referralCode: code });
			referralCode = code;
			editingReferral = false;
			referralInput = '';
			showToast('Referral code updated!');
		} catch (err: any) {
			showToast(err.message || 'Failed to update referral code', 'error');
		}
	}

	function startEditName() { nameInput = restaurantName; editingName = true; }
	function cancelEditName() { editingName = false; nameInput = ''; }
	async function saveRestaurantName() {
		const name = nameInput.trim();
		if (!name) { showToast('Restaurant name cannot be empty', 'error'); return; }
		try {
			await api.patchProfile({ restaurantName: name });
			restaurantName = name;
			editingName = false;
			nameInput = '';
			showToast('Restaurant name updated!');
		} catch (err: any) {
			showToast(err.message || 'Failed to update restaurant name', 'error');
		}
	}

	async function handleMenuUpload(e: Event) {
		const file = (e.currentTarget as HTMLInputElement).files?.[0];
		if (!file) return;
		menuUploading = true;
		try {
			await api.uploadMenu(file);
			showToast('Menu uploaded & sent successfully!');
		} catch {
			showToast('Failed to upload menu', 'error');
		} finally {
			menuUploading = false;
			(e.currentTarget as HTMLInputElement).value = '';
		}
	}

	const showOnboarding = $derived((isFirstTimeUser && !onboardingDismissed) || page.url.searchParams.get('onboarding') === '1');
	const currentCatObj = $derived(currentCategory ? categories.find((c) => c.id === currentCategory) : null);

	const syncIcon = $derived.by(() => {
		if (syncStatus === 'online') return { bg: 'bg-green-100', dot: 'bg-green-500 animate-pulse', text: 'text-green-700', label: 'Online' };
		if (syncStatus === 'error') return { bg: 'bg-red-100', dot: 'bg-red-500', text: 'text-red-700', label: 'Error' };
		return { bg: 'bg-gray-100', dot: 'bg-gray-400', text: 'text-gray-600', label: syncStatus === 'offline' ? 'Offline' : 'Checking...' };
	});
</script>

{#snippet itemCard(item: any, idx: number)}
	{@const images = (() => { try { const parsed = JSON.parse(item.imageUrl || item.image_url || '[]'); return Array.isArray(parsed) ? parsed : [parsed]; } catch { return [item.imageUrl || item.image_url].filter(Boolean); } })()}
	{@const isAvailable = item.isAvailable !== undefined ? item.isAvailable : (item.available !== false)}
	{@const price = item.basePrice || item.base_price || 0}
	{@const name = item.name || 'Untitled'}
	{@const promo = item.promoText || item.promo_text || ''}
	<div class="bg-white rounded-2xl shadow-sm border border-gray-100 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 overflow-hidden group">
		<div class="relative h-40 bg-gray-100 overflow-hidden">
			{#if images.length > 0}
				<img src={images[0]} alt={name} class="w-full h-full object-cover" />
			{:else}
				<div class="w-full h-full flex items-center justify-center text-gray-300">
					<svg class="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
				</div>
			{/if}
			<button onclick={(e) => { e.stopPropagation(); handleToggleAvailability('item', item.id); }} class={`absolute top-2 right-2 w-8 h-8 rounded-full flex items-center justify-center transition shadow z-10 ${isAvailable ? 'bg-green-500 text-white' : 'bg-red-500 text-white'}`}>
				{#if isAvailable}
					<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" /></svg>
				{:else}
					<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" /></svg>
				{/if}
			</button>
			{#if promo}<span class="absolute bottom-2 left-2 bg-orange-500 text-white text-[11px] font-bold px-2 py-0.5 rounded-full shadow z-10">{promo}</span>{/if}
			{#if images.length > 1}<span class="absolute top-2 left-2 bg-black/50 text-white text-[11px] px-1.5 py-0.5 rounded-full z-10">{images.length} photos</span>{/if}
		</div>
		<div class="p-4">
			<div class="flex justify-between items-start">
				<h3 class="font-bold text-gray-900 text-sm line-clamp-1">{name}</h3>
				<span class="text-orange-500 font-bold text-sm ml-2 flex-shrink-0">${parseFloat(price).toFixed(2)}</span>
			</div>
			{#if item.description}<p class="text-xs text-gray-500 mt-1 line-clamp-2">{item.description}</p>{/if}
			<div class="flex gap-6 mt-3">
				<button onclick={() => openItemDrawer(item.id)} class="text-xs text-orange-500 hover:text-orange-600 font-medium transition">Edit</button>
				<span class="text-gray-300">|</span>
				<button onclick={() => handleDeleteItem(item.id)} class="text-xs text-red-400 hover:text-red-600 font-medium transition">Delete</button>
			</div>
		</div>
	</div>
{/snippet}

{#if loading}
	<div class="min-h-screen flex items-center justify-center bg-[#f9f7f5]">
		<div class="text-center">
			<div class="w-10 h-10 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
			<p class="text-gray-500 font-medium">Loading menu...</p>
		</div>
	</div>
{:else}
	<div class="min-h-screen flex bg-[#f9f7f5]">
		<Sidebar collapsed={sidebarCollapsed} onCollapse={() => (sidebarCollapsed = true)} showOnboardingBadge={isFirstTimeUser && !onboardingDismissed} />

		<div class="flex-1 flex flex-col min-w-0">
			<header class="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-200 shadow-sm">
				<div class="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
					<div class="flex items-center gap-3 w-full sm:w-auto sm:flex-shrink-0">
						<button onclick={() => (sidebarCollapsed = false)} class="md:hidden p-2 text-gray-500 hover:text-orange-500 hover:bg-gray-100 rounded-lg transition" title="Open menu">
							<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" /></svg>
						</button>
						<label class="relative cursor-pointer group" title="Click to upload logo">
							<input type="file" accept="image/*" class="hidden" oninput={handleLogoUpload} />
							{#if logoUrl}
								<img src={logoUrl} alt="Logo" class="w-10 h-10 rounded-full object-cover border-2 border-gray-200 group-hover:opacity-80 transition" />
							{:else}
								<div class="w-10 h-10 rounded-full border-2 border-dashed border-gray-300 bg-gray-50 flex items-center justify-center group-hover:border-orange-400 transition">
									<svg class="w-5 h-5 text-gray-400 group-hover:text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
								</div>
							{/if}
						</label>
						<div class="min-w-0">
							<StoreSwitcher stores={stores} activeStoreId={activeStoreId} onSwitch={handleSwitchStore} onAddNew={() => (addStoreModalOpen = true)} />
						</div>
						<div class="flex items-center gap-2 sm:hidden ml-auto flex-shrink-0">
							<div class={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${syncIcon.bg} ${syncIcon.text}`}>
								<div class={`w-1.5 h-1.5 rounded-full ${syncIcon.dot}`}></div>
								<span>{syncIcon.label}</span>
							</div>
							<button onclick={api.handleSignOut} class="text-gray-500 hover:text-orange-500 font-medium text-xs transition">Out</button>
						</div>
					</div>

					<div class="flex-1 w-full sm:max-w-xl order-last sm:order-none">
						<div class="relative">
							<input type="text" placeholder="Search menu items..." value={searchQuery} oninput={(e) => (searchQuery = (e.currentTarget as HTMLInputElement).value)} class="w-full pl-5 pr-12 py-2.5 sm:py-3 bg-[#DADAD3] border border-gray-300 rounded-full text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-gray-400/50 transition shadow-sm" />
							<svg class="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
						</div>
					</div>

					<div class="hidden sm:flex items-center gap-3 flex-shrink-0">
						<div class={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium ${syncIcon.bg} ${syncIcon.text}`}>
							<div class={`w-2 h-2 rounded-full ${syncIcon.dot}`}></div>
							<span>{syncIcon.label}</span>
						</div>
						<span class="text-sm text-gray-600 hidden lg:inline">UDO: 15%</span>
						<button onclick={api.handleSignOut} class="text-gray-700 hover:text-orange-500 font-medium text-sm transition">Sign out</button>
					</div>
				</div>
			</header>

			<main class="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">
				{#if showOnboarding && !currentCatObj}
					<OnboardingScreen
						referralCode={referralCode}
						onSaveReferral={async (code) => { await api.patchProfile({ referralCode: code }); referralCode = code; showToast('Referral code saved!'); }}
						onUploadMenu={async (file) => { menuUploading = true; try { await api.uploadMenu(file); showToast('Menu uploaded & sent successfully!'); } catch { showToast('Failed to upload menu', 'error'); } finally { menuUploading = false; } }}
						onAddItem={() => openItemDrawer(null)}
						onAddCategory={() => openCategoryModal(null)}
						onDismiss={() => { onboardingDismissed = true; goto('/mystore'); }}
						menuUploading={menuUploading}
					/>
				{:else if currentCatObj}
					<div>
						<button onclick={showDashboard} class="mb-6 flex items-center gap-2 text-gray-600 hover:text-orange-500 font-medium transition">
							<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" /></svg>
							Back to Dashboard
						</button>
						<div class="flex flex-col sm:flex-row sm:justify-between items-start sm:items-center mb-6 gap-3">
							<div class="min-w-0">
								<h1 class="text-2xl sm:text-3xl font-bold text-gray-900 truncate">{currentCatObj.icon || '🍽️'} {currentCatObj.name || currentCatObj.title}</h1>
								<p class="text-gray-600 mt-1 text-sm sm:text-base">{currentCatObj.description || ''}</p>
							</div>
							<div class="flex gap-2 flex-shrink-0">
								<button onclick={() => openCategoryModal(currentCatObj.id)} class="bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold py-2 px-3 sm:px-4 rounded-lg text-sm transition">Manage</button>
								<button onclick={() => openItemDrawer(null)} class="bg-orange-500 hover:bg-orange-600 text-white font-bold py-2 px-3 sm:px-4 rounded-lg text-sm transition">+ Add Item</button>
							</div>
						</div>
						<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
							{#each categoryItems as item, i}{@render itemCard(item, i)}{/each}
							{#if categoryItems.length === 0}<div class="col-span-full text-center py-12 text-gray-400">No items in this category yet</div>{/if}
						</div>
					</div>
				{:else}
					<div>
						<div class="flex flex-col sm:flex-row sm:justify-between items-start sm:items-center mb-8 gap-4">
							<div>
								<div class="flex items-center gap-3">
									{#if editingName}
										<div class="flex items-center gap-1.5 flex-wrap">
											<input type="text" value={nameInput} oninput={(e) => (nameInput = (e.currentTarget as HTMLInputElement).value)} onkeydown={(e) => { if (e.key === 'Enter') saveRestaurantName(); if (e.key === 'Escape') cancelEditName(); }} placeholder="Restaurant Name" class="text-xl sm:text-2xl font-bold px-2 py-1 border border-orange-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-400 w-full sm:w-auto min-w-0" autofocus />
											<button onclick={saveRestaurantName} class="p-1 text-green-600 hover:text-green-700 transition" title="Save"><svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" /></svg></button>
											<button onclick={cancelEditName} class="p-1 text-gray-400 hover:text-gray-600 transition" title="Cancel"><svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" /></svg></button>
										</div>
									{:else}
										<button onclick={startEditName} class="flex items-center gap-2 group">
											<h1 class="text-2xl sm:text-3xl font-bold text-gray-900 truncate">{restaurantName}</h1>
											<svg class="w-5 h-5 text-gray-400 group-hover:text-orange-500 transition" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
										</button>
									{/if}
									{#if editingReferral}
										<div class="flex items-center gap-1.5">
											<span class="text-xs text-gray-500 font-medium">Referral code:</span>
											<input type="text" value={referralInput} oninput={(e) => (referralInput = (e.currentTarget as HTMLInputElement).value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 4))} onkeydown={(e) => { if (e.key === 'Enter') saveReferralCode(); if (e.key === 'Escape') cancelEditReferral(); }} placeholder="CODE" maxlength={4} class="w-20 px-2 py-1 text-sm font-bold text-center border border-orange-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-400 uppercase" autofocus />
											<button onclick={saveReferralCode} class="p-1 text-green-600 hover:text-green-700 transition" title="Save"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" /></svg></button>
											<button onclick={cancelEditReferral} class="p-1 text-gray-400 hover:text-gray-600 transition" title="Cancel"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" /></svg></button>
										</div>
									{:else}
										<button onclick={startEditReferral} class="flex items-center gap-1.5 group">
											<span class="text-xs text-gray-500 font-medium">Referral code:</span>
											<span class="bg-orange-50 text-orange-600 text-sm font-bold px-2.5 py-0.5 rounded-lg border border-orange-200 group-hover:bg-orange-100 transition">{referralCode || '— — — —'}</span>
											<svg class="w-4 h-4 text-gray-400 group-hover:text-orange-500 transition" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
										</button>
									{/if}
								</div>
								<p class="text-gray-600 mt-1 text-sm sm:text-base">Manage your menu items and modifiers</p>
							</div>
							<div class="flex gap-2 sm:gap-3 w-full sm:w-auto">
								<button onclick={() => openCategoryModal(null)} class="flex-1 sm:flex-initial bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold py-2.5 sm:py-3 px-4 sm:px-6 rounded-full text-sm sm:text-lg transition shadow-sm hover:shadow-md flex items-center justify-center gap-1 sm:gap-2">
									<svg class="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" /></svg>
									<span class="sm:hidden">Category</span><span class="hidden sm:inline">Add Category</span>
								</button>
								<button onclick={() => openItemDrawer(null)} class="flex-1 sm:flex-initial bg-orange-500 hover:bg-orange-600 text-white font-bold py-2.5 sm:py-3 px-4 sm:px-6 rounded-full text-sm sm:text-lg transition shadow-sm hover:shadow-md flex items-center justify-center gap-1 sm:gap-2">
									<svg class="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" /></svg>
									<span class="sm:hidden">New Item</span><span class="hidden sm:inline">Add New Item</span>
								</button>
							</div>
						</div>

						<StoreBrandInfo {showToast} />

						<div class="mb-8 bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
							<div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
								<div>
									<h3 class="font-bold text-gray-900 text-sm">Upload Your Menu</h3>
									<p class="text-xs text-gray-500 mt-0.5">Send us your menu as a PDF or image and we'll get it set up for you.</p>
								</div>
								<label class={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition cursor-pointer flex-shrink-0 ${menuUploading ? 'bg-gray-100 text-gray-400 cursor-wait' : 'bg-orange-50 text-orange-600 hover:bg-orange-100 border border-orange-200'}`}>
									<input type="file" accept=".pdf,image/*" class="hidden" oninput={handleMenuUpload} disabled={menuUploading} />
									{#if menuUploading}<div class="w-4 h-4 border-2 border-orange-500 border-t-transparent rounded-full animate-spin"></div>Sending...{:else}<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>Upload Menu{/if}
								</label>
							</div>
						</div>

						<div class="mb-12">
							<div class="flex items-center justify-between mb-6">
								<h2 class="text-2xl font-bold text-gray-900">All Menu Items</h2>
								<span class="text-sm text-gray-600">{filteredItems.length} items</span>
							</div>
							<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
								{#each filteredItems as item, i}{@render itemCard(item, i)}{/each}
								{#if filteredItems.length === 0}<div class="col-span-full text-center py-12 text-gray-400">{searchQuery ? 'No items match your search' : 'No items yet — click "Add New Item" to get started!'}</div>{/if}
							</div>
						</div>

						<div>
							<div class="flex items-center justify-between mb-6">
								<h2 class="text-2xl font-bold text-gray-900">Categories</h2>
								<span class="text-sm text-gray-600">{categories.length} categories</span>
							</div>
							<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
								{#each categories as cat}
									{@const catItemCount = items.filter((i) => (i.categoryId || i.category_id) === cat.id).length}
									<div class="bg-white rounded-2xl shadow-sm border border-gray-100 hover:shadow-lg hover:-translate-y-1 transition-all duration-300 cursor-pointer overflow-hidden" onclick={() => openCategoryDetail(cat.id)}>
										<div class="h-32 flex items-center justify-center text-5xl" style={`background:${cat.color || '#f97316'}15`}>{cat.icon || '🍽️'}</div>
										<div class="p-4">
											<h3 class="font-bold text-gray-900">{cat.name || cat.title}</h3>
											<p class="text-sm text-gray-500 mt-1">{catItemCount} item{catItemCount !== 1 ? 's' : ''}</p>
											{#if cat.description}<p class="text-xs text-gray-400 mt-1 line-clamp-2">{cat.description}</p>{/if}
											<div class="flex gap-2 mt-3">
												<button onclick={(e) => { e.stopPropagation(); openCategoryModal(cat.id); }} class="text-xs text-orange-500 hover:text-orange-600 font-medium">Edit</button>
												<button onclick={(e) => { e.stopPropagation(); handleToggleAvailability('category', cat.id); }} class={`text-xs font-medium ${(cat.available ?? cat.isActive) ? 'text-green-600' : 'text-red-500'}`}>{(cat.available ?? cat.isActive) ? 'Active' : 'Inactive'}</button>
											</div>
										</div>
									</div>
								{/each}
								{#if categories.length === 0}<div class="col-span-full text-center py-12 text-gray-400">No categories yet — click "Add Category" to get started!</div>{/if}
							</div>
						</div>

						<div>
							<div class="flex items-center justify-between mb-6">
								<h2 class="text-2xl font-bold text-gray-900">Modifier Groups</h2>
								<button onclick={() => openModifierModal(null)} class="text-sm text-orange-500 hover:text-orange-600 font-bold flex items-center gap-1">
									<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" /></svg>
									Add Modifier Group
								</button>
							</div>
							{#if modifierGroups.length > 0}
								<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
									{#each modifierGroups as group}
										<div class="bg-white rounded-xl shadow-sm border border-gray-100 p-4 hover:shadow-md transition cursor-pointer" onclick={() => openModifierModal(group.id)}>
											<div class="flex items-center justify-between">
												<h3 class="font-bold text-gray-900">{group.name}</h3>
												<span class="text-xs text-gray-400">{group.options?.length || 0} options</span>
											</div>
											<div class="flex flex-wrap gap-1 mt-2">
												{#each (group.options || []).slice(0, 4) as opt}
													<span class="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">{opt.name}{opt.extraPrice > 0 ? ` +$${opt.extraPrice}` : ''}</span>
												{/each}
												{#if (group.options?.length || 0) > 4}<span class="text-xs text-gray-400">+{(group.options?.length || 0) - 4} more</span>{/if}
											</div>
											<div class="flex items-center gap-2 mt-2 text-xs text-gray-500">
												<span>{group.minSelection === 1 && group.maxSelection === 1 ? 'Single' : `Min ${group.minSelection}, Max ${group.maxSelection}`}</span>
												{#if group.isRequired}<span class="text-orange-500 font-medium">Required</span>{/if}
											</div>
										</div>
									{/each}
								</div>
							{:else}
								<p class="text-gray-400 text-center py-8">No modifier groups yet — create one to add options like sizes, toppings, etc.</p>
							{/if}
						</div>
					</div>
				{/if}
			</main>
		</div>

		{#if itemDrawerOpen}
			<ItemDrawer itemId={editingItem} onClose={closeItemDrawer} {categories} {modifierGroups} {showToast} {loadAllData} currentCategory={currentCategory} openCategoryDetail={openCategoryDetail} openModifierModal={openModifierModal} />
		{/if}
		{#if categoryModalOpen}
			<CategoryModal categoryId={editingCategory} onClose={closeCategoryModal} {modifierGroups} {showToast} {loadAllData} />
		{/if}
		{#if modifierModalOpen}
			<ModifierGroupModal groupId={editingModifierGroup} onClose={closeModifierModal} {showToast} {loadAllData} />
		{/if}
		{#if addStoreModalOpen}
			<AddStoreModal onClose={() => (addStoreModalOpen = false)} onCreated={handleAddStore} />
		{/if}

		{#if toast.show}<Toast message={toast.message} type={toast.type} />{/if}
	</div>
{/if}
