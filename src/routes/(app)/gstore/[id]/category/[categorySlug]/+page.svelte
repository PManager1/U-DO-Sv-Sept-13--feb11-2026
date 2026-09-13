<script lang="ts">
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import { slugify } from '$lib/slug';
	import { items } from '$lib/categoryData';
	import { admin } from '$lib/admin.svelte';
	import CategoryRibbon from '$lib/CategoryRibbon.svelte';
	import Breadcrumb from '$lib/Breadcrumb.svelte';
	import GroceryItemCard from '$lib/GroceryItemCard.svelte';
	import GroceryItemModal from '$lib/GroceryItemModal.svelte';
	import GrocerySearchOverlay from '$lib/GrocerySearchOverlay.svelte';

	let { data } = $props();

	let modalItem = $state<any>(null);
	let searchTerm = $state('');
	let searchFocused = $state(false);
	let debouncedTerm = $state('');
	let submittedQuery = $state(page.url.searchParams.get('k') || '');
	let searchEl = $state<HTMLInputElement>();

	const categorySlug = $derived(page.params.categorySlug || '');
	const activeSubcategory = $derived(page.url.searchParams.get('subcategory'));

	function escapeRegex(str: string): string {
		return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
	}

	function filterBySubcategory(items: any[], subcategory: string): any[] {
		const escaped = escapeRegex(subcategory);
		const regex = new RegExp(`\\b${escaped}\\b`, 'i');
		return items.filter(item => 
			regex.test(item.name) || (item.description && regex.test(item.description))
		);
	}

	function findMatchingSections(menu: any[], keywords: string[]): any[] {
		return menu.filter(section =>
			keywords.some(k => (section.category || '').toLowerCase().includes(k.toLowerCase()))
		);
	}

	function getCategoryItems(): any[] {
		const category = items.find(item => slugify(item.label) === categorySlug);
		if (!category) return [];
		
		const matchingSections = findMatchingSections(data.menu || [], category.keywords);
		const allItems = matchingSections.flatMap(section => section.items || []);
		
		if (activeSubcategory) {
			return filterBySubcategory(allItems, activeSubcategory);
		}
		return allItems;
	}

	const categoryItems = $derived(getCategoryItems());
	const activeCategory = $derived(items.find(item => slugify(item.label) === categorySlug));
	const activeCategoryIndex = $derived(items.findIndex(item => slugify(item.label) === categorySlug));

	const breadcrumbItems = $derived([
		{ label: 'Store Home', href: `/gstore/${data.storeId}` },
		{ label: activeCategory?.label || 'Category' }
	]);

	function handleSubcategoryClick(sub: string) {
		const current = page.url.searchParams.get('subcategory');
		if (current === sub) {
			goto('?', { keepFocus: true, noScroll: true });
		} else {
			goto(`?subcategory=${encodeURIComponent(sub)}`, { keepFocus: true, noScroll: true });
		}
	}

	function handleCategoryClick(item: any, index: number) {
		goto(`/gstore/${data.storeId}/category/${slugify(item.label)}`);
	}

	function scrollToCategory(index: number) {
		const el = document.getElementById(`cat-${index}`);
		if (!el) return;
		el.scrollIntoView({ behavior: 'smooth', block: 'start' });
	}

	function slug(text: string) {
		return slugify(text);
	}

	const hasSearch = $derived(searchTerm.trim().length > 0);

	const searchResults = $derived.by(() => {
		if (!hasSearch) return [];
		const q = searchTerm.trim().toLowerCase();
		const seen = new Set<string>();
		const out: any[] = [];
		for (const s of data.menu || []) {
			for (const it of s.items || []) {
				if (!it) continue;
				const key = it.id || slug(it.name);
				if (seen.has(key)) continue;
				const name = (it.name || '').toLowerCase();
				const desc = (it.description || '').toLowerCase();
				if (name.includes(q) || desc.includes(q)) {
					seen.add(key);
					out.push(it);
				}
			}
		}
		return out;
	});

	const liveSuggestions = $derived(debouncedTerm.trim() ? searchResults.slice(0, 8) : []);

	function searchItems(q: string) {
		const needle = q.trim().toLowerCase();
		if (!needle) return [];
		const seen = new Set<string>();
		const out: any[] = [];
		for (const s of data.menu || []) {
			for (const it of s.items || []) {
				if (!it) continue;
				const key = it.id || slug(it.name);
				if (seen.has(key)) continue;
				const name = (it.name || '').toLowerCase();
				const desc = (it.description || '').toLowerCase();
				if (name.includes(needle) || desc.includes(needle)) {
					seen.add(key);
					out.push(it);
				}
			}
		}
		return out;
	}

	$effect(() => {
		const k = page.url.searchParams.get('k') || '';
		if (k !== submittedQuery) submittedQuery = k;
	});

	$effect(() => {
		if (!searchFocused && submittedQuery && searchTerm !== submittedQuery) {
			searchTerm = submittedQuery;
		}
	});

	function submitSearch(term: string) {
		const t = (term || '').trim();
		searchTerm = t;
		searchFocused = false;
		submittedQuery = t;
		goto(`?k=${encodeURIComponent(t)}`, { replaceState: true, keepFocus: true });
	}

	function clearSearch() {
		searchTerm = '';
		debouncedTerm = '';
		submittedQuery = '';
		if (searchEl) searchEl.value = '';
		goto('?', { replaceState: true, keepFocus: true });
		searchEl?.focus();
	}

	function onSearchInput() {
		searchTerm = searchEl?.value || '';
	}

	$effect(() => {
		const t = searchTerm.trim();
		if (!t) {
			debouncedTerm = '';
			return;
		}
		const id = setTimeout(() => (debouncedTerm = t), 250);
		return () => clearTimeout(id);
	});
</script>

<svelte:head><title>{activeCategory?.label || 'Category'} - {data.store?.name}</title></svelte:head>

<div class="min-h-screen bg-[#f9f7f5] pb-16">
	{#if !activeCategory}
		<div class="flex items-center justify-center min-h-[60vh]">
			<div class="text-center">
				<p class="text-gray-900 text-lg font-semibold">Category not found</p>
				<a href="/gstore/{data.storeId}" class="text-orange-500 font-semibold text-sm mt-2 inline-block">Back to store</a>
			</div>
		</div>
	{:else}

	<!-- Search bar - right aligned, constrained width -->
			
		<div class="mx-auto max-w-[1400px] px-3 sm:px-6">
		<div class="mb-6 flex items-center gap-4">
				<div class="min-w-0 flex-1">
					<Breadcrumb items={breadcrumbItems} />
					<header class="mb-1">
						<h1 class="text-3xl font-bold text-gray-900">{activeCategory.label}</h1>
						{#if activeSubcategory}
							<p class="text-sm text-gray-500 mt-1">Filtering by: <span class="font-semibold text-orange-600">{activeSubcategory}</span></p>
						{/if}
					</header>
				</div>
				<div class="flex-shrink-0 sm:w-auto sm:min-w-[280px] md:min-w-[340px]">
					<div class="relative">
						<span class="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-black">
							<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
								<path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-4.35-4.35M17 10.5a6.5 6.5 0 11-13 0 6.5 6.5 0 0113 0z"/>
							</svg>
						</span>
						<input
							bind:this={searchEl}
							type="search"
							inputmode="search"
							bind:value={searchTerm}
							oninput={onSearchInput}
							onfocus={() => (searchFocused = true)}
							onblur={() => setTimeout(() => (searchFocused = false), 150)}
							onkeydown={(e) => {
								if (e.key === 'Enter') submitSearch(searchTerm);
								else if (e.key === 'Escape') { searchFocused = false; clearSearch(); }
							}}
							placeholder={`Search ${data.store?.name || 'store'}...`}
							class="w-full rounded-full border border-gray-200 bg-white py-2.5 pr-9 text-sm text-gray-900 shadow-sm transition placeholder:text-black focus:border-transparent focus:ring-2 focus:ring-orange-400/50 focus:outline-none [&::-webkit-search-cancel-button]:hidden"
							style="padding-left:2.375rem"
						/>
						{#if searchTerm}
							<button
								onclick={clearSearch}
								aria-label="Clear search"
								class="absolute top-1/2 right-2.5 flex h-6 w-6 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full bg-gray-100 text-gray-900 transition hover:bg-gray-200 hover:text-gray-900"
							>
								<svg class="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2.5">
									<path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/>
								</svg>
							</button>
						{/if}
						{#if searchFocused}
							<GrocerySearchOverlay
								store={data.store}
								menu={data.menu || []}
								query={searchTerm.trim()}
								showStateB={Boolean(debouncedTerm.trim())}
								suggestions={liveSuggestions}
								onSelect={submitSearch}
								onClose={() => (searchFocused = false)}
							/>
						{/if}
					</div>
				</div>
			</div>
			
			<CategoryRibbon 
				menu={data.menu || []}
				onScrollTo={scrollToCategory}
				onCategoryClick={handleCategoryClick}
				activeCategoryIndex={activeCategoryIndex}
			/>
		</div>
		
		<div class="mx-auto max-w-[1400px] px-3 pb-4 sm:px-6">
			

			{#if submittedQuery}
				<div class="mb-4">
					<div class="mb-3 flex items-center justify-between gap-2">
						<h2 class="flex items-center gap-2 text-lg font-bold text-gray-900">
							Results for "<span class="text-orange-600">{submittedQuery}</span>"
							<span class="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-semibold text-gray-400">{searchItems(submittedQuery).length}</span>
						</h2>
						<button
							onclick={clearSearch}
							class="flex items-center gap-1 text-sm font-semibold text-orange-600 transition hover:text-orange-700"
						>
							<svg class="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2.5">
								<path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/>
							</svg>
							Clear
						</button>
					</div>
					{#if searchItems(submittedQuery).length === 0}
						<div class="py-16 text-center">
							<svg class="mx-auto mb-3 h-14 w-14 text-gray-900" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.5">
								<path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-4.35-4.35M17 10.5a6.5 6.5 0 11-13 0 6.5 6.5 0 0113 0z"/>
							</svg>
							<p class="font-medium text-gray-900">No items match your search</p>
							<p class="mt-1 text-sm text-gray-900">Try a different keyword or clear the search.</p>
							<button onclick={clearSearch} class="mt-4 text-sm font-semibold text-orange-600 transition hover:text-orange-700">Clear search</button>
						</div>
					{:else}
						<div class="grid grid-cols-2 gap-4 sm:grid-cols-[repeat(auto-fill,minmax(160px,1fr))]">
							{#each searchItems(submittedQuery) as item}
								<GroceryItemCard {item} store={data.store} onOpen={(it) => (modalItem = it)} />
							{/each}
						</div>
					{/if}
				</div>
			{:else}
				{#if activeCategory.subcategories && activeCategory.subcategories.length > 0}
					<div class="flex flex-wrap gap-2 mb-6">
						{#each activeCategory.subcategories as sub}
							<button
								onclick={() => handleSubcategoryClick(sub)}
								class={`px-4 py-2 cursor-pointer rounded-full text-sm font-medium transition ${
									activeSubcategory === sub
										? 'bg-orange-500 text-white'
										: 'bg-gray-100 text-gray-700 hover:bg-gray-200'
								}`}
							>
								{sub}
							</button>
						{/each}
						{#if activeSubcategory}
							<button
								onclick={() => goto('?', { keepFocus: true, noScroll: true })}
								class="px-4 py-2 rounded-full text-sm font-medium bg-gray-200 text-gray-600 hover:bg-gray-300 transition"
							>
								Clear
							</button>
						{/if}
					</div>
				{/if}

				{#if categoryItems.length === 0}
					<div class="text-center py-16">
						<div class="w-20 h-20 mx-auto rounded-full bg-gray-100 text-gray-400 flex items-center justify-center mb-4">
							<svg class="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.5">
								<path stroke-linecap="round" stroke-linejoin="round" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
							</svg>
						</div>
						<p class="text-lg font-semibold text-gray-900">No items found</p>
						<p class="text-sm text-gray-500 mt-1">
							{#if activeSubcategory}
								No items match "{activeSubcategory}"
							{:else}
								No items available in this category
							{/if}
						</p>
					</div>
				{:else}
					<div class="grid grid-cols-2 gap-4 sm:grid-cols-[repeat(auto-fill,minmax(160px,1fr))]">
						{#each categoryItems as item}
							<GroceryItemCard
								{item}
								store={data.store}
								onOpen={(it) => (modalItem = it)}
							/>
						{/each}
					</div>
				{/if}
			{/if}
		</div>
	{/if}
</div>

{#if modalItem}
	<GroceryItemModal
		item={modalItem}
		store={data.store}
		onOpenItem={(it) => (modalItem = it)}
		onClose={() => (modalItem = null)}
	/>
{/if}
