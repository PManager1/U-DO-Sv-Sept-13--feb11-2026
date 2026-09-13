<script lang="ts">
	import { onMount } from 'svelte';
	import API_BASE from '$lib/api';
	import BackButton from '$lib/BackButton.svelte';
	import TagAutocomplete from '$lib/TagAutocomplete.svelte';
	import LocationsMap from '$lib/admin/LocationsMap.svelte';
	import PolygonCreator from '$lib/admin/PolygonCreator.svelte';

	const TOP_TABS = [
		{ key: 'action', label: 'Action', icon: '⚡' },
		{ key: 'polygons', label: 'Polygons', icon: '📐' }
	];
	const brandTypes = [
		{ key: 'restaurant', label: '🍕 Restaurant', activeColor: 'bg-orange-600 text-white border-orange-600' },
		{ key: 'grocery', label: '🛒 Grocery', activeColor: 'bg-green-600 text-white border-green-600' },
		{ key: 'convenience', label: '🏪 Convenience', activeColor: 'bg-blue-600 text-white border-blue-600' },
		{ key: 'pharmacy', label: '💊 Pharmacy', activeColor: 'bg-purple-600 text-white border-purple-600' },
		{ key: 'localBusiness', label: '🏢 Local Business', activeColor: 'bg-teal-600 text-white border-teal-600' },
		{ key: 'retail', label: '🏬 Retail', activeColor: 'bg-yellow-600 text-white border-yellow-600' }
	];
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

	let activeTab = $state('action');
	let selectedBrandIds = $state(new Set<string>());
	let brandFilter = $state('');
	let tabActiveTypes = $state(new Set<string>());
	let tabBrands = $state<any[]>([]);
	let tabLoadingBrands = $state(false);
	let brandSearchTimer: ReturnType<typeof setTimeout> | null = null;
	let locationCounts = $state<Record<string, number>>({});
	let allMapLocations = $state<any[]>([]);
	let mapLocationsLoading = $state(false);
	let actionMapZoom = $state(4);
	let zoomSaveTimer: ReturnType<typeof setTimeout> | null = null;
	let personalized = $state(false);
	let useLogoMarkers = $state(false);
	let savedPolygons = $state<any[]>([]);
	let selectedPolygonIds = $state(new Set<string>());
	let polygonFilter = $state('');
	let editingPolygon = $state<any>(null);
	let focusPolygon = $state<any>(null);
	let focusKey = $state(0);
	let searchTerm = $state('');
	let gmapsUrl = $state('https://maps.googleapis.com/maps/api/place/textsearch/json?query=Restaurants&key=AIzaSyDTm4xeMjg5_GFa2YYUE6zsk2-vagqlAno');
	let fetchResults = $state<any>(null);
	let fetchLoading = $state(false);
	let fetchError = $state<string | null>(null);
	let filterQuery = $state('');
	let selectedIds = $state(new Set<string>());
	let restaurantTags = $state('');
	let addRestaurantStatus = $state<{ type: string; text: string } | null>(null);
	let addingRestaurants = $state(false);
	let showRaw = $state(false);

	const filteredMapLocations = $derived(allMapLocations.filter((loc) => selectedBrandIds.has(loc.brandId)));
	const typeCounts = $derived.by(() => {
		const counts: Record<string, number> = {};
		tabBrands.forEach((b) => { counts[b.brandType] = (counts[b.brandType] || 0) + 1; });
		return counts;
	});
	const places = $derived(fetchResults?.results || []);
	const filteredPolys = $derived(savedPolygons.filter((p: any) => !polygonFilter || p.name.toLowerCase().includes(polygonFilter.toLowerCase())));
	const filteredPlaces = $derived(places.filter((p: any) => {
		if (!filterQuery) return true;
		const q = filterQuery.toLowerCase();
		return p.name?.toLowerCase().includes(q) || p.formatted_address?.toLowerCase().includes(q);
	}));

	function toggleTabType(type: string) {
		const next = new Set(tabActiveTypes);
		if (next.has(type)) next.delete(type);
		else next.add(type);
		tabActiveTypes = next;
	}

	function fetchTabBrands(search: string) {
		tabLoadingBrands = true;
		const params = new URLSearchParams();
		params.set('limit', '100');
		if (search) params.set('search', search);
		if (tabActiveTypes.size > 0) params.set('type', [...tabActiveTypes].join(','));
		fetch(API_BASE + 'admin/brands?' + params.toString())
			.then((r) => r.json())
			.then((data: any) => (tabBrands = Array.isArray(data) ? data : data?.brands || []))
			.catch(() => (tabBrands = []))
			.finally(() => (tabLoadingBrands = false));
	}

	$effect(() => {
		if (brandSearchTimer) clearTimeout(brandSearchTimer);
		brandSearchTimer = setTimeout(() => fetchTabBrands(brandFilter), 300);
		return () => { if (brandSearchTimer) clearTimeout(brandSearchTimer); };
	});

	onMount(() => {
		fetchTabBrands('');
		fetch(API_BASE + 'admin/locations/counts').then((r) => r.json()).then((data) => (locationCounts = data || {})).catch(() => (locationCounts = {}));
		mapLocationsLoading = true;
		fetch(API_BASE + 'admin/bulk-brand-locations').then((r) => r.json()).then((data) => (allMapLocations = Array.isArray(data) ? data : [])).catch(() => (allMapLocations = [])).finally(() => (mapLocationsLoading = false));
		loadSavedPolygons();
		return () => { if (zoomSaveTimer) clearTimeout(zoomSaveTimer); };
	});

	function loadSavedPolygons() {
		fetch(API_BASE + 'admin/polygons').then((r) => r.json()).then((data) => (savedPolygons = Array.isArray(data) ? data : [])).catch(() => (savedPolygons = []));
	}

	async function deletePolygon(id: string) {
		try {
			const res = await fetch(API_BASE + 'admin/polygons/' + id, { method: 'DELETE' });
			if (res.ok) { const next = new Set(selectedPolygonIds); next.delete(id); selectedPolygonIds = next; loadSavedPolygons(); }
		} catch {}
	}

	async function deleteSelectedPolygons() {
		for (const id of selectedPolygonIds) await deletePolygon(id);
	}

	async function clonePolygon(p: any) {
		try {
			await fetch(API_BASE + 'admin/polygons', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: p.name + ' (copy)', color: p.color, coordinates: p.coordinates }) });
			loadSavedPolygons();
		} catch {}
	}

	function showPolygonOnMap(p: any) {
		const next = new Set(selectedPolygonIds); next.add(p.id); selectedPolygonIds = next;
		focusPolygon = p;
		focusKey += 1;
	}

	async function deleteLocation(locId: string) {
		try {
			await fetch(API_BASE + 'admin/locations/' + locId, { method: 'DELETE' });
			allMapLocations = allMapLocations.filter((l) => (l.id || l._id) !== locId);
		} catch {}
	}

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
		const query = (searchTerm || '').trim();
		if (!query) { fetchError = 'Please enter a search term.'; fetchLoading = false; return; }
		try {
			const res = await fetch(API_BASE + 'brands/fetch-Locations', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ query }) });
			const data = await res.json();
			if (res.ok) fetchResults = data;
			else fetchError = data.message || data.error || `HTTP ${res.status}: Request failed`;
		} catch (err: any) {
			fetchError = err.message || 'Network error';
		} finally {
			fetchLoading = false;
		}
	}

	async function fetchNotAdded() {
		const selectedBrands = tabBrands.filter((b) => selectedBrandIds.has(b.id || b._id));
		if (selectedBrands.length === 0) return;
		fetchLoading = true;
		fetchError = null;
		fetchResults = null;
		selectedIds = new Set();
		showRaw = false;
		const allResults: any[] = [];
		const seenIds = new Set();
		for (const brand of selectedBrands) {
			try {
				const res = await fetch(API_BASE + 'brands/fetch-Locations', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ query: brand.name }) });
				const data = await res.json();
				if (res.ok && data.results) {
					for (const place of data.results) {
						if (seenIds.has(place.place_id)) continue;
						const exists = allMapLocations.some((loc) => (loc.placeId && loc.placeId === place.place_id) || ((loc.name || '').toLowerCase().trim() === (place.name || '').toLowerCase().trim() && (loc.address || '').toLowerCase().trim() === (place.formatted_address || '').toLowerCase().trim()));
						if (!exists) { seenIds.add(place.place_id); allResults.push(place); }
					}
				}
			} catch {}
		}
		fetchResults = { results: allResults };
		fetchLoading = false;
	}

	async function addRestaurant() {
		addingRestaurants = true;
		addRestaurantStatus = null;
		const selected = places.filter((p: any) => selectedIds.has(p.place_id));
		const parsedTags = restaurantTags.split(',').map((s) => s.trim().toLowerCase().replace(/\s+/g, '_')).filter(Boolean);
		let success = 0, failed = 0;
		for (const place of selected) {
			try {
				const body: any = { name: place.name.split('|')[0].trim(), brandType: 'localBusiness' };
				if (parsedTags.length > 0) body.tags = parsedTags;
				const res = await fetch(API_BASE + 'admin/brands', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
				if (res.ok) success++; else failed++;
			} catch { failed++; }
		}
		const allOk = failed === 0;
		addRestaurantStatus = { type: allOk ? 'success' : 'warning', text: allOk ? `✅ Created ${success} brand${success > 1 ? 's' : ''} successfully` : `⚠️ Created ${success}, ${failed} failed` };
		if (allOk) {
			selectedIds = new Set();
			if (parsedTags.length > 0) fetch(API_BASE + 'admin/brand-tags', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ tags: parsedTags }) }).catch(() => {});
		}
		addingRestaurants = false;
	}

	async function addPlaceToSelectedBrands(place: any) {
		const placeName = (place.name || '').toLowerCase().trim();
		const matched = tabBrands.filter((b) => b.name?.toLowerCase().includes(placeName));
		const brandIds = matched.length > 0 ? matched.map((b) => b.id || b._id) : [...selectedBrandIds];
		if (brandIds.length === 0) return false;
		let ok = true;
		for (const brandId of brandIds) {
			try {
				const res = await fetch(API_BASE + `admin/brands/${brandId}/locations`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: place.name, address: place.formatted_address, latitude: place.geometry?.location?.lat, longitude: place.geometry?.location?.lng, placeId: place.place_id }) });
				if (res.ok) {
					const newLoc = await res.json();
					allMapLocations = [...allMapLocations, { id: newLoc.id, brandId, name: place.name, address: place.formatted_address, latitude: place.geometry?.location?.lat, longitude: place.geometry?.location?.lng, placeId: place.place_id, brandName: matched.find((b) => (b.id || b._id) === brandId)?.name || '' }];
				} else ok = false;
			} catch { ok = false; }
		}
		return ok;
	}

	function isExistingPlace(p: any) {
		const pName = (p.name || '').toLowerCase().trim();
		const pAddr = (p.formatted_address || '').toLowerCase().trim();
		return allMapLocations.some((loc) => (loc.placeId && loc.placeId === p.place_id) || ((loc.name || '').toLowerCase().trim() === pName && (loc.address || '').toLowerCase().trim() === pAddr));
	}

	// Restore prefs from personalize
	$effect(() => {
		if (personalized) return;
		fetch(API_BASE + 'admin/personalize').then((r) => r.json()).then((data: any) => {
			const prefs = data.bulkActionPrefs;
			if (prefs?.actionMapZoom) actionMapZoom = prefs.actionMapZoom;
			if (prefs?.activeTypes?.length) tabActiveTypes = new Set(prefs.activeTypes);
			if (prefs?.useLogoMarkers !== undefined) useLogoMarkers = prefs.useLogoMarkers;
			if (prefs?.selectedBrandIds?.length) selectedBrandIds = new Set(prefs.selectedBrandIds);
			if (prefs?.selectedPolygonIds?.length) selectedPolygonIds = new Set(prefs.selectedPolygonIds);
			personalized = true;
		}).catch(() => (personalized = true));
	});

	// Debounce save prefs
	$effect(() => {
		if (!personalized) return;
		if (zoomSaveTimer) clearTimeout(zoomSaveTimer);
		zoomSaveTimer = setTimeout(() => {
			fetch(API_BASE + 'admin/personalize', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ bulkActionPrefs: { actionMapZoom, activeTypes: [...tabActiveTypes], useLogoMarkers, selectedBrandIds: [...selectedBrandIds], selectedPolygonIds: [...selectedPolygonIds] } }) }).catch(() => {});
		}, 500);
		return () => { if (zoomSaveTimer) clearTimeout(zoomSaveTimer); };
	});

	function syntaxHighlight(json: string) {
		return json.replace(/(\"(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\\"])*\"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g, (match: string) => {
			let cls = 'text-amber-600';
			if (/^\"/.test(match)) cls = /:$/.test(match) ? 'text-sky-700' : 'text-green-600';
			else if (/true|false/.test(match)) cls = 'text-purple-600';
			else if (/null/.test(match)) cls = 'text-gray-400';
			return `<span class="${cls}">${match}</span>`;
		});
	}
</script>

<div class="min-h-screen bg-gray-50">
	<header class="bg-white border-b border-gray-200">
		<div class="max-w-6xl mx-auto px-6 py-5">
			<BackButton fallback="/admin/activate-brands" />
			<div class="mt-3 flex items-center justify-between">
				<h1 class="text-2xl font-bold text-gray-900">Add Bulk Brand Locations</h1>
			</div>
			<div class="flex gap-1 mt-4 border-b border-gray-200">
				{#each TOP_TABS as tab}
					<button onclick={() => (activeTab = tab.key)} class={`px-4 py-2 text-sm font-medium transition border-b-2 -mb-px ${activeTab === tab.key ? 'text-orange-600 border-orange-600' : 'text-gray-500 border-transparent hover:text-gray-700'}`}>{tab.icon} {tab.label}</button>
				{/each}
			</div>
		</div>
	</header>

	<main class="max-w-6xl mx-auto px-6 py-6">
		{#if activeTab === 'action'}
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
							{#if fetchLoading}<svg class="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path></svg>{/if}
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
								<button onclick={() => (selectedIds = new Set(filteredPlaces.map((p: any) => p.place_id)))} class="text-xs text-blue-600 hover:text-blue-700 font-medium">Select All</button>
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
										{#if place.business_status}<span class={`inline-block mt-1 text-[10px] font-medium px-2 py-0.5 rounded-full ${place.business_status === 'OPERATIONAL' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>{place.business_status}</span>{/if}
									</div>
									<div class="text-xs text-gray-400 flex-shrink-0">{place.geometry?.location?.lat?.toFixed(4)}, {place.geometry?.location?.lng?.toFixed(4)}</div>
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
								{#if addingRestaurants}<svg class="animate-spin w-3.5 h-3.5" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path></svg>{/if}
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

				<div class="flex flex-wrap items-center gap-2">
					<div class="flex flex-wrap gap-1.5">
						{#each brandTypes as bt}
							{@const isActive = tabActiveTypes.has(bt.key)}
							<button onclick={() => toggleTabType(bt.key)} class={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-all ${isActive ? bt.activeColor + ' shadow-sm' : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300'}`}>{bt.label} {typeCounts[bt.key] !== undefined && `(${typeCounts[bt.key]})`}</button>
						{/each}
						<button onclick={fetchNotAdded} class="ml-2 text-xs font-semibold px-3 py-1.5 rounded-lg border border-indigo-300 text-indigo-600 hover:bg-indigo-50 transition whitespace-nowrap">⬇️ Fetch Not Added</button>
						{#if tabActiveTypes.size > 0}
							<button onclick={() => (tabActiveTypes = new Set())} class="px-2 py-1 rounded-lg text-xs text-gray-400 hover:text-gray-600 hover:bg-gray-50 transition">✕ Clear</button>
						{/if}
					</div>
				</div>

				<div class="bg-white rounded-xl border border-gray-200 overflow-hidden">
					<div class="flex items-center justify-between px-4 py-3 bg-gray-50 border-b border-gray-200">
						<div>
							<span class="text-sm font-semibold text-gray-700">Brands</span>
							<span class="ml-2 text-xs text-gray-400">{brandFilter ? `${tabBrands.length} found` : `${tabBrands.length} total`}</span>
						</div>
						<div class="flex items-center gap-2">
							<button onclick={() => (selectedBrandIds = new Set(tabBrands.map((b) => b.id || b._id)))} class="text-xs text-blue-600 hover:text-blue-700 font-medium">Select All</button>
							<button onclick={() => (selectedBrandIds = new Set())} class="text-xs text-gray-500 hover:text-gray-700 font-medium">Clear</button>
						</div>
					</div>
					<div class="px-4 py-2 border-b border-gray-100">
						<div class="relative">
							<input type="text" value={brandFilter} oninput={(e) => (brandFilter = (e.currentTarget as HTMLInputElement).value)} placeholder="Search brands..." class="w-full border border-gray-300 rounded-lg px-3 py-1.5 pr-8 text-xs focus:outline-none focus:ring-2 focus:ring-blue-400" />
							{#if brandFilter}
								<button onclick={() => (brandFilter = '')} class="absolute right-1.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
									<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" /></svg>
								</button>
							{/if}
						</div>
					</div>
					{#if tabLoadingBrands}
						<div class="px-4 py-8 text-center text-sm text-gray-400">Searching brands...</div>
					{:else}
						<div class="divide-y divide-gray-100 max-h-96 overflow-y-auto">
							{#each tabBrands as brand}
								{@const bid = brand.id || brand._id}
								<label class={`flex items-start gap-3 px-4 py-3 cursor-pointer hover:bg-gray-50 transition ${selectedBrandIds.has(bid) ? 'bg-blue-50' : ''}`}>
									<input type="checkbox" checked={selectedBrandIds.has(bid)} onchange={() => { const next = new Set(selectedBrandIds); if (next.has(bid)) next.delete(bid); else next.add(bid); selectedBrandIds = next; }} class="mt-0.5 rounded" />
									<div class="flex-1 min-w-0">
										<div class="flex items-center gap-2">
											<div class="w-8 h-8 rounded-lg overflow-hidden border border-gray-100 flex-shrink-0 bg-gray-100 flex items-center justify-center">
												{#if brand.logoUrl}<img src={brand.logoUrl} alt="" class="w-full h-full object-cover" />{:else}<span class="text-xs font-bold text-gray-400">{brand.name?.charAt(0)}</span>{/if}
											</div>
											<div>
												<div class="text-sm font-medium text-gray-900 truncate">{brand.name}</div>
												<span class="text-xs text-gray-400">{locationCounts[bid] || 0} locations</span>
											</div>
										</div>
										<div class="flex items-center gap-2 mt-0.5">
											<span class={`text-[10px] font-medium px-2 py-0.5 rounded-full ${typeBadge(brand.brandType)}`}>{brand.brandType}</span>
											{#if brand.isActive}<span class="text-[10px] font-medium text-emerald-600">Active</span>{:else}<span class="text-[10px] font-medium text-gray-400">Inactive</span>{/if}
										</div>
									</div>
								</label>
							{/each}
						</div>
					{/if}
					<div class="px-4 py-3 bg-gray-50 border-t border-gray-200 flex items-center justify-between">
						<span class="text-xs text-gray-500">{selectedBrandIds.size} of {tabBrands.length} selected</span>
					</div>
				</div>

				<div class="bg-white rounded-xl border border-gray-200 overflow-hidden">
					<div class="px-4 py-2 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
						<span class="text-sm font-semibold text-gray-700">🗺️ Locations on Map <span class="text-xs text-gray-400 font-normal">({filteredMapLocations.length} pins)</span></span>
						<label class="flex items-center gap-2 text-xs text-gray-500 cursor-pointer select-none">
							<span>Default pins</span>
							<div class={`relative w-9 h-5 rounded-full transition-colors ${useLogoMarkers ? 'bg-indigo-500' : 'bg-gray-300'}`} onclick={() => (useLogoMarkers = !useLogoMarkers)}>
								<div class={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${useLogoMarkers ? 'translate-x-4' : ''}`}></div>
							</div>
							<span>Brand logos</span>
						</label>
					</div>
					{#if mapLocationsLoading}
						<div class="p-8 text-center text-sm text-gray-400">Loading locations...</div>
					{:else if allMapLocations.length === 0}
						<div class="p-8 text-center text-sm text-gray-400">No location data available.</div>
					{:else}
						<LocationsMap locations={filteredMapLocations} googlePlaces={places} onAddPlace={addPlaceToSelectedBrands} isExistingPlace={isExistingPlace} onDeletePlace={deleteLocation} initialZoom={actionMapZoom} onZoomChange={(z) => (actionMapZoom = z)} height={600} polygons={savedPolygons} selectedPolygonIds={selectedPolygonIds} focusPolygon={focusPolygon} focusKey={focusKey} useLogoMarkers={useLogoMarkers} gpIcon="https://maps.google.com/mapfiles/ms/icons/red-dot.png" />
					{/if}
				</div>

				<div class="bg-white rounded-xl border border-gray-200 overflow-hidden">
					<div class="px-4 py-2 bg-gray-50 border-b border-gray-200">
						<span class="text-sm font-semibold text-gray-700">📐 Saved Polygons</span>
						<span class="ml-2 text-xs text-gray-400">{savedPolygons.length} total</span>
					</div>
					<div class="divide-y divide-gray-100 max-h-48 overflow-y-auto">
						{#if savedPolygons.length === 0}
							<div class="px-4 py-6 text-center text-sm text-gray-400">No saved polygons yet. Create one using the Polygon Creator below.</div>
						{:else}
							{#each savedPolygons as p}
								{@const isSelected = selectedPolygonIds.has(p.id)}
								<label class={`flex items-center gap-3 px-4 py-2.5 cursor-pointer hover:bg-gray-50 transition ${isSelected ? 'bg-amber-50' : ''}`}>
									<input type="checkbox" checked={isSelected} onchange={() => { const next = new Set(selectedPolygonIds); if (next.has(p.id)) next.delete(p.id); else next.add(p.id); selectedPolygonIds = next; }} class="rounded" />
									<div class="flex-1 min-w-0">
										<div class="flex items-center gap-2">
											<span class="text-sm font-medium text-gray-900 truncate">{p.name}</span>
											<button onclick={(e) => { e.stopPropagation(); editingPolygon = p; }} class="text-xs text-amber-500 hover:text-amber-700 transition flex-shrink-0">✏️</button>
											<button onclick={(e) => { e.stopPropagation(); deletePolygon(p.id); }} class="text-xs text-red-400 hover:text-red-600 transition flex-shrink-0">🗑️</button>
											<button onclick={(e) => { e.stopPropagation(); clonePolygon(p); }} class="text-xs text-gray-400 hover:text-gray-600 transition flex-shrink-0">📋</button>
											<button onclick={(e) => { e.stopPropagation(); showPolygonOnMap(p); }} class="text-xs text-blue-500 hover:text-blue-700 transition flex-shrink-0">👁️</button>
										</div>
									</div>
									<span class="w-2.5 h-2.5 rounded-full" style={`background-color:${p.color || '#6366f1'}`}></span>
									<button onclick={(e) => { e.stopPropagation(); fetch(API_BASE + 'admin/polygons/' + p.id, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ active: !p.active }) }).then(() => loadSavedPolygons()); }} class={`text-sm transition flex-shrink-0 w-6 h-6 flex items-center justify-center rounded-full border-2 ${p.active ? 'bg-green-500 text-white border-green-500' : 'border-gray-300 text-gray-400 hover:border-gray-500'}`}>{p.active ? '✓' : ''}</button>
								</label>
							{/each}
						{/if}
					</div>
				</div>

				<div class="bg-white rounded-xl border border-gray-200 overflow-hidden">
					<div class="px-4 py-2 bg-gray-50 border-b border-gray-200">
						<span class="text-sm font-semibold text-gray-700">✏️ Polygon Creator</span>
					</div>
					<PolygonCreator showSaveUI={true} existingPolygons={savedPolygons} selectedPolygonIds={selectedPolygonIds} onSaved={loadSavedPolygons} editingPolygon={editingPolygon} />
				</div>
			</div>
		{/if}

		{#if activeTab === 'polygons'}
			<div class="space-y-6">
				<div class="bg-white rounded-xl border border-gray-200 overflow-hidden">
					<div class="px-4 py-2 bg-gray-50 border-b border-gray-200">
						<span class="text-sm font-semibold text-gray-700">✏️ Map Polygon Creator</span>
					</div>
					<PolygonCreator showSaveUI={true} existingPolygons={savedPolygons} selectedPolygonIds={selectedPolygonIds} height={600} onSaved={loadSavedPolygons} editingPolygon={editingPolygon} />
				</div>

				<div class="bg-white rounded-xl border border-gray-200 overflow-hidden">
					<div class="px-4 py-2 bg-gray-50 border-b border-gray-200">
						<span class="text-sm font-semibold text-gray-700">Saved Polygons</span>
						<span class="ml-2 text-xs text-gray-400">{savedPolygons.length} total</span>
					</div>
					<div class="px-4 py-2 border-b border-gray-100">
						<input type="text" value={polygonFilter} oninput={(e) => (polygonFilter = (e.currentTarget as HTMLInputElement).value)} placeholder="Search saved polygons..." class="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-400" />
					</div>
					<div class="divide-y divide-gray-100 max-h-64 overflow-y-auto">
						{#if filteredPolys.length === 0}
							<div class="px-4 py-6 text-center text-sm text-gray-400">No saved polygons yet.</div>
						{:else}
							{#each filteredPolys as p}
								{@const isSelected = selectedPolygonIds.has(p.id)}
								<label class={`flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-gray-50 transition ${isSelected ? 'bg-amber-50' : ''}`}>
									<input type="checkbox" checked={isSelected} onchange={() => { const next = new Set(selectedPolygonIds); if (next.has(p.id)) next.delete(p.id); else next.add(p.id); selectedPolygonIds = next; }} class="mt-0.5 rounded" />
									<div class="flex-1 min-w-0">
										<div class="flex items-center gap-2">
											<span class="text-sm font-medium text-gray-900 truncate">{p.name}</span>
											<button onclick={(e) => { e.stopPropagation(); editingPolygon = p; }} class="text-xs text-amber-500 hover:text-amber-700 transition flex-shrink-0">✏️</button>
											<button onclick={(e) => { e.stopPropagation(); deletePolygon(p.id); }} class="text-xs text-red-400 hover:text-red-600 transition flex-shrink-0">🗑️</button>
											<button onclick={(e) => { e.stopPropagation(); clonePolygon(p); }} class="text-xs text-gray-400 hover:text-gray-600 transition flex-shrink-0">📋</button>
											<button onclick={(e) => { e.stopPropagation(); showPolygonOnMap(p); }} class="text-xs text-blue-500 hover:text-blue-700 transition flex-shrink-0">👁️</button>
										</div>
										<div class="text-xs text-gray-400">{p.coordinates?.length || 0} points</div>
									</div>
									<span class="w-3 h-3 rounded-full" style={`background-color:${p.color || '#6366f1'}`}></span>
									<button onclick={(e) => { e.stopPropagation(); fetch(API_BASE + 'admin/polygons/' + p.id, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ active: !p.active }) }).then(() => loadSavedPolygons()); }} class={`text-sm transition flex-shrink-0 w-6 h-6 flex items-center justify-center rounded-full border-2 ${p.active ? 'bg-green-500 text-white border-green-500' : 'border-gray-300 text-gray-400 hover:border-gray-500'}`}>{p.active ? '✓' : ''}</button>
								</label>
							{/each}
						{/if}
					</div>
					<div class="px-4 py-2 bg-gray-50 border-t border-gray-200 flex items-center justify-between">
						<span class="text-xs text-gray-500">{selectedPolygonIds.size} of {savedPolygons.length} selected</span>
						<div class="flex gap-2">
							<button onclick={() => (selectedPolygonIds = new Set(savedPolygons.map((p) => p.id)))} class="text-xs text-blue-600 hover:text-blue-700 font-medium">Select All</button>
							<button onclick={() => (selectedPolygonIds = new Set())} class="text-xs text-gray-500 hover:text-gray-700 font-medium">Clear</button>
							{#if selectedPolygonIds.size > 0}<button onclick={deleteSelectedPolygons} class="text-xs text-red-600 hover:text-red-700 font-medium">Delete Selected</button>{/if}
						</div>
					</div>
				</div>
			</div>
		{/if}
	</main>
</div>
