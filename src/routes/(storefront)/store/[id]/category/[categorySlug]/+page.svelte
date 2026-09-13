<script lang="ts">
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { slugify } from '$lib/slug';
	import { items } from '$lib/categoryData';
	import { cart, addToCart } from '$lib/cart.svelte';
	import { admin } from '$lib/admin.svelte';

	let { data } = $props();

	const categorySlug = $derived($page.params.categorySlug || '');
	const activeSubcategory = $derived($page.url.searchParams.get('subcategory'));

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

	function handleSubcategoryClick(sub: string) {
		const current = $page.url.searchParams.get('subcategory');
		if (current === sub) {
			goto('?', { keepFocus: true, noScroll: true });
		} else {
			goto(`?subcategory=${encodeURIComponent(sub)}`, { keepFocus: true, noScroll: true });
		}
	}

	function handleAddItem(item: any, e: Event) {
		e.stopPropagation();
		const id = item.id || slugify(item.name);
		addToCart(data.store, { id, name: item.name, price: item.price, image: item.raw_image_url || '' });
	}
</script>

<svelte:head><title>{activeCategory?.label || 'Category'} - {data.store?.name}</title></svelte:head>

<div class="pb-16">
	{#if !activeCategory}
		<div class="flex items-center justify-center min-h-[60vh]">
			<div class="text-center">
				<p class="text-gray-900 text-lg font-semibold">Category not found</p>
				<a href="/store/{data.storeId}" class="text-orange-500 font-semibold text-sm mt-2 inline-block">Back to store</a>
			</div>
		</div>
	{:else}
		<div class="px-4 sm:px-6 lg:px-8">
			<header class="mb-6">
				<h1 class="text-3xl font-bold text-gray-900">{activeCategory.label}</h1>
				{#if activeSubcategory}
					<p class="text-sm text-gray-500 mt-1">Filtering by: <span class="font-semibold text-orange-600">{activeSubcategory}</span></p>
				{/if}
			</header>

			{#if activeCategory.subcategories && activeCategory.subcategories.length > 0}
				<div class="flex flex-wrap gap-2 mb-6">
					{#each activeCategory.subcategories as sub}
						<button
							onclick={() => handleSubcategoryClick(sub)}
							class={`px-4 py-2 rounded-full text-sm font-medium transition ${
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
				<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
					{#each categoryItems as item, j}
						{@const itemId = item.id || slugify(item.name)}
						{@const isAvailable = item.available !== false}
						<div
							onclick={() => isAvailable && null}
							class={`bg-white rounded-xl border border-gray-100 overflow-hidden transition cursor-pointer ${
								isAvailable ? 'hover:shadow-md hover:-translate-y-0.5' : 'opacity-50 pointer-events-none'
							}`}
						>
							<div class="relative aspect-[4/3] bg-white overflow-hidden">
								{#if item.raw_image_url}
									<img src={item.raw_image_url} alt={item.name} class="w-full h-full object-contain object-center bg-white" loading="lazy" />
								{:else}
									<div class="w-full h-full flex items-center justify-center text-2xl text-gray-300">🥟</div>
								{/if}
								{#if !isAvailable}
									<div class="absolute inset-0 bg-black/40 flex items-center justify-center">
										<span class="bg-gray-900 text-white text-xs font-bold px-3 py-1 rounded-full">Out of Stock</span>
									</div>
								{/if}
								{#if isAvailable}
									<button
										onclick={(e) => handleAddItem(item, e)}
										class="absolute bottom-2 right-2 w-8 h-8 bg-orange-500 hover:bg-orange-600 text-white rounded-full shadow-lg flex items-center justify-center transition active:scale-90 cursor-pointer"
									>
										<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
										</svg>
									</button>
								{/if}
							</div>
							<div class="p-3">
								<p class="text-sm font-bold text-gray-900">${Number(item.price).toFixed(2)}</p>
								<p class="text-sm text-gray-900 font-semibold leading-tight mt-0.5 line-clamp-2">{item.name}</p>
								{#if item.description && item.description.length > 0}
									<p class="text-xs text-gray-900 mt-1 line-clamp-2">{item.description}</p>
								{/if}
							</div>
						</div>
					{/each}
				</div>
			{/if}
		</div>
	{/if}
</div>
