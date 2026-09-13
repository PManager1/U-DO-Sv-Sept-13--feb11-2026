<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import { fetchStoreById, fetchStoreMenu, fetchStoreNav, recordBrandVisit } from '$lib/storefront';
	import GroceryItemModal from '$lib/GroceryItemModal.svelte';
	import GrocerySearchOverlay from '$lib/GrocerySearchOverlay.svelte';
	import GroceryItemCard from '$lib/GroceryItemCard.svelte';
	import ResultsFilterBar from '$lib/ResultsFilterBar.svelte';
	import ReOrderView from '$lib/ReOrderView.svelte';
	import FilterBar from '$lib/FilterBar.svelte';
	import CategoryRibbon from '$lib/CategoryRibbon.svelte';
	import { slugify } from '$lib/slug';
	import { admin, ensureAdminLoaded } from '$lib/admin.svelte';
	import { setActiveStore } from '$lib/cart.svelte';

	let storeId = $derived(page.params.id as string);

	let store = $state<any>(null);
	let menu = $state<any[]>([]);
	let loading = $state(true);
	let activeCatIndex = $state(0);
	let modalItem = $state<any>(null);
	let showHours = $state(false);
	let showAllHours = $state(false);
	let searchTerm = $state('');
	let searchFocused = $state(false);
	let debouncedTerm = $state('');
	let submittedQuery = $state(page.url.searchParams.get('k') || '');

	const hasSearch = $derived(searchTerm.trim().length > 0);

	const searchResults = $derived.by(() => {
		if (!hasSearch) return [];
		const q = searchTerm.trim().toLowerCase();
		const seen = new Set<string>();
		const out: any[] = [];
		for (const s of menu) {
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
		for (const s of menu) {
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

	// --- results filtering state ---
	let sortMode = $state('relevance');
	let resultFilters = $state<{ brand: string[]; dietary: string[]; flavor: string[] }>({
		brand: [],
		dietary: [],
		flavor: []
	});

	const itemText = (it: any) => `${it.name || ''} ${it.description || ''}`.toLowerCase();

	const FLAVOR_KEYWORDS = [
		'chocolate',
		'choc',
		'peanut butter',
		'peanut',
		'vanilla',
		'strawberry',
		'almond',
		'blueberry',
		'raspberry',
		'mango',
		'coffee',
		'caramel',
		'lemon',
		'lime',
		'orange',
		'coconut',
		'maple',
		'cherry',
		'grape',
		'banana',
		'pumpkin',
		'cinnamon',
		'honey',
		'oatmeal',
		'apple',
		'salted caramel'
	];

	function applyFilters(next: {
		sort: string;
		filters: { brand: string[]; dietary: string[]; flavor: string[] };
	}) {
		sortMode = next.sort;
		resultFilters = next.filters;
	}

	// brand prefix match (leading 1-2 word token)
	function matchesBrand(it: any, brand: string) {
		const words = (it.name || '').trim().split(/\s+/);
		return words.slice(0, 2).join(' ').toLowerCase() === brand.toLowerCase();
	}

	const resultItems = $derived.by(() => {
		let out = submittedQuery ? searchItems(submittedQuery) : [];
		if (resultFilters.brand.length > 0) {
			out = out.filter((it) => resultFilters.brand.some((b) => matchesBrand(it, b)));
		}
		if (resultFilters.dietary.includes('Organic')) {
			out = out.filter((it) => /organic/i.test(itemText(it)));
		}
		if (resultFilters.flavor.length > 0) {
			out = out.filter((it) =>
				FLAVOR_KEYWORDS.some((f) => resultFilters.flavor.includes(f) && itemText(it).includes(f))
			);
		}
		switch (sortMode) {
			case 'price-asc':
				out = [...out].sort((a, b) => (a.price ?? 0) - (b.price ?? 0));
				break;
			case 'price-desc':
				out = [...out].sort((a, b) => (b.price ?? 0) - (a.price ?? 0));
				break;
			case 'name':
				out = [...out].sort((a, b) => String(a.name || '').localeCompare(String(b.name || '')));
				break;
			default:
				break;
		}
		return out;
	});

	// sync submittedQuery from URL (back button / direct nav)
	$effect(() => {
		const k = page.url.searchParams.get('k') || '';
		if (k !== submittedQuery) submittedQuery = k;
	});

	// keep the input value in sync with the active (submitted) query
	$effect(() => {
		if (!searchFocused && submittedQuery && searchTerm !== submittedQuery) {
			searchTerm = submittedQuery;
		}
	});

	let searchEl = $state<HTMLInputElement>();

	function submitSearch(term: string) {
		const t = (term || '').trim();
		searchTerm = t;
		searchFocused = false;
		submittedQuery = t;
		goto(`${page.url.pathname}?k=${encodeURIComponent(t)}`, {
			replaceState: true,
			keepFocus: true
		});
	}

	function clearSearch() {
		searchTerm = '';
		debouncedTerm = '';
		submittedQuery = '';
		if (searchEl) searchEl.value = '';
		goto(page.url.pathname, { replaceState: true, keepFocus: true });
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

	// Items in this store sharing a tag with the currently opened item ("Often bought with").
	const recommendedItems = $derived(
		modalItem
			? menu
					.flatMap((a: any) => a.items || [])
					.filter((o: any) => {
						if (!o) return false;
						if (modalItem.name && o.name === modalItem.name) return false;
						if (modalItem.id && o.id === modalItem.id) return false;
						const t1 = modalItem.tags || [];
						const t2 = o.tags || [];
						return t1.some((t: string) => t2.includes(t));
					})
					.slice(0, 8)
			: []
	);

	$effect(() => {
		if (!showHours) return;
		const onKey = (e: KeyboardEvent) => {
			if (e.key === 'Escape') showHours = false;
		};
		window.addEventListener('keydown', onKey);
		return () => window.removeEventListener('keydown', onKey);
	});
	let nav = $state<any[]>([]);
	let navLoading = $state(true);
	let expandedCat = $state<string | null>(null);
	let activeSubcat = $state<string | null>(null);
	let showReorder = $state(false);
	let sectionRefs: (HTMLElement | null)[] = $state([]);
	let tagScrolls = $state<Record<string, HTMLElement | null>>({});
	let catScrolls = $state<Record<number, HTMLElement | null>>({});
	let isScrolling = false;

	function scrollTagRow(tag: string, dir: 'left' | 'right') {
		const el = tagScrolls[tag];
		if (!el) return;
		const amount = el.clientWidth * 0.6;
		el.scrollBy({ left: dir === 'left' ? -amount : amount, behavior: 'smooth' });
	}

	function scrollCatRow(i: number, dir: 'left' | 'right') {
		const el = catScrolls[i];
		if (!el) return;
		const amount = el.clientWidth * 0.6;
		el.scrollBy({ left: dir === 'left' ? -amount : amount, behavior: 'smooth' });
	}

	function slug(text: string) {
		return slugify(text);
	}

	function to12h(time24?: string) {
		if (!time24) return '';
		const [h, m] = time24.split(':').map(Number);
		const ampm = h >= 12 ? 'PM' : 'AM';
		const h12 = h % 12 || 12;
		return `${h12}:${String(m).padStart(2, '0')} ${ampm}`;
	}

	function catSection(node: HTMLElement, i: number) {
		sectionRefs[i] = node;
		return {
			destroy() {
				sectionRefs[i] = null;
			}
		};
	}

	$effect(() => {
		if (menu.length === 0) return;
		const observer = new IntersectionObserver(
			(entries) => {
				if (isScrolling) return;
				for (const entry of entries) {
					if (entry.isIntersecting) {
						const idx = Number((entry.target as HTMLElement).dataset.catIndex);
						if (!isNaN(idx)) activeCatIndex = idx;
						break;
					}
				}
			},
			{ rootMargin: '-120px 0px -60% 0px', threshold: 0 }
		);
		for (const ref of sectionRefs) if (ref) observer.observe(ref);
		return () => observer.disconnect();
	});

	onMount(() => {
		ensureAdminLoaded();
	});

	// Load store data reactively so client-side navigation between /gstore/[id]
	// pages (e.g. the CartDrawer "Switch to {store}" button) reloads the content.
	// onMount only runs once, but the component instance is reused on param
	// changes — this effect re-runs whenever page.params.id changes.
	$effect(() => {
		const sid = storeId; // reactive dep: page.params.id
		let cancelled = false;

		// Reset store-scoped UI state so no stale content from the previous store lingers.
		loading = true;
		navLoading = true;
		store = null;
		menu = [];
		nav = [];
		modalItem = null;
		activeCatIndex = 0;
		expandedCat = null;
		activeSubcat = null;
		searchTerm = '';
		debouncedTerm = '';
		submittedQuery = '';
		searchFocused = false;

		(async () => {
			try {
				const storeRes = await fetchStoreById(sid);
				if (cancelled) return;
				store = storeRes.store;
				if (store) recordBrandVisit(store);
				if (store) {
					setActiveStore({ id: sid, name: store.name, logo: store.logo || store.image || '' });
				}
				const isGrocery = storeRes.store?.brandType === 'grocery';
				const menuRes = await fetchStoreMenu(sid, isGrocery);
				if (cancelled) return;
				menu = menuRes.menu || [];
				const navRes = await fetchStoreNav(sid);
				if (cancelled) return;
				nav = navRes.nav || [];
				if (Array.isArray(nav) && nav[0]?.category) expandedCat = nav[0].category;
				const itemParam = page.url.searchParams.get('item');
				if (itemParam) {
					for (const s of menu) {
						const it = (s.items || []).find((i: any) => String(i.id || slug(i.name)) === itemParam);
						if (it) {
							modalItem = it;
							break;
						}
					}
				}
			} catch (err) {
				if (!cancelled) console.error('Failed to load store:', err);
			} finally {
				if (!cancelled) {
					navLoading = false;
					loading = false;
				}
			}
		})();

		return () => {
			cancelled = true;
		};
	});

	function scrollToCategory(index: number) {
		const el = sectionRefs[index];
		if (!el) return;
		isScrolling = true;
		el.scrollIntoView({ behavior: 'smooth', block: 'start' });
		activeCatIndex = index;
		setTimeout(() => (isScrolling = false), 800);
	}
	function handleCategoryClick(item: any, index: number) {
		goto(`/gstore/${page.params.id}/category/${slugify(item.label)}`);
	}
	function scrollToTag(tag: string) {
		activeSubcat = tag;
		const el = document.getElementById('tag-' + slug(tag));
		if (el) {
			isScrolling = true;
			el.scrollIntoView({ behavior: 'smooth', block: 'start' });
			setTimeout(() => (isScrolling = false), 800);
		}
	}

	const tagged = $derived.by(() => {
		const byId: Record<string, any[]> = {};
		const ids = new Set<string>();
		for (const s of menu) {
			for (const it of s.items || []) {
				const tags = Array.isArray(it.tags) ? it.tags.filter(Boolean) : [];
				if (tags.length) {
					ids.add(it.id || slug(it.name));
					tags.forEach((t: string) => (byId[t] = byId[t] || []).push(it));
				}
			}
		}
		return { byId, ids };
	});

	const displayNav = $derived(
		nav.length ? nav : menu.map((s) => ({ category: s.category, subcategories: [] }))
	);
</script>

<svelte:head><title>{store?.name || 'Store'}</title></svelte:head>

{#if loading}
	<div class="flex min-h-[60vh] items-center justify-center">
		<div
			class="h-8 w-8 animate-spin rounded-full border-4 border-orange-500 border-t-transparent"
		></div>
	</div>
{:else if !store}
	<div class="py-16 text-center">
		<p class="text-gray-900">Store not found</p>
		<a href="/" class="mt-2 inline-block text-sm font-semibold text-orange-500">Back to home</a>
	</div>
{:else}
	<div class="min-h-screen" style="background-color:#f9f7f5">
		<FilterBar />
		<div class="mx-auto max-w-[1400px] px-3 pb-4 sm:px-6">
			<div class="relative mb-6 border-b border-gray-100 pb-6">
				<div class="flex flex-wrap items-center gap-4">
					{#if store.logo}
						<img
							src={store.logo}
							alt={store.name}
							class="h-14 w-14 flex-shrink-0 rounded-full bg-white object-cover shadow-md ring-1 ring-gray-200 sm:h-16 sm:w-16"
						/>
					{/if}
					<div class="min-w-0">
						<h1 class="text-2xl font-extrabold tracking-tight text-gray-900 sm:text-3xl">
							{store.name}
						</h1>
						<div class="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
							<span class="flex items-center gap-1">
								<svg class="h-4 w-4 text-yellow-400" fill="currentColor" viewBox="0 0 20 20"
									><path
										d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"
									/></svg
								>
								<span class="font-semibold text-gray-900">{store.rating}</span>
								<span class="text-gray-900">({store.reviewCount})</span>
							</span>
							<span class="text-gray-900">•</span>
							<span class="text-gray-900">{store.eta}</span>
							<span class="text-gray-900">•</span>
							<span class="text-gray-900">{store.deliveryFee} delivery</span>
						</div>
					</div>
					<div
						class="ml-auto w-full flex-shrink-0 sm:w-auto sm:min-w-[312px] md:min-w-[408px] ${admin.isAdmin
							? 'sm:pr-12'
							: ''}"
					>
						<div class="relative">
							<span
								class="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-black"
							>
								<svg
									class="h-4 w-4"
									fill="none"
									stroke="currentColor"
									viewBox="0 0 24 24"
									stroke-width="2"
									><path
										stroke-linecap="round"
										stroke-linejoin="round"
										d="M21 21l-4.35-4.35M17 10.5a6.5 6.5 0 11-13 0 6.5 6.5 0 0113 0z"
									/></svg
								>
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
									if (e.key === 'Enter') {
										submitSearch(searchTerm);
									} else if (e.key === 'Escape') {
										searchFocused = false;
									}
								}}
								placeholder={`Search ${store.name}...`}
								class="w-full rounded-full border border-gray-200 bg-white py-2.5 pr-9 text-sm text-gray-900 shadow-sm transition placeholder:text-black focus:border-transparent focus:ring-2 focus:ring-orange-400/50 focus:outline-none [&::-webkit-search-cancel-button]:hidden"
								style="padding-left:2.375rem"
							/>
							{#if searchTerm}
								<button
									onclick={clearSearch}
									aria-label="Clear search"
									class="absolute top-1/2 right-2.5 flex h-6 w-6 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full bg-gray-100 text-gray-900 transition hover:bg-gray-200 hover:text-gray-900"
								>
									<svg
										class="h-3.5 w-3.5"
										fill="none"
										stroke="currentColor"
										viewBox="0 0 24 24"
										stroke-width="2.5"
										><path
											stroke-linecap="round"
											stroke-linejoin="round"
											d="M6 18L18 6M6 6l12 12"
										/></svg
									>
								</button>
							{/if}

							{#if searchFocused}
								<GrocerySearchOverlay
									{store}
									{menu}
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
				{#if store.hours && store.hours.length > 0}
					<button
						onclick={() => {
							showHours = true;
							showAllHours = false;
						}}
						class="mt-3 flex items-center gap-1 text-xs font-medium text-orange-600 hover:text-orange-700"
					>
						<svg
							class="h-3.5 w-3.5"
							fill="none"
							stroke="currentColor"
							viewBox="0 0 24 24"
							stroke-width="2"
							><path
								stroke-linecap="round"
								stroke-linejoin="round"
								d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z"
							/></svg
						>
						Store Hours
					</button>
				{/if}
				{#if admin.isAdmin}
					<a
						href={`/admin/brands/${page.params.id}`}
						target="_blank"
						rel="noopener noreferrer"
						title="Edit in Admin"
						class="absolute top-16 right-0 flex h-9 w-9 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-900 shadow-md transition hover:border-coral hover:text-coral active:scale-90"
					>
						<svg
							class="h-4 w-4"
							fill="none"
							stroke="currentColor"
							viewBox="0 0 24 24"
							stroke-width="2"
							stroke-linecap="round"
							stroke-linejoin="round"
							><path
								d="M11 4H6a2 2 0 00-2 2v12a2 2 0 002 2h12a2 2 0 002-2v-5M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"
							/></svg
						>
					</a>
				{/if}
			</div>

			<CategoryRibbon {menu} activeCategoryIndex={activeCatIndex} onScrollTo={scrollToCategory} onCategoryClick={handleCategoryClick} />

			<div class="flex gap-6">
				<!-- Desktop category nav -->
				<!-- <nav
					class="sticky top-24 hidden max-h-[calc(100vh-8rem)] w-52 flex-shrink-0 self-start overflow-y-auto md:block"
				>
					<div class="space-y-1">
						<button
							onclick={() => {
								const next = !showReorder;
								showReorder = next;
								if (next) {
									activeSubcat = null;
								}
							}}
							class={`block w-full rounded-lg px-3 py-2 text-left text-sm font-bold transition ${showReorder ? 'bg-gray-900 text-white' : 'text-gray-900 hover:bg-gray-50'}`}
							>Order Again</button
						>
						<p class="mt-4 px-3 py-2 text-base font-bold tracking-wide text-gray-900 uppercase">
							Aisles
						</p>
						{#if navLoading}
							<div class="animate-pulse space-y-2 p-3">
								<div class="h-4 w-3/4 rounded bg-gray-200"></div>
								<div class="h-4 w-2/3 rounded bg-gray-200"></div>
								<div class="h-4 w-5/6 rounded bg-gray-200"></div>
								<div class="h-4 w-1/2 rounded bg-gray-200"></div>
							</div>
						{:else}
							{#each displayNav as cat}
								{@const menuIdx = menu.findIndex((s) => s.category === cat.category)}
								{@const expanded = expandedCat === cat.category}
								<div>
									<button
										onclick={() => {
											showReorder = false;
											expandedCat = expanded ? null : cat.category;
											if (menuIdx >= 0) scrollToCategory(menuIdx);
										}}
										class={`flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2 text-sm font-medium transition ${!showReorder && activeCatIndex === menuIdx ? 'bg-gray-900 text-white' : 'text-gray-900 hover:bg-gray-50'}`}
									>
										<span class="truncate">{cat.category}</span>
									</button>
									{#if expanded && cat.subcategories?.length > 0}
										<div class="mt-1 space-y-1 pl-3">
											{#each cat.subcategories as sub}
												<button
													onclick={() => scrollToTag(sub)}
													class={`w-full rounded-lg px-3 py-1.5 text-left text-sm font-medium transition ${activeSubcat === sub ? 'bg-orange-500 text-white' : 'text-gray-900 hover:bg-orange-50'}`}
													>{sub}</button
												>
											{/each}
										</div>
									{/if}
								</div>
							{/each}
						{/if}
					</div>
				</nav> -->

				<!-- Menu sections -->
				<div class="min-w-0 flex-1">
					{#if showReorder}
						<div><ReOrderView {storeId} /></div>
					{:else if submittedQuery}
						<div class="mb-4">
							<div class="mb-3 flex items-center justify-between gap-2">
								<h2 class="flex items-center gap-2 text-lg font-bold text-gray-900">
									Results for "<span class="text-orange-600">{submittedQuery}</span>"
									<span
										class="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-semibold text-gray-400"
										>{resultItems.length}</span
									>
								</h2>
								<button
									onclick={clearSearch}
									class="flex items-center gap-1 text-sm font-semibold text-orange-600 transition hover:text-orange-700"
								>
									<svg
										class="h-3.5 w-3.5"
										fill="none"
										stroke="currentColor"
										viewBox="0 0 24 24"
										stroke-width="2.5"
										><path
											stroke-linecap="round"
											stroke-linejoin="round"
											d="M6 18L18 6M6 6l12 12"
										/></svg
									>
									Clear
								</button>
							</div>

							<!-- Results filter bar (Sort + dropdown filters) -->
							<ResultsFilterBar
								items={searchItems(submittedQuery)}
								filters={resultFilters}
								sort={sortMode}
								onApply={applyFilters}
							/>

							{#if resultItems.length === 0}
								<div class="py-16 text-center">
									<svg
										class="mx-auto mb-3 h-14 w-14 text-gray-900"
										fill="none"
										stroke="currentColor"
										viewBox="0 0 24 24"
										stroke-width="1.5"
										><path
											stroke-linecap="round"
											stroke-linejoin="round"
											d="M21 21l-4.35-4.35M17 10.5a6.5 6.5 0 11-13 0 6.5 6.5 0 0113 0z"
										/></svg
									>
									<p class="font-medium text-gray-900">No items match your search</p>
									<p class="mt-1 text-sm text-gray-900">
										Try a different keyword or clear the search.
									</p>
									<button
										onclick={clearSearch}
										class="mt-4 text-sm font-semibold text-orange-600 transition hover:text-orange-700"
										>Clear search</button
									>
								</div>
							{:else}
								<div
									class="grid grid-cols-2 gap-4 sm:grid-cols-[repeat(auto-fill,minmax(160px,1fr))]"
								>
									{#each resultItems as item}
										<GroceryItemCard {item} {store} onOpen={(it) => (modalItem = it)} />
									{/each}
								</div>
							{/if}
						</div>
					{:else}
						{#if menu.length === 0}
							<div class="py-12 text-center text-gray-900">No menu available yet</div>
						{/if}

						<!-- Mobile category pills -->
						<div
							class="sticky top-16 z-20 mb-2 flex gap-1.5 overflow-x-auto border-b border-gray-100 bg-white pb-2 whitespace-nowrap md:hidden"
						>
							{#each menu as section, i}
								<button
									onclick={() => scrollToCategory(i)}
									class={`flex-shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition ${activeCatIndex === i ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-900 hover:bg-gray-200'}`}
									>{section.category}</button
								>
							{/each}
						</div>

						<!-- Tag sections -->
						{#each Object.entries(tagged.byId) as [tag, items]}
							<div class="mb-8">
								<div class="mb-3 flex items-center justify-between gap-2">
									<h2
										id={`tag-${slug(tag)}`}
										class="flex scroll-mt-24 items-center gap-2 text-lg font-bold text-gray-900"
									>
										{tag}<span
											class="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-semibold text-gray-900"
											>{items.length}</span
										>
									</h2>
									<div class="hidden items-center gap-1.5 sm:flex">
										<button
											onclick={() => scrollTagRow(tag, 'left')}
											class="flex h-8 w-8 items-center justify-center rounded-full border border-gray-200 text-gray-900 transition hover:border-gray-300 hover:bg-gray-50 active:scale-90"
											aria-label="Scroll left"
										>
											<svg
												class="h-4 w-4"
												fill="none"
												stroke="currentColor"
												viewBox="0 0 24 24"
												stroke-width="2"
												><path
													stroke-linecap="round"
													stroke-linejoin="round"
													d="M15 19l-7-7 7-7"
												/></svg
											>
										</button>
										<button
											onclick={() => scrollTagRow(tag, 'right')}
											class="flex h-8 w-8 items-center justify-center rounded-full border border-gray-200 text-gray-900 transition hover:border-gray-300 hover:bg-gray-50 active:scale-90"
											aria-label="Scroll right"
										>
											<svg
												class="h-4 w-4"
												fill="none"
												stroke="currentColor"
												viewBox="0 0 24 24"
												stroke-width="2"
												><path
													stroke-linecap="round"
													stroke-linejoin="round"
													d="M9 5l7 7-7 7"
												/></svg
											>
										</button>
									</div>
								</div>
								<div
									bind:this={tagScrolls[tag]}
									class="flex [scrollbar-width:none] gap-3 overflow-x-auto pb-2 [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
								>
									{#each items as item}
										<GroceryItemCard
											{item}
											{store}
											onOpen={(it) => (modalItem = it)}
											widthClass="w-40 sm:w-44 flex-shrink-0"
										/>
									{/each}
								</div>
							</div>
						{/each}

						<!-- Category sections -->
						{#each menu as section, i}
							{@const catItems = (section.items || []).filter(
								(it: any) => !tagged.ids.has(it.id || slug(it.name))
							)}
							<div use:catSection={i} data-cat-index={i} id={`cat-${i}`} class="mb-8 scroll-mt-24">
								<div
									class="sticky top-16 z-10 mb-4 flex items-center justify-between gap-2 border-b border-gray-100 bg-white/95 py-3 backdrop-blur md:top-16"
								>
									<h2 class="text-lg font-bold tracking-tight text-gray-900">
										{section.category}
									</h2>
									{#if catItems.length > 0}
										<div class="hidden items-center gap-1.5 sm:flex">
											<button
												onclick={() => scrollCatRow(i, 'left')}
												class="flex h-8 w-8 items-center justify-center rounded-full border border-gray-200 text-gray-900 transition hover:border-gray-300 hover:bg-gray-50 active:scale-90"
												aria-label="Scroll left"
											>
												<svg
													class="h-4 w-4"
													fill="none"
													stroke="currentColor"
													viewBox="0 0 24 24"
													stroke-width="2"
													><path
														stroke-linecap="round"
														stroke-linejoin="round"
														d="M15 19l-7-7 7-7"
													/></svg
												>
											</button>
											<button
												onclick={() => scrollCatRow(i, 'right')}
												class="flex h-8 w-8 items-center justify-center rounded-full border border-gray-200 text-gray-900 transition hover:border-gray-300 hover:bg-gray-50 active:scale-90"
												aria-label="Scroll right"
											>
												<svg
													class="h-4 w-4"
													fill="none"
													stroke="currentColor"
													viewBox="0 0 24 24"
													stroke-width="2"
													><path
														stroke-linecap="round"
														stroke-linejoin="round"
														d="M9 5l7 7-7 7"
													/></svg
												>
											</button>
										</div>
									{/if}
								</div>
								{#if catItems.length === 0}
									<p class="py-4 text-sm text-gray-900">No items in this section</p>
								{:else}
									<div
										bind:this={catScrolls[i]}
										class="flex [scrollbar-width:none] gap-3 overflow-x-auto pb-2 [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
									>
										{#each catItems as item}
											<GroceryItemCard
												{item}
												{store}
												onOpen={(it) => (modalItem = it)}
												widthClass="w-40 sm:w-44 flex-shrink-0"
											/>
										{/each}
									</div>
								{/if}
							</div>
						{/each}

						<div class="h-16" />
					{/if}
				</div>
			</div>
		</div>
	</div>

	<!-- Hours modal -->
	{#if showHours}
		{@const todayName = new Date().toLocaleDateString('en-US', { weekday: 'long' })}
		<div
			class="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
			onclick={() => (showHours = false)}
		>
			<div
				class="mx-auto mt-2.5 flex max-h-[85vh] w-full flex-col overflow-hidden rounded-2xl bg-white shadow-2xl sm:mt-[10vh] sm:max-w-md"
				onclick={(e) => e.stopPropagation()}
			>
				<div class="relative h-44 flex-shrink-0 overflow-hidden bg-gray-200 sm:h-52">
					<iframe
						title="Store location"
						src={`https://www.google.com/maps?q=${encodeURIComponent(store.address || store.name)}&output=embed`}
						class="h-full w-full border-0"
						loading="lazy"
						allowfullscreen
						referrerpolicy="no-referrer-when-downgrade"
					></iframe>
					<div
						class="absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-white to-transparent"
					></div>
					<button
						onclick={() => (showHours = false)}
						class="absolute top-3 right-3 flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-gray-900 shadow-lg transition hover:bg-white active:scale-90"
						>&times;</button
					>
					<div class="absolute top-3 left-3 rounded-lg bg-white/90 px-3 py-1.5 shadow-sm">
						<p class="text-sm font-semibold text-gray-900">{store.name}</p>
					</div>
				</div>

				<hr class="border-t border-gray-200" />

				<div class="flex-1 overflow-y-auto px-5 py-3">
					<div class="mb-3 flex items-center gap-2">
						<svg
							class="h-4 w-4 text-gray-900"
							fill="none"
							stroke="currentColor"
							viewBox="0 0 24 24"
							stroke-width="2"
							><path
								stroke-linecap="round"
								stroke-linejoin="round"
								d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z"
							/></svg
						>
						<span class="text-sm font-semibold text-gray-900">Store Hours</span>
					</div>
					<div class="space-y-1">
						{#each store.hours.filter((h: any) => showAllHours || h.day === todayName) as h, i}
							{@const isToday = h.day === todayName}
							<div
								class={`flex items-center justify-between rounded-xl px-3 py-2.5 text-sm ${isToday ? '-mx-1 border border-orange-200 bg-orange-50 px-4' : ''}`}
							>
								<div class="flex items-center gap-2">
									<span
										class={`w-24 font-semibold ${isToday ? 'text-orange-700' : 'text-gray-900'}`}
										>{h.day}</span
									>
									{#if isToday}<span
											class="rounded-full bg-orange-500 px-2 py-0.5 text-[10px] font-bold text-white"
											>Today</span
										>{/if}
								</div>
								{#if h.isClosed}
									<span
										class="rounded-full bg-red-50 px-2.5 py-0.5 text-xs font-medium text-red-600"
										>Closed</span
									>
								{:else}
									<span class={`font-medium ${isToday ? 'text-orange-700' : 'text-gray-900'}`}
										>{to12h(h.open)} – {to12h(h.close)}</span
									>
								{/if}
							</div>
						{/each}
						{#if store.hours.length > 1}
							<button
								onclick={() => (showAllHours = !showAllHours)}
								class="mt-1 w-full py-2 text-center text-xs font-medium text-orange-600 transition hover:text-orange-700"
							>
								{showAllHours ? '▲ Show less' : `▼ Show full week (${store.hours.length} days)`}
							</button>
						{/if}
					</div>
					{#if store.address}<p class="mt-4 text-center text-xs text-gray-900">
							{store.address}
						</p>{/if}
				</div>
			</div>
		</div>
	{/if}
{/if}

{#if modalItem}
	<GroceryItemModal
		item={modalItem}
		{store}
		recommended={recommendedItems}
		onOpenItem={(it) => (modalItem = it)}
		onClose={() => (modalItem = null)}
	/>
{/if}
