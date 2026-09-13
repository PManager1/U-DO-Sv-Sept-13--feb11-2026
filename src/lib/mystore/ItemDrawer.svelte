<script lang="ts">
	import { onMount } from 'svelte';
	import * as api from './api';

	const RECENT_CATS_KEY = 'udo-recent-categories';
	const MAX_RECENT = 5;

	function loadRecentCategoryIds(): string[] {
		try { return JSON.parse(localStorage.getItem(RECENT_CATS_KEY) || '[]'); } catch { return []; }
	}
	function saveRecentCategoryId(catId: string) {
		const recent = loadRecentCategoryIds().filter((id) => id !== catId);
		recent.unshift(catId);
		localStorage.setItem(RECENT_CATS_KEY, JSON.stringify(recent.slice(0, MAX_RECENT)));
	}

	const FALLBACK_TEMPLATES = [
		{ id: 'fallback-toppings', emoji: '🧁', label: '🧁 Toppings', name: 'Toppings', minSelection: 0, maxSelection: 5, isRequired: false, options: [{ name: 'Extra Cheese', extraPrice: 1.0 }, { name: 'Bacon', extraPrice: 1.5 }, { name: 'Avocado', extraPrice: 1.5 }, { name: 'Mushrooms', extraPrice: 0.75 }, { name: 'Onions', extraPrice: 0.5 }] },
		{ id: 'fallback-spice', emoji: '🌶️', label: '🌶️ Spice Level', name: 'Spice Level', minSelection: 1, maxSelection: 1, isRequired: false, options: [{ name: 'Mild', extraPrice: 0 }, { name: 'Medium', extraPrice: 0 }, { name: 'Hot', extraPrice: 0 }, { name: 'Extra Hot', extraPrice: 0 }] },
		{ id: 'fallback-cooking', emoji: '🍳', label: '🍳 Cooking Style', name: 'Cooking Style', minSelection: 1, maxSelection: 1, isRequired: false, options: [{ name: 'Grilled', extraPrice: 0 }, { name: 'Fried', extraPrice: 0 }, { name: 'Baked', extraPrice: 0 }, { name: 'Steamed', extraPrice: 0 }] },
		{ id: 'fallback-extra-cheese', emoji: '🧀', label: '🧀 Extra Cheese', name: 'Extra Cheese', minSelection: 0, maxSelection: 1, isRequired: false, options: [{ name: 'Add Cheese', extraPrice: 1.0 }, { name: 'Add Extra Cheese', extraPrice: 2.0 }] },
		{ id: 'fallback-side-choice', emoji: '🍟', label: '🍟 Side Choice', name: 'Side Choice', minSelection: 1, maxSelection: 1, isRequired: false, options: [{ name: 'French Fries', extraPrice: 0 }, { name: 'Onion Rings', extraPrice: 1.0 }, { name: 'Salad', extraPrice: 0.5 }, { name: 'Coleslaw', extraPrice: 0 }] }
	];

	let { itemId, onClose, categories, modifierGroups, showToast, loadAllData, currentCategory, openCategoryDetail, openModifierModal }: {
		itemId: string | null;
		onClose: () => void;
		categories: any[];
		modifierGroups: any[];
		showToast: (msg: string, type?: string) => void;
		loadAllData: () => Promise<void>;
		currentCategory: string | null;
		openCategoryDetail: (id: string) => Promise<void>;
		openModifierModal: (id?: string | null) => void;
	} = $props();

	let form = $state({ name: '', categoryId: '', basePrice: '', description: '', promoText: '', imageUrl: '' });
	let itemImages = $state<string[]>([]);
	let selectedModifiers = $state<string[]>([]);
	let availableModifiers = $state<any[]>([]);
	let saving = $state(false);
	let loadingItem = $state(!!itemId);
	let foodCategories = $state<any[]>([]);
	let quickModifierTemplates = $state<any[]>([]);
	let quickAdding = $state<string | null>(null);

	let catSearch = $state('');
	let catDropdownOpen = $state(false);
	let catHighlightIdx = $state(-1);
	let catInput: HTMLInputElement;
	let catContainer: HTMLDivElement;

	onMount(() => {
		api.getModifierTemplates().then((templates) => {
			if (Array.isArray(templates) && templates.length > 0) {
				quickModifierTemplates = templates.map((t: any) => ({
					id: t.id || t.ID,
					emoji: '',
					label: t.label || t.Label || '',
					name: t.name || t.Name,
					minSelection: t.minSelection ?? t.MinSelection ?? 1,
					maxSelection: t.maxSelection ?? t.MaxSelection ?? 1,
					isRequired: t.isRequired ?? t.IsRequired ?? false,
					options: (t.options || t.Options || []).map((o: any) => ({ name: o.name || o.Name, extraPrice: o.extraPrice ?? o.ExtraPrice ?? 0 }))
				}));
			}
		}).catch(() => {});
		api.getFoodCategories().then((data: any) => (foodCategories = data)).catch(() => {});

		if (itemId) {
			api.getItems().then((allItems: any[]) => {
				const item = allItems.find((i) => i.id === itemId);
				if (item) {
					form = { name: item.name || '', categoryId: item.categoryId || item.category_id || '', basePrice: item.basePrice || item.base_price || '', description: item.description || '', promoText: item.promoText || item.promo_text || '', imageUrl: '' };
					try {
						const parsed = JSON.parse(item.imageUrl || item.image_url || '[]');
						itemImages = Array.isArray(parsed) ? parsed : [parsed].filter(Boolean);
					} catch {
						itemImages = [item.imageUrl || item.image_url].filter(Boolean);
					}
					selectedModifiers = item.localModifierGroupIds || item.modifier_group_ids || item.inheritedModifierGroupIds || item.modifierGroupIds || [];
				}
				loadingItem = false;
			}).catch(() => (loadingItem = false));
		}
	});

	function handleClickOutside(e: MouseEvent) {
		if (catContainer && !catContainer.contains(e.target as Node)) {
			catDropdownOpen = false;
			catSearch = '';
			catHighlightIdx = -1;
		}
	}

	$effect(() => {
		document.addEventListener('mousedown', handleClickOutside);
		return () => document.removeEventListener('mousedown', handleClickOutside);
	});

	$effect(() => {
		if (form.categoryId) {
			const cat = categories.find((c) => c.id === form.categoryId);
			const catModIds = cat?.inheritedModifierGroupIds || cat?.localModifierGroupIds || [];
			const catMods = catModIds.map((id: string) => modifierGroups.find((g) => g.id === id)).filter(Boolean);
			const unassigned = modifierGroups.filter((g) => !catMods.find((c: any) => c.id === g.id));
			availableModifiers = [...catMods, ...unassigned];
		} else {
			availableModifiers = modifierGroups;
		}
	});

	const allTemplates = $derived.by(() => {
		const names = new Set(quickModifierTemplates.map((t) => (t.name || '').toLowerCase()));
		const extras = FALLBACK_TEMPLATES.filter((ft) => !names.has(ft.name.toLowerCase()));
		return [...quickModifierTemplates, ...extras];
	});

	const uncreatedTemplates = $derived.by(() => {
		const groupNames = new Set(modifierGroups.map((g) => (g.name || '').toLowerCase()));
		return allTemplates.filter((t) => !groupNames.has((t.name || '').toLowerCase()));
	});

	const allCategories = $derived.by(() => {
		const merged = [...categories];
		const merchantNames = new Set(categories.map((c) => (c.name || '').toLowerCase()));
		for (const fc of foodCategories) {
			if (!merchantNames.has((fc.name || '').toLowerCase())) merged.push(fc);
		}
		return merged;
	});

	const { recentCats, otherCats } = $derived.by(() => {
		const recentIds = loadRecentCategoryIds();
		const recent: any[] = [];
		const other: any[] = [];
		for (const cat of allCategories) {
			if (recentIds.includes(cat.id)) recent.push(cat);
			else other.push(cat);
		}
		recent.sort((a, b) => recentIds.indexOf(a.id) - recentIds.indexOf(b.id));
		return { recentCats: recent, otherCats: other };
	});

	const filteredRecentCats = $derived.by(() => {
		if (!catSearch.trim()) return recentCats;
		const q = catSearch.toLowerCase();
		return recentCats.filter((c) => (c.name || c.title || '').toLowerCase().includes(q));
	});

	const filteredOtherCats = $derived.by(() => {
		if (!catSearch.trim()) return otherCats;
		const q = catSearch.toLowerCase();
		return otherCats.filter((c) => (c.name || c.title || '').toLowerCase().includes(q));
	});

	const visibleItems = $derived([...filteredRecentCats, ...filteredOtherCats]);

	const selectedCatName = $derived(form.categoryId ? (allCategories.find((c) => c.id === form.categoryId)?.name || allCategories.find((c) => c.id === form.categoryId)?.title || '') : '');

	function handleChange(field: string, value: any) {
		form = { ...form, [field]: value };
	}

	function selectCategory(catId: string) {
		handleChange('categoryId', catId);
		saveRecentCategoryId(catId);
		catDropdownOpen = false;
		catSearch = '';
		catHighlightIdx = -1;
	}

	function clearCategory() {
		handleChange('categoryId', '');
		catDropdownOpen = true;
		catSearch = '';
		catHighlightIdx = -1;
		setTimeout(() => catInput?.focus(), 0);
	}

	function handleCatKeyDown(e: KeyboardEvent) {
		if (!catDropdownOpen) {
			if (e.key === 'ArrowDown' || e.key === 'Enter') { catDropdownOpen = true; e.preventDefault(); }
			return;
		}
		if (e.key === 'ArrowDown') { e.preventDefault(); catHighlightIdx = Math.min(catHighlightIdx + 1, visibleItems.length - 1); }
		else if (e.key === 'ArrowUp') { e.preventDefault(); catHighlightIdx = Math.max(catHighlightIdx - 1, -1); }
		else if (e.key === 'Enter' && catHighlightIdx >= 0 && catHighlightIdx < visibleItems.length) { e.preventDefault(); selectCategory(visibleItems[catHighlightIdx].id); }
		else if (e.key === 'Escape') { catDropdownOpen = false; catSearch = ''; catHighlightIdx = -1; }
	}

	async function handleFileUpload(e: Event) {
		const files = Array.from((e.currentTarget as HTMLInputElement).files || []);
		for (const file of files) {
			try {
				const url = await api.uploadImageToGCS(file);
				itemImages = [...itemImages, url];
				showToast('Image uploaded!');
			} catch {
				showToast('Image upload failed', 'error');
			}
		}
		(e.currentTarget as HTMLInputElement).value = '';
	}

	function addImageUrl() {
		if (form.imageUrl && !itemImages.includes(form.imageUrl)) {
			itemImages = [...itemImages, form.imageUrl];
			form = { ...form, imageUrl: '' };
		}
	}
	function removeImage(index: number) { itemImages = itemImages.filter((_, i) => i !== index); }
	function moveImageLeft(index: number) {
		if (index <= 0) return;
		const arr = [...itemImages];
		[arr[index - 1], arr[index]] = [arr[index], arr[index - 1]];
		itemImages = arr;
	}
	function moveImageRight(index: number) {
		if (index >= itemImages.length - 1) return;
		const arr = [...itemImages];
		[arr[index], arr[index + 1]] = [arr[index + 1], arr[index]];
		itemImages = arr;
	}
	function setAsMain(index: number) {
		if (index <= 0) return;
		const arr = [...itemImages];
		const img = arr.splice(index, 1)[0];
		arr.unshift(img);
		itemImages = arr;
	}

	async function handleQuickAdd(template: any) {
		const existing = modifierGroups.find((g) => g.name === template.name);
		if (existing) {
			if (!selectedModifiers.includes(existing.id)) { selectedModifiers = [...selectedModifiers, existing.id]; showToast(`"${existing.name}" attached!`); }
			else showToast(`"${existing.name}" already attached`, 'error');
			return;
		}
		quickAdding = template.id;
		try {
			const groupData = {
				name: template.name,
				description: '',
				minSelection: template.minSelection,
				maxSelection: template.maxSelection,
				isRequired: template.isRequired,
				options: template.options.map((o: any) => ({ id: 'opt_' + crypto.randomUUID().replace(/-/g, '').substring(0, 12), name: o.name, extraPrice: o.extraPrice, isAvailable: true, isDefault: false }))
			};
			const created = await api.createModifierGroup(groupData);
			selectedModifiers = [...selectedModifiers, created.id];
			showToast(`"${template.name}" created & attached!`);
			await loadAllData();
		} catch (err: any) {
			showToast(`Error: ${err.message}`, 'error');
		} finally {
			quickAdding = null;
		}
	}

	async function ensureMerchantCategory(foodCategoryId: string, foodCategoryName: string) {
		const existing = categories.find((c) => (c.name || '').toLowerCase() === foodCategoryName.toLowerCase());
		if (existing) return existing.id;
		try {
			const newCat = await api.createCategory({ name: foodCategoryName, isActive: true });
			await loadAllData();
			return newCat.id;
		} catch (err) {
			console.error('Failed to auto-create category:', err);
			return null;
		}
	}

	async function handleSave(e: Event) {
		e.preventDefault();
		if (!form.name.trim()) { showToast('Item name is required', 'error'); return; }
		if (!form.categoryId) { showToast('Please select a category', 'error'); return; }
		saving = true;
		try {
			let resolvedCategoryId = form.categoryId;
			const isMerchantCat = categories.some((c) => c.id === form.categoryId);
			if (!isMerchantCat) {
				const foodCat = foodCategories.find((fc) => fc.id === form.categoryId);
				if (foodCat) {
					const merchantCatId = await ensureMerchantCategory(foodCat.id, foodCat.name);
					if (merchantCatId) resolvedCategoryId = merchantCatId;
					else { showToast('Failed to create category', 'error'); saving = false; return; }
				}
			}
			const itemData: any = { name: form.name, description: form.description, promoText: form.promoText, basePrice: parseFloat(form.basePrice) || 0, categoryId: resolvedCategoryId, imageUrl: itemImages.length > 0 ? JSON.stringify(itemImages) : '', localModifierGroupIds: selectedModifiers, isAvailable: true };
			if (itemId) {
				const allItems = await api.getItems();
				const existing = allItems.find((i: any) => i.id === itemId);
				if (existing) itemData.isAvailable = existing.isAvailable !== undefined ? existing.isAvailable : true;
				await api.updateItem(itemId, itemData);
				showToast('Item updated!');
			} else {
				await api.createItem(itemData);
				showToast('Item created!');
			}
			onClose();
			await loadAllData();
			if (currentCategory) await openCategoryDetail(currentCategory);
		} catch (err: any) {
			showToast(`Error: ${err.message}`, 'error');
		} finally {
			saving = false;
		}
	}
</script>

<div class="fixed inset-0 bg-black/40 z-[100]" onclick={onClose} style="animation:fadeIn 0.2s ease-out"></div>
<div class="fixed right-0 top-0 h-full w-full max-w-xl bg-white z-[101] shadow-2xl overflow-y-auto" style="animation:slideInRight 0.3s cubic-bezier(0.16,1,0.3,1)">
	<div class="sticky top-0 bg-white border-b border-gray-200 px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between z-10">
		<h2 class="text-lg sm:text-xl font-bold text-gray-900">{itemId ? 'Edit Item' : 'Add New Item'}</h2>
		<button onclick={onClose} class="p-2 hover:bg-gray-100 rounded-full transition">
			<svg class="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" /></svg>
		</button>
	</div>

	{#if loadingItem}
		<div class="flex items-center justify-center py-20">
			<div class="w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
		</div>
	{:else}
		<form onsubmit={handleSave} class="p-4 sm:p-6 space-y-5 sm:space-y-6">
			<div>
				<label class="block text-sm font-semibold text-gray-700 mb-2">Food Images <span class="text-gray-400 font-normal">(multiple allowed)</span></label>
				{#if itemImages.length > 0}
					<div class="grid grid-cols-3 gap-2 mb-3">
						{#each itemImages as url, idx}
							<div class="relative group">
								<img src={url} alt="" class="w-full h-24 object-cover rounded-lg border border-gray-200" />
								{#if idx === 0}<span class="absolute bottom-1 left-1 bg-orange-500 text-white text-[9px] px-1.5 py-0.5 rounded font-bold">MAIN</span>{/if}
								<div class="absolute top-1 right-1 flex gap-0.5 opacity-0 group-hover:opacity-100 transition">
									{#if idx > 0}<button type="button" onclick={() => setAsMain(idx)} class="w-6 h-6 bg-white rounded-full shadow text-xs text-orange-500 hover:bg-orange-50">⭐</button>{/if}
									{#if idx > 0}<button type="button" onclick={() => moveImageLeft(idx)} class="w-6 h-6 bg-white rounded-full shadow text-xs hover:bg-gray-100">◀</button>{/if}
									{#if idx < itemImages.length - 1}<button type="button" onclick={() => moveImageRight(idx)} class="w-6 h-6 bg-white rounded-full shadow text-xs hover:bg-gray-100">▶</button>{/if}
									<button type="button" onclick={() => removeImage(idx)} class="w-6 h-6 bg-white rounded-full shadow text-xs text-red-500 hover:bg-red-50">✕</button>
								</div>
							</div>
						{/each}
					</div>
				{/if}
				<label class="flex items-center justify-center gap-2 p-3 border-2 border-dashed border-gray-300 rounded-lg hover:border-orange-400 cursor-pointer transition">
					<input type="file" accept="image/*" multiple class="hidden" oninput={handleFileUpload} />
					<svg class="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
					<span class="text-sm text-gray-500 font-medium">Upload images</span>
				</label>
				<div class="flex gap-2 mt-2">
					<input type="url" value={form.imageUrl} oninput={(e) => handleChange('imageUrl', (e.currentTarget as HTMLInputElement).value)} class="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500" placeholder="Paste image URL..." />
					<button type="button" onclick={addImageUrl} class="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-medium transition">Add</button>
				</div>
			</div>

			<div>
				<label class="block text-sm font-semibold text-gray-700 mb-1">Item Name *</label>
				<input type="text" value={form.name} oninput={(e) => handleChange('name', (e.currentTarget as HTMLInputElement).value)} required class="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500" placeholder="e.g., Chicken Sandwich" />
			</div>

			<div bind:this={catContainer}>
				<label class="block text-sm font-semibold text-gray-700 mb-1">Category <span class="text-red-500">*</span></label>
				{#if form.categoryId && !catDropdownOpen}
					<div class="flex items-center gap-2 px-4 py-2.5 border border-gray-300 rounded-lg bg-gray-50">
						<span class="flex-1 text-sm font-medium text-gray-900">{selectedCatName}</span>
						<button type="button" onclick={() => { catDropdownOpen = true; setTimeout(() => catInput?.focus(), 0); }} class="text-gray-400 hover:text-orange-500 transition p-0.5" title="Change category">
							<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
						</button>
						<button type="button" onclick={clearCategory} class="text-gray-400 hover:text-red-500 transition p-0.5" title="Clear">
							<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" /></svg>
						</button>
					</div>
				{:else}
					<div class="relative">
						<svg class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
						<input bind:this={catInput} type="text" value={catSearch} oninput={(e) => { catSearch = (e.currentTarget as HTMLInputElement).value; catDropdownOpen = true; catHighlightIdx = -1; }} onfocus={() => (catDropdownOpen = true)} onkeydown={handleCatKeyDown} class="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 text-sm" placeholder={form.categoryId ? 'Change category...' : 'Search or select a category...'} autocomplete="off" />
					</div>
				{/if}

				{#if catDropdownOpen}
					<div class="mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-64 overflow-y-auto z-50 relative">
						{#if visibleItems.length === 0}
							<div class="px-4 py-3 text-sm text-gray-400 text-center">No categories found</div>
						{:else}
							{#if filteredRecentCats.length > 0}
								<div class="px-3 py-1.5 text-[10px] font-bold text-gray-400 uppercase tracking-wider bg-gray-50 sticky top-0">Recently Used</div>
								{#each filteredRecentCats as cat, i}
									<button type="button" onclick={() => selectCategory(cat.id)} class={`w-full flex items-center gap-3 px-3 py-2 text-sm text-left transition ${catHighlightIdx === i ? 'bg-orange-50 text-orange-700' : 'text-gray-700 hover:bg-gray-50'} ${form.categoryId === cat.id ? 'font-semibold' : ''}`}>
										<span class="text-base flex-shrink-0">{cat.icon || '🍽️'}</span>
										<span class="flex-1 truncate">{cat.name || cat.title}</span>
										{#if form.categoryId === cat.id}<svg class="w-4 h-4 text-orange-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" /></svg>{/if}
									</button>
								{/each}
							{/if}
							{#if filteredOtherCats.length > 0}
								{#if filteredRecentCats.length > 0}<div class="border-t border-gray-100"></div>{/if}
								<div class="px-3 py-1.5 text-[10px] font-bold text-gray-400 uppercase tracking-wider bg-gray-50 sticky top-0">All Categories</div>
								{#each filteredOtherCats as cat, i}
									<button type="button" onclick={() => selectCategory(cat.id)} class={`w-full flex items-center gap-3 px-3 py-2 text-sm text-left transition ${catHighlightIdx === filteredRecentCats.length + i ? 'bg-orange-50 text-orange-700' : 'text-gray-700 hover:bg-gray-50'} ${form.categoryId === cat.id ? 'font-semibold' : ''}`}>
										<span class="text-base flex-shrink-0">{cat.icon || '🍽️'}</span>
										<span class="flex-1 truncate">{cat.name || cat.title}</span>
										{#if form.categoryId === cat.id}<svg class="w-4 h-4 text-orange-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" /></svg>{/if}
									</button>
								{/each}
							{/if}
						{/if}
					</div>
				{/if}
				<input type="hidden" value={form.categoryId} required />
			</div>

			<div>
				<label class="block text-sm font-semibold text-gray-700 mb-1">Price ($)</label>
				<input type="number" step="0.01" value={form.basePrice} oninput={(e) => handleChange('basePrice', (e.currentTarget as HTMLInputElement).value)} class="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500" placeholder="0.00" />
			</div>

			<div>
				<label class="block text-sm font-semibold text-gray-700 mb-1">Description</label>
				<textarea value={form.description} oninput={(e) => handleChange('description', (e.currentTarget as HTMLTextAreaElement).value)} rows={3} class="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 resize-none" placeholder="Describe this item..."></textarea>
			</div>

			<div>
				<label class="block text-sm font-semibold text-gray-700 mb-1">Promo Text</label>
				<input type="text" value={form.promoText} oninput={(e) => handleChange('promoText', (e.currentTarget as HTMLInputElement).value)} class="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500" placeholder="e.g., Best Seller, New!" />
			</div>

			<div>
				<div class="flex items-center justify-between mb-2">
					<label class="block text-sm font-semibold text-gray-700">Customization Options</label>
					<button type="button" onclick={() => openModifierModal(null)} class="text-xs text-orange-500 hover:text-orange-600 font-semibold flex items-center gap-1">
						<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" /></svg>
						Custom Group
					</button>
				</div>

				{#if selectedModifiers.length > 0}
					<div class="mb-3 p-3 bg-green-50 rounded-lg border border-green-200">
						<p class="text-xs font-semibold text-green-700 mb-1.5">Attached to this item ({selectedModifiers.length})<span class="ml-1 text-[10px] font-normal text-green-500">↕ drag order = customer display order</span></p>
						<div class="space-y-1">
							{#each selectedModifiers as id, idx}
								{@const group = modifierGroups.find((g) => g.id === id)}
								{#if group}
									<div class="flex items-center gap-1.5 bg-white rounded-lg border border-green-200 px-2.5 py-1.5">
										<span class="text-[10px] font-bold text-green-600 bg-green-100 rounded-full w-5 h-5 flex items-center justify-center flex-shrink-0">{idx + 1}</span>
										<div class="flex-1 min-w-0 flex items-center gap-1.5">
											<span class="text-xs font-medium text-gray-900 truncate">{group.name}</span>
											<span class="text-[10px] text-gray-400">({group.options?.length || 0})</span>
											{#if group.isRequired}<span class="text-red-500 font-bold text-[10px]">*</span>{/if}
										</div>
										<div class="flex items-center gap-0.5 flex-shrink-0">
											<button type="button" disabled={idx === 0} onclick={() => { const arr = [...selectedModifiers]; [arr[idx - 1], arr[idx]] = [arr[idx], arr[idx - 1]]; selectedModifiers = arr; }} class={`w-6 h-6 rounded text-xs flex items-center justify-center transition ${idx === 0 ? 'text-gray-200 cursor-not-allowed' : 'text-gray-400 hover:bg-green-100 hover:text-green-700'}`} title="Move up">▲</button>
											<button type="button" disabled={idx === selectedModifiers.length - 1} onclick={() => { const arr = [...selectedModifiers]; [arr[idx], arr[idx + 1]] = [arr[idx + 1], arr[idx]]; selectedModifiers = arr; }} class={`w-6 h-6 rounded text-xs flex items-center justify-center transition ${idx === selectedModifiers.length - 1 ? 'text-gray-200 cursor-not-allowed' : 'text-gray-400 hover:bg-green-100 hover:text-green-700'}`} title="Move down">▼</button>
										</div>
										<button type="button" onclick={() => (selectedModifiers = selectedModifiers.filter((x) => x !== id))} class="ml-0.5 text-gray-300 hover:text-red-500 transition text-sm flex-shrink-0" title="Remove">×</button>
									</div>
								{/if}
							{/each}
						</div>
					</div>
				{/if}

				{#if availableModifiers.length > 0}
					<div class="mb-3">
						<p class="text-xs text-gray-500 font-medium mb-2">Select groups to attach:</p>
						<div class="space-y-2 max-h-60 overflow-y-auto">
							{#each availableModifiers as group}
								{@const isCatMod = form.categoryId ? (categories.find((c) => c.id === form.categoryId)?.inheritedModifierGroupIds || categories.find((c) => c.id === form.categoryId)?.localModifierGroupIds || []).includes(group.id) : false}
								{@const isChecked = selectedModifiers.includes(group.id)}
								<div class={`p-3 rounded-lg transition border ${isChecked ? 'bg-orange-50 border-orange-200' : 'bg-gray-50 border-transparent hover:bg-gray-100'}`}>
									<div class="flex items-center gap-3">
										<input type="checkbox" checked={isChecked} onchange={(e) => { if ((e.currentTarget as HTMLInputElement).checked) selectedModifiers = [...selectedModifiers, group.id]; else selectedModifiers = selectedModifiers.filter((id) => id !== group.id); }} class="w-4 h-4 text-orange-500 rounded border-gray-300 focus:ring-orange-500" />
										<div class="flex-1 min-w-0">
											<div class="flex items-center gap-2">
												<span class="text-sm font-medium text-gray-900">{group.name}</span>
												{#if group.isRequired}<span class="text-[10px] bg-red-100 text-red-600 px-1.5 py-0.5 rounded font-semibold">Required</span>{/if}
												{#if group.minSelection === 1 && group.maxSelection === 1}<span class="text-[10px] bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded font-semibold">Single</span>{:else}<span class="text-[10px] bg-purple-100 text-purple-600 px-1.5 py-0.5 rounded font-semibold">Multi</span>{/if}
												{#if isCatMod}<span class="text-[10px] bg-green-100 text-green-600 px-1.5 py-0.5 rounded font-semibold">Category</span>{/if}
											</div>
											{#if group.options && group.options.length > 0}
												<div class="flex flex-wrap gap-1 mt-1.5">
													{#each group.options.slice(0, 4) as opt}
														<span class="text-[11px] bg-white text-gray-600 px-1.5 py-0.5 rounded border border-gray-200">{opt.name}{opt.extraPrice > 0 ? ` +$${opt.extraPrice}` : ''}</span>
													{/each}
													{#if group.options.length > 4}<span class="text-[11px] text-gray-400">+{group.options.length - 4} more</span>{/if}
												</div>
											{/if}
										</div>
										<button type="button" onclick={(e) => { e.preventDefault(); openModifierModal(group.id); }} class="p-1.5 text-gray-400 hover:text-orange-500 hover:bg-orange-50 rounded-lg transition flex-shrink-0" title="Edit modifier group">
											<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
										</button>
									</div>
								</div>
							{/each}
						</div>
					</div>
				{/if}

				{#if uncreatedTemplates.length > 0}
					<div class="border-t border-gray-200 pt-3">
						<p class="text-xs text-gray-500 font-medium mb-2">Or quick-create a new group:</p>
						<div class="flex gap-2 overflow-x-auto pb-1">
							{#each uncreatedTemplates as template}
								<button type="button" onclick={() => handleQuickAdd(template)} disabled={quickAdding === template.id} class={`flex-shrink-0 flex flex-col items-center justify-center px-3 py-2 rounded-xl border-2 text-xs font-semibold transition whitespace-nowrap ${quickAdding === template.id ? 'border-orange-400 bg-orange-50 text-orange-700 opacity-60' : 'border-gray-200 bg-white text-gray-700 hover:border-orange-400 hover:bg-orange-50 hover:shadow-sm'}`}>
									{#if quickAdding === template.id}
										<div class="w-5 h-5 border-2 border-orange-500 border-t-transparent rounded-full animate-spin mb-0.5"></div>
									{:else}
										<span class="text-lg leading-none mb-0.5">{template.emoji || String(template.label || '').split(' ')[0] || '➕'}</span>
										<span>{template.label || template.name}</span>
									{/if}
								</button>
							{/each}
						</div>
					</div>
				{/if}

				{#if availableModifiers.length === 0 && uncreatedTemplates.length === 0}
					<p class="text-sm text-gray-400 text-center py-4">No modifier groups yet. Create one to add options like sizes, toppings, etc.</p>
				{/if}
			</div>

			<div class="sticky bottom-0 bg-white pt-4 pb-2 border-t border-gray-100">
				<button type="submit" disabled={saving} class="w-full bg-orange-500 hover:bg-orange-600 disabled:bg-orange-300 text-white font-bold py-3 px-6 rounded-lg transition shadow-sm hover:shadow-md flex items-center justify-center gap-2">
					{#if saving}<div class="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>Saving...{:else}{itemId ? 'Update Item' : 'Create Item'}{/if}
				</button>
			</div>
		</form>
	{/if}
</div>

<style>
	@keyframes slideInRight {
		from { transform: translateX(100%); }
		to { transform: translateX(0); }
	}
	@keyframes fadeIn {
		from { opacity: 0; }
		to { opacity: 1; }
	}
</style>
