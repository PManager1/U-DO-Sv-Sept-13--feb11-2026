<script lang="ts">
	import { onMount } from 'svelte';
	import API_BASE from '$lib/api';
	import TagAutocomplete from '$lib/TagAutocomplete.svelte';
	import TaggingTab from '$lib/TaggingTab.svelte';

	const SIDEBAR_TABS = [
		{ key: 'home', label: 'Home', icon: '🏠' },
		{ key: 'tab2', label: 'GoogleFetcher', icon: '🔍' },
		{ key: 'tab3', label: 'GeoFencing', icon: '📍' },
		{ key: 'tab4', label: 'Tagging', icon: '🏷️' },
		{ key: 'tab5', label: 'Interesting Data', icon: '📊' },
		{ key: 'tab6', label: 'Add Bulk Brand Locations', icon: '🗺️' },
		{ key: 'tab8', label: 'Search Brands by Tag', icon: '🏢' },
		{ key: 'tab9', label: 'New App Downloads', icon: '📥' },
		{ key: 'tab10', label: 'Zone Interests', icon: '📋' },
		{ key: 'tab7', label: 'To Do', icon: '✅' },
		{ key: 'tab11', label: 'Delete A Tag', icon: '🗑️' },
		{ key: 'tab12', label: 'Unlisted Stores', icon: '📝' },
		{ key: 'tab13', label: 'BrandsWithMenu', icon: '✅' }
	];

	let activeSidebarTab = $state('home');
	let isPersonalized = $state(false);
	let brands = $state<any[]>([]);
	let loading = $state(true);
	let searchQuery = $state('');
	let activeTypes = $state(new Set<string>());
	let toggling = $state(new Set<string>());
	let status = $state<{ type: string; text: string } | null>(null);

	// tags (inlined useBrandTags)
	let tagOptions = $state<string[]>([]);
	let tagCounts = $state<Record<string, number>>({});
	let loadingTags = $state(true);

	let restaurantTags = $state('');
	let section1Orders = $state('');
	let locationStats = $state<any>(null);
	let loadingStats = $state(false);
	let brandStats = $state<any>(null);
	let globalBrandStats = $state<any>(null);
	let polygonStats = $state<any>(null);
	let loadingPolygonStats = $state(false);
	let polygonsList = $state<any[]>([]);
	let selectedPolygonIds = $state(new Set<string>());

	// GoogleFetcher state
	let searchTerm = $state('Restaurants');
	const GOOGLE_URL_TEMPLATE =
		'https://maps.googleapis.com/maps/api/place/textsearch/json?query={{TERM}}&key=AIzaSyDTm4xeMjg5_GFa2YYUE6zsk2-vagqlAno';
	let gmapsUrl = $state(GOOGLE_URL_TEMPLATE.replace('{{TERM}}', encodeURIComponent('Restaurants')));
	let fetchResults = $state<any>(null);
	let fetchLoading = $state(false);
	let fetchError = $state<string | null>(null);
	let selectedIds = $state(new Set<string>());
	let filterQuery = $state('');
	let addingRestaurants = $state(false);
	let addRestaurantStatus = $state<{ type: string; text: string } | null>(null);
	let showRaw = $state(false);

	// Search Brands by Tag state
	let tagSearchQuery = $state('');
	let searchResults = $state<any[]>([]);
	let searchLoading = $state(false);
	let searchError = $state<string | null>(null);
	let showTagSuggestions = $state(false);
	let filteredTags = $state<string[]>([]);
	let tagHighlightIdx = $state(-1);
	let tagInput: HTMLInputElement;
	let tagBlurTimer: ReturnType<typeof setTimeout> | null = null;

	let deletingTag = $state<string | null>(null);
	let brandsWithMenu = $state<any[]>([]);
	let loadingBrandsWithMenu = $state(false);

	// To Do / Unlisted stores
	let todoText = $state('');
	let todoLoaded = $state(false);
	let todoTimer: ReturnType<typeof setTimeout> | null = null;
	let unlistedStoresText = $state('');
	let unlistedStoresLoaded = $state(false);
	let savingUnlistedStores = $state(false);
	let unlistedStoresSaved = $state(false);
	let unlistedStoresTimer: ReturnType<typeof setTimeout> | null = null;

	const selectedPolygonKey = $derived([...selectedPolygonIds].sort().join(','));

	// Section 1 calc (Interesting Data)
	const totalManualLocations = $derived(brands.reduce((sum: number, b: any) => sum + (b.manualLocationCount || 0), 0));
	const section1OrdersNum = $derived(parseInt(section1Orders, 10));
	const section1Result = $derived(isNaN(section1OrdersNum) ? null : totalManualLocations * section1OrdersNum);

	// ── tags fetch ──
	function refreshTags() {
		loadingTags = true;
		fetch(API_BASE + 'admin/brand-tags')
			.then((r) => r.json())
			.then((data: any) => {
				if (Array.isArray(data)) {
					tagOptions = [...new Set(data as string[])];
				} else if (Array.isArray(data.values)) {
					tagOptions = [...new Set((data.values as string[]).map(String))];
					if (data.counts) tagCounts = data.counts;
				} else if (Array.isArray(data.tags)) {
					tagOptions = [...new Set((data.tags as string[]).map(String))];
				} else {
					tagOptions = [];
				}
			})
			.catch(() => (tagOptions = []))
			.finally(() => (loadingTags = false));
	}

	// ── Personalize: restore saved sidebar tab ──
	$effect(() => {
		if (isPersonalized) return;
		fetch(API_BASE + 'admin/personalize')
			.then((r) => r.json())
			.then((data: any) => {
				const tab = data.adminActivateBrands?.activeSidebarTab;
				if (tab) activeSidebarTab = tab;
				isPersonalized = true;
			})
			.catch(() => (isPersonalized = true));
	});

	// ── Personalize: save sidebar tab on change ──
	$effect(() => {
		if (!isPersonalized) return;
		fetch(API_BASE + 'admin/personalize', {
			method: 'PUT',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ adminActivateBrands: { activeSidebarTab } })
		}).catch(() => {});
	});

	function selectTab(tab: string) {
		activeSidebarTab = tab;
	}

	async function toggleActive(brand: any) {
		const brandId = brand.id || brand._id;
		const newActive = !brand.isActive;
		toggling = new Set(toggling).add(brandId);
		status = null;
		try {
			const res = await fetch(API_BASE + 'admin/brands/' + brandId, {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ isActive: newActive })
			});
			if (res.ok) {
				brands = brands.map((b) =>
					(b.id || b._id) === brandId ? { ...b, isActive: newActive } : b
				);
				status = { type: 'success', text: `✅ ${brand.name} is now ${newActive ? 'Active' : 'Inactive'}` };
			} else {
				const data = await res.json();
				status = { type: 'error', text: `⚠️ ${data.message || 'Failed to update'}` };
			}
		} catch (err) {
			status = { type: 'error', text: `❌ Network error: ${(err as Error).message}` };
		} finally {
			const next = new Set(toggling);
			next.delete(brandId);
			toggling = next;
		}
	}

	function fetchBrands() {
		const params = new URLSearchParams();
		params.set('limit', '100');
		fetch(API_BASE + 'admin/brands?' + params.toString())
			.then((r) => r.json())
			.then((data: any) => setBrands(Array.isArray(data) ? data : data?.brands || []))
			.catch(() => (brands = []))
			.finally(() => (loading = false));
	}
	function setBrands(list: any[]) {
		brands = list;
	}

	function fetchPolygonStats() {
		if (!polygonStats) loadingPolygonStats = true;
		const params = new URLSearchParams();
		if (selectedPolygonIds.size > 0) params.set('polygonIds', [...selectedPolygonIds].join(','));
		const qs = params.toString();
		const url = API_BASE + 'admin/locations/inside-all-active-polygons' + (qs ? '?' + qs : '');
		fetch(url)
			.then((r) => r.json())
			.then((data) => (polygonStats = data))
			.catch(() => (polygonStats = null))
			.finally(() => (loadingPolygonStats = false));
	}

	// Fetch location stats when Interesting Data tab is opened
	$effect(() => {
		if (activeSidebarTab !== 'tab5' || locationStats) return;
		loadingStats = true;
		fetch(API_BASE + 'admin/locations/stats')
			.then((r) => r.json())
			.then((data) => (locationStats = data))
			.catch(() => (locationStats = null))
			.finally(() => (loadingStats = false));
	});

	// Fetch global brand stats once on tab mount
	$effect(() => {
		if (activeSidebarTab !== 'tab5' || globalBrandStats) return;
		fetch(API_BASE + 'admin/brands/stats')
			.then((r) => r.json())
			.then((data) => (globalBrandStats = data));
	});

	// Fetch brand stats filtered by selected polygons
	$effect(() => {
		if (activeSidebarTab !== 'tab5') return;
		if (selectedPolygonIds.size === 0) {
			brandStats = null;
			return;
		}
		const params = new URLSearchParams();
		params.set('polygonIds', [...selectedPolygonIds].join(','));
		fetch(API_BASE + 'admin/brands/stats?' + params.toString())
			.then((r) => r.json())
			.then((data) => (brandStats = data))
			.catch(() => (brandStats = null));
	});

	// Fetch polygon list when Interesting Data tab is opened
	$effect(() => {
		if (activeSidebarTab !== 'tab5') return;
		fetch(API_BASE + 'admin/polygons')
			.then((r) => r.json())
			.then((data) => (polygonsList = Array.isArray(data) ? data : []))
			.catch(() => (polygonsList = []));
	});

	// Fetch polygon stats when Interesting Data tab is opened or selection changes
	$effect(() => {
		if (activeSidebarTab !== 'tab5') return;
		fetchPolygonStats();
	});

	// Fetch brands with menu when tab13 opened
	$effect(() => {
		if (activeSidebarTab !== 'tab13') return;
		if (brandsWithMenu.length > 0) return;
		loadingBrandsWithMenu = true;
		fetch(API_BASE + 'admin/brands/with-menu')
			.then((r) => r.json())
			.then((data: any) => (brandsWithMenu = Array.isArray(data) ? data : data?.brands || []))
			.catch(() => (brandsWithMenu = []))
			.finally(() => (loadingBrandsWithMenu = false));
	});

	onMount(() => {
		fetchBrands();
		refreshTags();

		// Fetch saved text on mount
		if (!todoLoaded) {
			fetch(API_BASE + 'admin/personalize')
				.then((r) => r.json())
				.then((d: any) => {
					if (d.todoText) todoText = d.todoText;
					if (d.unlistedStoresText) unlistedStoresText = d.unlistedStoresText;
					todoLoaded = true;
					unlistedStoresLoaded = true;
				})
				.catch(() => {
					todoLoaded = true;
					unlistedStoresLoaded = true;
				});
		}
		return () => {
			if (todoTimer) clearTimeout(todoTimer);
			if (unlistedStoresTimer) clearTimeout(unlistedStoresTimer);
			if (tagBlurTimer) clearTimeout(tagBlurTimer);
		};
	});

	// Debounced auto-save todo text
	$effect(() => {
		if (!todoLoaded) return;
		if (todoTimer) clearTimeout(todoTimer);
		todoTimer = setTimeout(() => {
			fetch(API_BASE + 'admin/personalize', {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ todoText })
			}).catch(() => {});
		}, 500);
		return () => { if (todoTimer) clearTimeout(todoTimer); };
	});

	// Debounced auto-save unlisted stores text
	$effect(() => {
		if (!unlistedStoresLoaded) return;
		if (unlistedStoresTimer) clearTimeout(unlistedStoresTimer);
		unlistedStoresTimer = setTimeout(() => {
			fetch(API_BASE + 'admin/personalize', {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ unlistedStoresText })
			}).catch(() => {});
		}, 500);
		return () => { if (unlistedStoresTimer) clearTimeout(unlistedStoresTimer); };
	});

	async function saveUnlistedStores() {
		savingUnlistedStores = true;
		unlistedStoresSaved = false;
		try {
			const res = await fetch(API_BASE + 'admin/personalize', {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ unlistedStoresText })
			});
			if (res.ok) {
				unlistedStoresSaved = true;
				setTimeout(() => (unlistedStoresSaved = false), 2000);
			}
		} catch (err) {
			console.error('Failed to save unlisted stores text:', err);
		}
		savingUnlistedStores = false;
	}

	const brandTypes = [
		{ key: 'restaurant', label: '🍕 Restaurant', activeColor: 'bg-orange-600 text-white border-orange-600' },
		{ key: 'grocery', label: '🛒 Grocery', activeColor: 'bg-green-600 text-white border-green-600' },
		{ key: 'convenience', label: '🏪 Convenience', activeColor: 'bg-blue-600 text-white border-blue-600' },
		{ key: 'pharmacy', label: '💊 Pharmacy', activeColor: 'bg-purple-600 text-white border-purple-600' },
		{ key: 'localBusiness', label: '🏢 Local Business', activeColor: 'bg-teal-600 text-white border-teal-600' },
		{ key: 'retail', label: '🏬 Retail', activeColor: 'bg-yellow-600 text-white border-yellow-600' }
	];

	const typeCounts = $derived.by(() => {
		const counts: Record<string, number> = {};
		brands.forEach((b) => {
			counts[b.brandType] = (counts[b.brandType] || 0) + 1;
		});
		return counts;
	});

	function toggleType(type: string) {
		const next = new Set(activeTypes);
		if (next.has(type)) next.delete(type);
		else next.add(type);
		activeTypes = next;
	}

	const filtered = $derived(
		brands.filter((b) => {
			if (activeTypes.size > 0 && !activeTypes.has(b.brandType)) return false;
			if (!searchQuery) return true;
			const q = searchQuery.toLowerCase();
			return b.name?.toLowerCase().includes(q) || b.brandType?.toLowerCase().includes(q);
		})
	);

	function typeBadge(type: string) {
		const colors: Record<string, string> = {
			restaurant: 'bg-orange-100 text-orange-700',
			grocery: 'bg-green-100 text-green-700',
			convenience: 'bg-blue-100 text-blue-700',
			pharmacy: 'bg-purple-100 text-purple-700',
			localBusiness: 'bg-teal-100 text-teal-700',
			retail: 'bg-yellow-100 text-yellow-700'
		};
		return colors[type] || 'bg-gray-100 text-gray-700';
	}

	// ── GoogleFetcher helpers ──
	const places = $derived(fetchResults?.results || []);
	const q = $derived(filterQuery.toLowerCase().trim());
	const filteredPlaces = $derived(
		q ? places.filter((p: any) => p.name?.toLowerCase().includes(q) || p.formatted_address?.toLowerCase().includes(q)) : places
	);

	function toggleSelected(placeId: string) {
		const next = new Set(selectedIds);
		if (next.has(placeId)) next.delete(placeId);
		else next.add(placeId);
		selectedIds = next;
	}

	async function fetchLocations() {
		fetchLoading = true;
		fetchError = null;
		fetchResults = null;
		selectedIds = new Set();
		showRaw = false;

		const queryMatch = gmapsUrl.match(/[?&]query=([^&]+)/);
		const query = queryMatch ? decodeURIComponent(queryMatch[1].replace(/\+/g, ' ')) : '';
		if (!query) {
			fetchError = 'Could not find query parameter in the URL.';
			fetchLoading = false;
			return;
		}

		try {
			const res = await fetch(API_BASE + 'brands/fetch-Locations', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ query })
			});
			const data = await res.json();
			if (res.ok) {
				fetchResults = data;
			} else {
				fetchError = data.message || data.error || `HTTP ${res.status}: Request failed`;
			}
		} catch (err) {
			fetchError = (err as Error).message || 'Network error';
		} finally {
			fetchLoading = false;
		}
	}

	async function addRestaurant() {
		addingRestaurants = true;
		addRestaurantStatus = null;
		const selected = places.filter((p: any) => selectedIds.has(p.place_id));
		const parsedTags = restaurantTags.split(',').map((s) => s.trim().toLowerCase().replace(/\s+/g, '_')).filter(Boolean);
		let success = 0;
		let failed = 0;
		for (const place of selected) {
			try {
				const body: any = { name: place.name.split('|')[0].trim(), brandType: 'localBusiness' };
				if (parsedTags.length > 0) body.tags = parsedTags;
				const res = await fetch(API_BASE + 'admin/brands', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify(body)
				});
				if (res.ok) success++;
				else failed++;
			} catch {
				failed++;
			}
		}
		const allOk = failed === 0;
		addRestaurantStatus = {
			type: allOk ? 'success' : 'warning',
			text: allOk
				? `✅ Created ${success} brand${success > 1 ? 's' : ''} successfully`
				: `⚠️ Created ${success}, ${failed} failed`
		};
		if (allOk) {
			selectedIds = new Set();
			if (parsedTags.length > 0) {
				fetch(API_BASE + 'admin/brand-tags', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ tags: parsedTags })
				}).catch(() => {});
			}
		}
		addingRestaurants = false;
	}

	// ── Search Brands by Tag ──
	async function searchBrandsByTag(query?: string) {
		const qq = (query ?? tagSearchQuery).trim();
		if (!qq || qq.length < 2) return;
		searchLoading = true;
		searchError = null;
		showTagSuggestions = false;
		try {
			const res = await fetch(API_BASE + 'brands/search-by-tag?q=' + encodeURIComponent(qq));
			const data = await res.json();
			searchResults = data.brands || [];
		} catch (err) {
			searchError = (err as Error).message;
			searchResults = [];
		} finally {
			searchLoading = false;
		}
	}

	function handleTagSearchInputChange(val: string) {
		tagSearchQuery = val;
		if (!val.trim()) {
			filteredTags = [];
			showTagSuggestions = false;
			searchResults = [];
			return;
		}
		const ql = val.toLowerCase();
		const filtered = [...new Set(tagOptions)].filter((t) => t.toLowerCase().includes(ql));
		filteredTags = filtered;
		showTagSuggestions = filtered.length > 0;
		tagHighlightIdx = -1;
	}

	function selectTagSuggestion(tag: string) {
		tagSearchQuery = tag;
		showTagSuggestions = false;
		filteredTags = [];
		tagInput?.focus();
		searchBrandsByTag(tag);
	}

	function handleTagSearchKeyDown(e: KeyboardEvent) {
		if (e.key === 'Enter') {
			e.preventDefault();
			if (showTagSuggestions && filteredTags[tagHighlightIdx]) {
				selectTagSuggestion(filteredTags[tagHighlightIdx]);
			} else {
				showTagSuggestions = false;
				searchBrandsByTag();
			}
		} else if (e.key === 'Escape') {
			showTagSuggestions = false;
		} else if (e.key === 'ArrowDown') {
			e.preventDefault();
			tagHighlightIdx = Math.min(tagHighlightIdx + 1, filteredTags.length - 1);
		} else if (e.key === 'ArrowUp') {
			e.preventDefault();
			tagHighlightIdx = Math.max(tagHighlightIdx - 1, -1);
		}
	}

	async function deleteTag(tag: string) {
		if (!window.confirm(`Delete tag "${tag}"?\n\nThis removes it from the global tag list. Brands already tagged are not affected.`)) return;
		deletingTag = tag;
		try {
			const res = await fetch(API_BASE + 'admin/brand-tags/' + encodeURIComponent(tag), { method: 'DELETE' });
			if (!res.ok) throw new Error('Failed to delete');
			refreshTags();
		} catch (err) {
			console.error('Failed to delete tag:', err);
			window.alert('Failed to delete tag: ' + (err as Error).message);
		}
		deletingTag = null;
	}

	function syntaxHighlight(json: string) {
		return json.replace(
			/("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g,
			(match: string) => {
				let cls = 'text-amber-600';
				if (/^"/.test(match)) {
					cls = /:$/.test(match) ? 'text-sky-700' : 'text-green-600';
				} else if (/true|false/.test(match)) {
					cls = 'text-purple-600';
				} else if (/null/.test(match)) {
					cls = 'text-gray-400';
				}
				return `<span class="${cls}">${match}</span>`;
			}
		);
	}
</script>

<div class="min-h-screen bg-gray-50">
	<header class="bg-white border-b border-gray-200">
		<div class="max-w-6xl mx-auto px-6 py-5">
			<a href="/admin/brands" class="text-orange-500 hover:text-orange-600 hover:underline text-sm">← Back to Brands</a>
			<div class="mt-3">
				<h1 class="text-2xl font-bold text-gray-900">Activate Brands</h1>
				<p class="text-sm text-gray-500">All brands displayed as cards</p>
			</div>
		</div>
	</header>

	<main class="max-w-6xl mx-auto px-6 py-6">
		<div class="flex gap-6">
			<!-- Left Sidebar -->
			<div class="w-48 flex-shrink-0">
				<div class="bg-white rounded-xl border border-gray-200 overflow-hidden">
					{#each SIDEBAR_TABS as tab}
						{#if tab.key === 'tab6'}
							<a href="/admin/bulkaction" class="w-full flex items-center gap-3 px-4 py-3 text-sm font-medium transition border-b border-gray-100 last:border-b-0 text-gray-600 hover:bg-gray-50 border-l-4 border-l-transparent">
								<span class="text-base">{tab.icon}</span>{tab.label}
							</a>
						{:else if tab.key === 'tab9'}
							<a href="/admin/downloads" class="w-full flex items-center gap-3 px-4 py-3 text-sm font-medium transition border-b border-gray-100 last:border-b-0 text-gray-600 hover:bg-gray-50 border-l-4 border-l-transparent">
								<span class="text-base">{tab.icon}</span>{tab.label}
							</a>
						{:else if tab.key === 'tab10'}
							<a href="/admin/zone-interests" class="w-full flex items-center gap-3 px-4 py-3 text-sm font-medium transition border-b border-gray-100 last:border-b-0 text-gray-600 hover:bg-gray-50 border-l-4 border-l-transparent">
								<span class="text-base">{tab.icon}</span>{tab.label}
							</a>
						{:else}
							<button
								onclick={() => selectTab(tab.key)}
								class={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium transition border-b border-gray-100 last:border-b-0 ${activeSidebarTab === tab.key ? 'bg-violet-50 text-violet-700 border-l-4 border-l-violet-600' : 'text-gray-600 hover:bg-gray-50 border-l-4 border-l-transparent'}`}
							>
								<span class="text-base">{tab.icon}</span>{tab.label}
							</button>
						{/if}
					{/each}
				</div>
			</div>

			<!-- Right Content -->
			<div class="flex-1 min-w-0">
				{#if activeSidebarTab === 'home'}
					<div class="flex flex-wrap items-center gap-2 mb-4">
						<div class="flex flex-wrap gap-2">
							{#each brandTypes as bt}
								{@const isActive = activeTypes.has(bt.key)}
								<button
									onclick={() => toggleType(bt.key)}
									class={`px-4 py-2 rounded-lg text-sm font-medium border-2 transition-all ${isActive ? bt.activeColor + ' shadow-sm' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300 hover:bg-gray-50'}`}
								>
									{bt.label} {typeCounts[bt.key] !== undefined ? `(${typeCounts[bt.key]})` : ''}
								</button>
							{/each}
							{#if activeTypes.size > 0}
								<button onclick={() => (activeTypes = new Set())} class="px-3 py-2 rounded-lg text-xs font-medium text-gray-400 hover:text-gray-600 hover:bg-gray-200 transition">✕ Clear</button>
							{/if}
						</div>
						<div class="flex items-center gap-2 ml-auto">
							<button
								onclick={() => { filtered.forEach((b) => { if (!b.isActive) toggleActive(b); }); }}
								class="px-3 py-2 rounded-lg text-xs font-medium text-violet-600 hover:text-violet-800 hover:bg-violet-50 transition"
							>✓ Select All</button>
							<button
								onclick={() => { filtered.forEach((b) => { if (b.isActive) toggleActive(b); }); }}
								class="px-3 py-2 rounded-lg text-xs font-medium text-gray-500 hover:text-gray-700 hover:bg-gray-200 transition"
							>✗ None</button>
						</div>
					</div>

					<div class="mb-4">
						<input type="text" placeholder="Search brands..." value={searchQuery} oninput={(e) => (searchQuery = (e.currentTarget as HTMLInputElement).value)} class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400" />
					</div>

					<div class="mb-4 min-h-[52px]">
						{#if status}
							<div class={`p-3 rounded-lg text-sm ${status.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
								<div class="flex items-center justify-between">
									<span>{status.text}</span>
									<button onclick={() => (status = null)} class="text-current opacity-50 hover:opacity-100 ml-2">✕</button>
								</div>
							</div>
						{/if}
					</div>

					{#if loading}
						<div class="text-center py-12 text-gray-400">Loading brands...</div>
					{:else if filtered.length === 0}
						<div class="text-center py-12 text-gray-400">No brands found.</div>
					{:else}
						<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
							{#each filtered as brand}
								<div class="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-lg transition-shadow relative">
									<input
										type="checkbox"
										checked={brand.isActive}
										onchange={() => toggleActive(brand)}
										disabled={toggling.has(brand.id || brand._id)}
										class="absolute top-3 right-3 w-5 h-5 rounded border-gray-300 text-violet-600 focus:ring-violet-500 cursor-pointer disabled:opacity-50 disabled:cursor-wait"
									/>
									<div class="flex flex-col items-center text-center">
										<div class="w-20 h-20 rounded-xl overflow-hidden border border-gray-100 mb-3 flex-shrink-0 bg-violet-100 flex items-center justify-center">
											{#if brand.logoUrl}
												<img src={brand.logoUrl} alt={brand.name} class="w-full h-full object-cover" />
											{:else}
												<span class="text-2xl font-bold text-violet-600">{brand.name?.charAt(0)}</span>
											{/if}
										</div>
										<h3 class="font-semibold text-gray-900 text-lg">{brand.name}</h3>
										<div class="flex items-center gap-2 mt-1">
											<span class={`text-xs px-2 py-0.5 rounded-full font-medium ${typeBadge(brand.brandType)}`}>{brand.brandType}</span>
											{#if brand.isActive}
												<span class="text-xs px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600">Active</span>
											{:else}
												<span class="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">Inactive</span>
											{/if}
										</div>
										<p class="text-xs text-gray-500 mt-2">{brand.countries?.join(', ') || 'No countries set'}</p>
										<a href={`/admin/brands/${brand.id || brand._id}`} class="mt-3 text-xs bg-violet-50 text-violet-700 px-4 py-1.5 rounded-lg hover:bg-violet-100 font-medium">View Details →</a>
									</div>
								</div>
							{/each}
						</div>
					{/if}
				{/if}

				{#if activeSidebarTab === 'tab2'}
					<div class="space-y-6">
						<div class="bg-white rounded-xl border border-gray-200 p-5">
							<div class="flex items-center justify-between mb-3">
								<h3 class="font-semibold text-gray-900">🔧 Google Places Fetcher</h3>
							</div>
							<div>
								<label class="text-xs font-semibold text-gray-600 mb-1 block">Search Term</label>
								<input type="text" value={searchTerm} oninput={(e) => (searchTerm = (e.currentTarget as HTMLInputElement).value)} class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 mb-3" placeholder="e.g. Restaurants, Pizza, Coffee shops..." />
								<label class="text-xs font-semibold text-gray-600 mb-1 block">Google Places Text Search URL</label>
								<textarea value={gmapsUrl} oninput={(e) => (gmapsUrl = (e.currentTarget as HTMLTextAreaElement).value)} rows={3} class="w-full border border-gray-300 rounded-lg px-3 py-2 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-orange-400 resize-none"></textarea>
								<p class="text-xs text-gray-400 mt-1">Edit the query parameters as needed.</p>
							</div>
							<div class="flex justify-end mt-3">
								<button onclick={fetchLocations} disabled={fetchLoading} class="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold px-4 py-2 rounded-lg transition flex items-center gap-2">
									{#if fetchLoading}
										<svg class="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path></svg>
									{/if}
									{fetchLoading ? 'Fetching...' : 'Fetch Locations'}
								</button>
							</div>
						</div>

						{#if fetchLoading}
							<div class="bg-white rounded-xl border border-gray-200 p-5 text-center text-sm text-gray-500">
								<div class="flex items-center justify-center gap-2">
									<svg class="animate-spin w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path></svg>
									Fetching locations from Google Places...
								</div>
							</div>
						{/if}

						{#if fetchError}
							<div class="bg-red-50 border border-red-200 rounded-xl p-4">
								<div class="text-xs font-bold text-red-600 mb-1">Request Failed</div>
								<div class="text-xs text-red-500">{fetchError}</div>
							</div>
						{/if}

						{#if places.length > 0}
							<div class="bg-white rounded-xl border border-gray-200 overflow-hidden">
								<div class="flex items-center justify-between px-4 py-3 bg-gray-50 border-b border-gray-200">
									<div>
										<span class="text-sm font-semibold text-gray-700">Results</span>
										<span class="ml-2 text-xs text-gray-400">{filteredPlaces.length}/{places.length} found</span>
									</div>
									<div class="flex items-center gap-2">
										<button onclick={() => (selectedIds = new Set(places.map((p: any) => p.place_id)))} class="text-xs text-blue-600 hover:text-blue-700 font-medium">Select All</button>
										<button onclick={() => (selectedIds = new Set())} class="text-xs text-gray-500 hover:text-gray-700 font-medium">Clear</button>
									</div>
								</div>
								<div class="px-4 py-2 border-b border-gray-100">
									<input type="text" value={filterQuery} oninput={(e) => (filterQuery = (e.currentTarget as HTMLInputElement).value)} placeholder="Filter results..." class="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-violet-400" />
								</div>
								<div class="divide-y divide-gray-100 max-h-72 overflow-y-auto">
									{#each filteredPlaces as place, idx}
										<label class={`flex items-start gap-3 px-4 py-3 cursor-pointer hover:bg-gray-50 transition ${selectedIds.has(place.place_id) ? 'bg-blue-50' : ''}`}>
											<input type="checkbox" checked={selectedIds.has(place.place_id)} onchange={() => toggleSelected(place.place_id)} class="mt-0.5 rounded" />
											<div class="flex-1 min-w-0">
												<div class="text-sm font-medium text-gray-900 truncate">{place.name}</div>
												<div class="text-xs text-gray-500 truncate">{place.formatted_address}</div>
												{#if place.business_status}
													<span class={`inline-block mt-1 text-[10px] font-medium px-2 py-0.5 rounded-full ${place.business_status === 'OPERATIONAL' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>{place.business_status}</span>
												{/if}
											</div>
											<div class="text-xs text-gray-400 flex-shrink-0">
												{place.geometry?.location?.lat?.toFixed(4)}, {place.geometry?.location?.lng?.toFixed(4)}
											</div>
										</label>
									{/each}
								</div>
								<div class="px-4 py-2 bg-gray-50 border-t border-gray-200">
									<div class="flex items-center gap-2">
										<div class="flex-1">
											<TagAutocomplete value={restaurantTags} onChange={(v: string) => (restaurantTags = v)} placeholder="Add tags for new brands..." />
										</div>
									</div>
								</div>
								<div class="px-4 py-3 bg-gray-50 border-t border-gray-200 flex items-center justify-between">
									<span class="text-xs text-gray-500">{selectedIds.size} of {filteredPlaces.length} selected</span>
									<button onclick={addRestaurant} disabled={addingRestaurants || selectedIds.size === 0} class="bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-semibold px-4 py-2 rounded-lg transition flex items-center gap-1.5">
										{#if addingRestaurants}
											<svg class="animate-spin w-3.5 h-3.5" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path></svg>
										{/if}
										{addingRestaurants ? 'Adding...' : '🏪 Add Restaurant'}
									</button>
								</div>
							</div>
						{/if}

						{#if addRestaurantStatus}
							<div class={`rounded-xl p-4 ${addRestaurantStatus.type === 'success' ? 'bg-green-50 border border-green-200' : 'bg-yellow-50 border border-yellow-200'}`}>
								<div class="text-xs font-bold mb-1 text-gray-700">{addRestaurantStatus.text}</div>
							</div>
						{/if}

						{#if fetchResults}
							<div class="bg-white rounded-xl border border-gray-200 overflow-hidden">
								<button onclick={() => (showRaw = !showRaw)} class="w-full flex items-center justify-between px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 transition">
									<span>Raw Response</span>
									<svg class={`w-4 h-4 transition-transform ${showRaw ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path></svg>
								</button>
								{#if showRaw}
									<div class="border-t border-gray-200">
										<div class="flex items-center justify-between px-4 py-2 bg-gray-50">
											<span class="text-xs text-gray-400">POST /brands/fetch-Locations</span>
											<button onclick={() => navigator.clipboard.writeText(JSON.stringify(fetchResults, null, 2))} class="text-xs text-gray-500 hover:text-gray-700 flex items-center gap-1">
												<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/></svg>
												Copy
											</button>
										</div>
										<pre class="p-4 text-xs overflow-x-auto bg-white max-h-64 overflow-y-auto"><code>{@html syntaxHighlight(JSON.stringify(fetchResults, null, 2))}</code></pre>
									</div>
								{/if}
							</div>
						{/if}
					</div>
				{/if}

				{#if activeSidebarTab === 'tab3'}
					<div class="bg-white rounded-xl border border-gray-200 p-8 text-center">
						<h2 class="text-xl font-bold text-gray-900">Empty Tab</h2>
					</div>
				{/if}

				{#if activeSidebarTab === 'tab4'}
					<TaggingTab {tagOptions} />
				{/if}

				{#if activeSidebarTab === 'tab5'}
					<div class="space-y-4">
						<div class="flex items-center justify-between mb-2">
						<h2 class="text-xl font-bold text-gray-900">📊 Interesting Data</h2>
					</div>
						<div class="bg-white rounded-xl border border-gray-200 p-5 min-h-[120px]">
							<h3 class="font-semibold text-gray-900 mb-3">Section 1</h3>
							<div class="space-y-3">
								<div class="text-sm">
									<span class="text-gray-500">Total Manual Locations in U-DO system: </span>
									<span class="font-bold text-gray-900">{totalManualLocations.toLocaleString('en-US')}</span>
								</div>
								<div>
									<label class="text-xs font-semibold text-gray-600 mb-1 block">Number of Orders</label>
									<div class="flex items-center gap-3">
										<input type="number" value={section1Orders} oninput={(e) => (section1Orders = (e.currentTarget as HTMLInputElement).value)} class="w-40 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-400" placeholder="Enter orders..." />
										<div class="text-sm text-gray-500">
											<span class="text-gray-400">= </span>
											<span class="font-bold text-cyan-700">{section1Result !== null ? section1Result.toLocaleString('en-US') : '—'}</span>
										</div>
									</div>
								</div>
							</div>
						</div>

						<div class="bg-white rounded-xl border border-gray-200 p-5 min-h-[120px]">
							<div class="flex items-center justify-between mb-3">
								<h3 class="font-semibold text-gray-900">Stats</h3>
								<button
									onclick={() => {
										locationStats = null;
										loadingStats = true;
										fetch(API_BASE + 'admin/locations/stats').then((r) => r.json()).then((data) => (locationStats = data)).catch(() => (locationStats = null)).finally(() => (loadingStats = false));
									}}
									class="text-lg text-blue-600 hover:text-blue-800 bg-blue-100 hover:bg-blue-200 px-4 py-2 rounded-lg transition font-medium" title="Refresh"
								>↻</button>
							</div>
							{#if loadingStats}
								<div class="text-sm text-gray-400">Loading...</div>
							{:else if locationStats}
								<div class="space-y-2 text-sm">
									<div><span class="text-gray-500">Total Locations (all brands): </span><span class="font-bold text-gray-900">{locationStats.totalLocations.toLocaleString('en-US')}</span></div>
									<div><span class="text-gray-500">Active Locations: </span><span class="font-bold text-gray-900">{locationStats.activeLocations.toLocaleString('en-US')}</span></div>
									<div class="pt-2 border-t border-gray-100"><span class="text-gray-500">📍 Washington DC Locations: </span><span class="font-bold text-cyan-700">{locationStats.dcLocations.toLocaleString('en-US')}</span></div>
								</div>
							{:else}
								<div class="text-sm text-red-400">Failed to load stats</div>
							{/if}
						</div>

						<div class="bg-white rounded-xl border border-gray-200 p-5 min-h-[120px]">
							<h3 class="font-semibold text-gray-900">Local Stats</h3>
							<div class="space-y-2 text-sm mt-3">
								{#if globalBrandStats}
									<div><span class="text-gray-500">Total number of local businesses: </span><span class="font-bold text-gray-900">{globalBrandStats.localBusinessCount.toLocaleString('en-US')}</span></div>
									<div><span class="text-gray-500">Total number of businesses on Uber Eats OR DoorDash: </span><span class="font-bold text-gray-900">{globalBrandStats.deliveryPlatformCount.toLocaleString('en-US')}</span></div>
								{:else}
									<div class="text-sm text-red-400">Failed to load stats</div>
								{/if}
								<hr class="my-2 border-gray-200" />
								<div>
									<p class="text-xs font-semibold text-gray-600 mb-1">Filter by polygon:</p>
									{#if polygonsList.length > 0}
										<div class="flex gap-2 mb-1">
											<button onclick={() => (selectedPolygonIds = new Set(polygonsList.map((p: any) => p.id)))} class="text-xs text-blue-600 hover:text-blue-800 font-medium">Select all</button>
											<button onclick={() => (selectedPolygonIds = new Set())} class="text-xs text-blue-600 hover:text-blue-800 font-medium">Select none</button>
										</div>
									{/if}
									<div class="space-y-1 max-h-32 overflow-y-auto">
										{#each polygonsList as p}
											<label class="flex items-center gap-2 text-sm cursor-pointer hover:bg-gray-50 rounded px-1">
												<input
													type="checkbox"
													checked={selectedPolygonIds.has(p.id)}
													onchange={() => {
														const next = new Set(selectedPolygonIds);
														if (next.has(p.id)) next.delete(p.id);
														else next.add(p.id);
														selectedPolygonIds = next;
													}}
													class="accent-blue-600"
												/>
												<span class="text-gray-700">{p.name}</span>
												{#if !p.active}<span class="text-xs text-gray-400">(inactive)</span>{/if}
											</label>
										{/each}
										{#if polygonsList.length === 0}<span class="text-xs text-gray-400">No polygons found</span>{/if}
									</div>
								</div>
								{#if selectedPolygonIds.size > 0 && brandStats}
									<hr class="my-2 border-gray-200" />
									<div class="space-y-1 text-sm">
										<p class="text-xs font-semibold text-gray-600">📍 Inside selected polygons:</p>
										<div><span class="text-gray-500">Total local businesses: </span><span class="font-bold text-gray-900">{brandStats.localBusinessCount.toLocaleString('en-US')}</span></div>
										<div><span class="text-gray-500">On Uber Eats OR DoorDash: </span><span class="font-bold text-gray-900">{brandStats.deliveryPlatformCount.toLocaleString('en-US')}</span></div>
									</div>
								{/if}
							</div>
						</div>

						<div class="bg-white rounded-xl border border-gray-200 p-5 min-h-[120px]">
							<div class="flex items-center justify-between mb-3">
								<h3 class="font-semibold text-gray-900">Stats inside the active polygons</h3>
								<button onclick={() => { polygonStats = null; fetchPolygonStats(); }} class="text-lg text-blue-600 hover:text-blue-800 bg-blue-100 hover:bg-blue-200 px-4 py-2 rounded-lg transition font-medium" title="Refresh">↻</button>
							</div>
							<div class="space-y-2 text-sm">
								<div><span class="text-gray-500">Total Locations (all brands): </span><span class="font-bold text-gray-900">{loadingPolygonStats ? '...' : polygonStats?.totalLocations !== undefined ? polygonStats.totalLocations.toLocaleString('en-US') : '—'}</span></div>
							</div>
						</div>

						<div class="bg-white rounded-xl border border-gray-200 p-5 min-h-[120px]">
							<h3 class="font-semibold text-gray-900 mb-2">Polygon details</h3>
							<div class="space-y-2 text-sm">
								<div><span class="text-gray-500">No of polygons searched: </span><span class="font-bold text-gray-900">{loadingPolygonStats ? '...' : polygonStats?.polygonCount !== undefined ? polygonStats.polygonCount.toLocaleString('en-US') : '—'}</span></div>
								{#if polygonStats?.polygons?.length > 0}
									<div class="flex flex-wrap gap-1">
										{#each polygonStats.polygons as p, i}
											<span class="text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded-full">{p.name}</span>
										{/each}
									</div>
								{/if}
								<div class="pt-1"><span class="text-gray-500">No of brands found: </span><span class="font-bold text-gray-900">{loadingPolygonStats ? '...' : polygonStats?.brandCount !== undefined ? polygonStats.brandCount.toLocaleString('en-US') : '—'}</span></div>
								{#if polygonStats?.brands?.length > 0}
									<div class="pt-2 border-t border-gray-100 space-y-1">
										{#each polygonStats.brands as b}
											<div class="flex items-center justify-between text-sm hover:bg-gray-200 rounded px-1 -mx-1 transition">
												<span class="text-gray-700">{b.brandName}</span>
												<span class="font-semibold text-gray-900">{b.locationCount} location{b.locationCount !== 1 ? 's' : ''}</span>
											</div>
										{/each}
									</div>
								{/if}
							</div>
							{#if polygonStats?.polygons?.some((p: any) => p.brands?.length > 0)}
								<div class="mt-3 space-y-3 text-sm border-t border-gray-200 pt-3">
									{#each polygonStats.polygons as poly}
										<div>
											<div class="flex items-center gap-2 font-semibold text-gray-900 mb-1">
												<span>📐 {poly.name}</span>
												<span class="text-xs font-normal text-gray-500">({poly.locationCount} location{poly.locationCount !== 1 ? 's' : ''})</span>
											</div>
											{#each poly.brands as b}
												<div class="flex items-center justify-between pl-5 hover:bg-gray-200 rounded px-1 -mx-1 transition">
													<span class="text-gray-700">{b.brandName}</span>
													<span class="font-medium text-gray-900">{b.locationCount} location{b.locationCount !== 1 ? 's' : ''}</span>
												</div>
											{/each}
										</div>
									{/each}
								</div>
							{/if}
						</div>

						{#each [6, 7, 8, 9] as num}
							<div class="bg-white rounded-xl border border-gray-200 p-5 min-h-[120px]">
								<h3 class="font-semibold text-gray-900 mb-2">Section {num}</h3>
								<p class="text-sm text-gray-400">Content for section {num} will go here.</p>
							</div>
						{/each}
					</div>
				{/if}

				{#if activeSidebarTab === 'tab6'}
					<div class="p-8 text-center">
						<p class="text-sm text-gray-500 mb-3">Bulk brand locations moved to dedicated page.</p>
						<a href="/admin/bulkaction" class="text-orange-500 hover:text-orange-600 text-sm font-medium underline">Open Add Bulk Brand Locations →</a>
					</div>
				{/if}

				{#if activeSidebarTab === 'tab8'}
					<div>
						<h2 class="text-xl font-bold text-gray-900 mb-4">🏢 Search Brands by Tag</h2>
						<div class="relative mb-4">
							<div class="flex gap-2">
								<div class="relative flex-1">
									<input
										bind:this={tagInput}
										type="text"
										value={tagSearchQuery}
										oninput={(e) => handleTagSearchInputChange((e.currentTarget as HTMLInputElement).value)}
										onkeydown={handleTagSearchKeyDown}
										onfocus={() => { if (filteredTags.length > 0) showTagSuggestions = true; }}
										onblur={() => { if (tagBlurTimer) clearTimeout(tagBlurTimer); tagBlurTimer = setTimeout(() => (showTagSuggestions = false), 150); }}
										placeholder="Search by tag… e.g. ice_cream, mediterranean, auto"
										class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400"
									/>
									{#if showTagSuggestions}
										<div class="absolute z-50 left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
											{#each filteredTags as tag, i}
												<button type="button" onmousedown={(e) => { e.preventDefault(); selectTagSuggestion(tag); }} class={`w-full text-left px-3 py-2 text-sm transition-colors ${i === tagHighlightIdx ? 'bg-violet-50 text-violet-700' : 'text-gray-700 hover:bg-gray-50'}`}>{tag}</button>
											{/each}
										</div>
									{/if}
								</div>
								<button
									onclick={() => searchBrandsByTag()}
									disabled={searchLoading || tagSearchQuery.trim().length < 2}
									class="bg-violet-600 hover:bg-violet-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold px-4 py-2 rounded-lg transition flex items-center gap-2"
								>
									{#if searchLoading}
										<svg class="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path></svg>
									{/if}
									{searchLoading ? 'Searching...' : '🔍 Search'}
								</button>
							</div>
						</div>

						{#if tagOptions.length > 0}
							<div class="mb-5">
								<label class="text-xs text-gray-400 font-medium mb-2 block">Browse all tags</label>
								<div class="flex flex-wrap gap-2">
									{#each [...new Set(tagOptions)].sort() as tag}
										<button
											onclick={() => { tagSearchQuery = tag; showTagSuggestions = false; filteredTags = []; searchBrandsByTag(tag); }}
											class={`text-xs font-medium px-3 py-1.5 rounded-full transition-all border ${tagSearchQuery === tag ? 'bg-violet-600 text-white border-violet-600 shadow-sm' : 'bg-white text-gray-700 border-gray-200 hover:bg-violet-50 hover:border-violet-300 hover:text-violet-700'}`}
										>
											<span>{tag.replace(/_/g, ' ')}</span>
											<span class="ml-1 text-[10px] opacity-70">({tagCounts[tag] || 0})</span>
										</button>
									{/each}
								</div>
							</div>
						{/if}

						{#if searchError}
							<div class="mb-4 p-3 rounded-lg text-sm bg-red-50 text-red-700">
								<div class="flex items-center justify-between">
									<span>⚠️ {searchError}</span>
									<button onclick={() => (searchError = null)} class="text-current opacity-50 hover:opacity-100 ml-2">✕</button>
								</div>
							</div>
						{/if}

						{#if searchLoading}
							<div class="text-center py-12 text-gray-400">Searching brands...</div>
						{/if}

						{#if !searchLoading && tagSearchQuery.trim() && searchResults.length === 0 && !searchError}
							<div class="text-center py-12 text-gray-400">No brands found for this tag.</div>
						{/if}

						{#if searchResults.length > 0}
							<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
								{#each searchResults as brand}
									<div class="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md transition-shadow">
										<div class="flex flex-col items-center text-center">
											<div class="w-16 h-16 rounded-xl overflow-hidden border border-gray-100 mb-3 flex-shrink-0 bg-violet-100 flex items-center justify-center">
												{#if brand.logoUrl}
													<img src={brand.logoUrl} alt={brand.name} class="w-full h-full object-contain" />
												{:else}
													<span class="text-xl font-bold text-violet-600">{brand.name?.charAt(0)}</span>
												{/if}
											</div>
											<h3 class="font-semibold text-gray-900">{brand.name}</h3>
											{#if brand.tags?.length > 0}
												<div class="flex flex-wrap gap-1 mt-2 justify-center">
													{#each brand.tags as tag}
														<span class="text-xs px-2 py-0.5 rounded-full bg-violet-100 text-violet-700">{tag}</span>
													{/each}
												</div>
											{/if}
											<a href={`/admin/brands/${brand.id}`} class="mt-3 text-xs bg-violet-50 text-violet-700 px-4 py-1.5 rounded-lg hover:bg-violet-100 font-medium">View Details →</a>
										</div>
									</div>
								{/each}
							</div>
						{/if}
					</div>
				{/if}

				{#if activeSidebarTab === 'tab12'}
					<div class="flex flex-col min-h-[calc(100vh-240px)]">
						<div class="flex items-center justify-between mb-3">
							<h2 class="text-xl font-bold text-gray-900">📝 Unlisted Stores</h2>
							<div class="flex items-center gap-2">
								{#if unlistedStoresSaved}<span class="text-xs text-green-600 font-medium">Saved ✓</span>{/if}
								<button onclick={saveUnlistedStores} disabled={savingUnlistedStores} class="bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white text-xs font-semibold px-4 py-1.5 rounded-lg transition flex items-center gap-1.5">
									{#if savingUnlistedStores}
										<svg class="animate-spin w-3.5 h-3.5" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path></svg>
									{/if}
									{savingUnlistedStores ? 'Saving...' : '💾 Save'}
								</button>
							</div>
						</div>
						<textarea value={unlistedStoresText} oninput={(e) => (unlistedStoresText = (e.currentTarget as HTMLTextAreaElement).value)} placeholder="Write your notes about unlisted stores here..." class="flex-1 w-full border border-gray-200 rounded-xl p-5 text-sm leading-relaxed resize-none focus:outline-none focus:ring-2 focus:ring-violet-400"></textarea>
					</div>
				{/if}

				{#if activeSidebarTab === 'tab11'}
					<div>
						<h2 class="text-xl font-bold text-gray-900 mb-4">🗑️ Delete A Tag</h2>
						{#if tagOptions.length === 0}
							<div class="text-sm text-gray-400 py-8">No tags available.</div>
						{:else}
							<p class="text-sm text-gray-500 mb-4">
								Click the ✕ next to a tag to permanently remove it from the global tag list. Brands already tagged are not affected.
							</p>
							<div class="flex flex-wrap gap-2">
								{#each [...new Set(tagOptions)].sort() as tag}
									<div class="inline-flex items-center gap-1.5 bg-white border border-gray-200 rounded-full px-3 py-1.5 text-sm">
										<span class="text-[10px] text-gray-400 font-medium min-w-[1.2rem]">{tagCounts[tag] || 0}</span>
										<span>{tag.replace(/_/g, ' ')}</span>
										<button
											onclick={() => deleteTag(tag)}
											disabled={deletingTag === tag}
											class="text-gray-400 hover:text-red-500 disabled:opacity-50 transition"
											title={`Delete "${tag}"`}
										>
											{#if deletingTag === tag}
												<svg class="animate-spin w-3.5 h-3.5" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path></svg>
											{:else}
												<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
											{/if}
										</button>
									</div>
								{/each}
							</div>
						{/if}
					</div>
				{/if}

				{#if activeSidebarTab === 'tab7'}
					<div class="flex flex-col min-h-[calc(100vh-240px)]">
						<div class="flex items-center justify-between mb-3">
							<h2 class="text-xl font-bold text-gray-900">✅ To Do</h2>
						</div>
						<textarea value={todoText} oninput={(e) => (todoText = (e.currentTarget as HTMLTextAreaElement).value)} placeholder="Write your notes here..." class="flex-1 w-full border border-gray-200 rounded-xl p-5 text-sm leading-relaxed resize-none focus:outline-none focus:ring-2 focus:ring-violet-400"></textarea>
					</div>
				{/if}

				{#if activeSidebarTab === 'tab13'}
					<div>
						<h2 class="text-xl font-bold text-gray-900 mb-4">✅ Brands With Menu</h2>
						{#if loadingBrandsWithMenu}
							<div class="text-center py-12 text-gray-400">Loading brands...</div>
						{:else if brandsWithMenu.length === 0}
							<div class="text-center py-12 text-gray-400">No brands with menu found.</div>
						{:else}
							<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
								{#each brandsWithMenu as brand}
									<div class="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-lg transition-shadow relative">
										<a href={`/admin/brands/${brand.id || brand._id}`} target="_blank" rel="noopener noreferrer" class="absolute top-3 right-3 text-gray-400 hover:text-violet-600 transition" title="Open in new tab">
											<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25"></path></svg>
										</a>
										<div class="flex flex-col items-center text-center">
											<div class="w-20 h-20 rounded-xl overflow-hidden border border-gray-100 mb-3 flex-shrink-0 bg-emerald-100 flex items-center justify-center">
												{#if brand.logoUrl}
													<img src={brand.logoUrl} alt={brand.name} class="w-full h-full object-cover" />
												{:else}
													<span class="text-2xl font-bold text-emerald-600">{brand.name?.charAt(0)}</span>
												{/if}
											</div>
											<h3 class="font-semibold text-gray-900 text-lg">{brand.name}</h3>
											<div class="flex items-center gap-2 mt-1">
												<span class={`text-xs px-2 py-0.5 rounded-full font-medium ${typeBadge(brand.brandType)}`}>{brand.brandType}</span>
												{#if brand.isActive}
													<span class="text-xs px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600">Active</span>
												{:else}
													<span class="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">Inactive</span>
												{/if}
											</div>
											<a href={`/admin/brands/${brand.id || brand._id}`} target="_blank" rel="noopener noreferrer" class="mt-3 inline-block text-xs bg-violet-50 text-violet-700 px-4 py-1.5 rounded-lg hover:bg-violet-100 font-medium">View Details ↗</a>
										</div>
									</div>
								{/each}
							</div>
						{/if}
					</div>
				{/if}
			</div>
		</div>

		<div class="text-center text-xs text-gray-400 py-6 border-t border-gray-100 mt-8">
			UDO Admin · Activate Brands
		</div>
	</main>
</div>
