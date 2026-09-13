<script lang="ts">
	import { onMount } from 'svelte';
	import API_BASE from '$lib/api';

	let { brandId, brand } = $props();

	let locations = $state<any[]>([]);
	let expandedLocation = $state<string | null>(null);
	let showCreateLocation = $state(false);
	let removingAll = $state(false);
	let editingLocation = $state<any | null>(null);
	let editForm = $state<any>({ hours: {} });

	$effect(() => {
		if (!editingLocation) return;
		const onKey = (e: KeyboardEvent) => {
			if (e.key === 'Escape') {
				editingLocation = null;
				editForm = { hours: {} };
			}
		};
		window.addEventListener('keydown', onKey);
		return () => window.removeEventListener('keydown', onKey);
	});

	$effect(() => {
		if (!showCreateLocation) return;
		const onKey = (e: KeyboardEvent) => {
			if (e.key === 'Escape') showCreateLocation = false;
		};
		window.addEventListener('keydown', onKey);
		return () => window.removeEventListener('keydown', onKey);
	});

	let newLocation = $state<any>({
		name: '',
		storeNumber: '',
		address: '',
		city: '',
		state: '',
		zipCode: '',
		country: 'US',
		latitude: 0,
		longitude: 0,
		phone: '',
		email: '',
		deliveryRadius: 5,
		deliveryEnabled: true,
		pickupEnabled: true,
		isActive: true,
		zone: ''
	});

	// address autocomplete
	let suggestions = $state<any[]>([]);
	let showSuggestions = $state(false);
	let isFetchingSuggestions = $state(false);

	// Google Places fetcher
	let gfGmapsUrl = $state(
		`https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(brand?.name || 'Pizza Hut')}+in+Washington+DC&key=AIzaSyDMv-wxsTMTEAgpYFpUwv1vA4KzXpZIV2E`
	);
	let gfResults = $state<any[] | null>(null);
	let gfLoading = $state(false);
	let gfError = $state<string | null>(null);
	let gfSelectedIds = $state(new Set<string>());
	let gfExistingLocations = $state<any[]>([]);
	let gfShowRaw = $state(false);
	let gfAdding = $state(false);
	let gfAddStatus = $state<{ success: number; failed: number; skipped: number; total: number } | null>(null);
	let gfSearchFilter = $state('');
	let gfFilteredPlaces = $state<any[]>([]);

	function lid(loc: any) {
		return loc.id || loc._id;
	}

	// ── Interactive map with green/red markers (replicating U-DO) ──
	const GREEN_PIN = 'https://maps.google.com/mapfiles/ms/icons/green-dot.png';
	const RED_PIN = 'https://maps.google.com/mapfiles/ms/icons/red-dot.png';
	let mapEl = $state<HTMLDivElement>();
	let gmap: any = null;
	let gmapMarkers: any[] = [];
	let gmapApiPromise: Promise<void> | null = null;

	function loadGmapApi(): Promise<void> {
		if ((window as any).google?.maps?.Marker) return Promise.resolve();
		if (gmapApiPromise) return gmapApiPromise;
		gmapApiPromise = new Promise((resolve, reject) => {
			const key = 'AIzaSyDTm4xeMjg5_GFa2YYUE6zsk2-vagqlAno';
			(window as any).__SU_GMAP_CB = () => resolve();
			const s = document.createElement('script');
			s.src = `https://maps.googleapis.com/maps/api/js?key=${key}&callback=__SU_GMAP_CB`;
			s.async = true;
			s.onerror = () => reject(new Error('Failed to load Google Maps'));
			document.head.appendChild(s);
		});
		return gmapApiPromise;
	}

	function placePos(place: any) {
		const gl = place?.geometry?.location;
		if (!gl) return null;
		return {
			lat: typeof gl.lat === 'function' ? gl.lat() : gl.lat,
			lng: typeof gl.lng === 'function' ? gl.lng() : gl.lng
		};
	}

	function firstLocationCenter() {
		const loc = locations[0];
		if (loc?.latitude && loc?.longitude) return { lat: loc.latitude, lng: loc.longitude };
		const p = (gfResults || []).find((x) => x.geometry?.location);
		if (p) return placePos(p) || { lat: 38.9, lng: -77.0 };
		return { lat: 38.9, lng: -77.0 };
	}

	async function initMap() {
		if (!mapEl) return;
		await loadGmapApi();
		gmap = new (window as any).google.maps.Map(mapEl, { center: firstLocationCenter(), zoom: 13 });
		renderMarkers();
	}

	function renderMarkers() {
		if (!gmap) return;
		gmapMarkers.forEach((m) => m.setMap(null));
		gmapMarkers = [];
		for (const loc of locations) {
			if (!loc.latitude || !loc.longitude) continue;
			const m = new (window as any).google.maps.Marker({
				position: { lat: loc.latitude, lng: loc.longitude },
				map: gmap,
				title: loc.name || '',
				icon: GREEN_PIN
			});
			gmapMarkers.push(m);
		}
		for (const p of gfFilteredPlaces || []) {
			if (gfIsExistingPlace(p)) continue;
			const pos = placePos(p);
			if (!pos) continue;
			const m = new (window as any).google.maps.Marker({
				position: pos,
				map: gmap,
				title: p.name || '',
				icon: RED_PIN
			});
			gmapMarkers.push(m);
		}
		if (gmapMarkers.length > 0) {
			const bounds = new (window as any).google.maps.LatLngBounds();
			gmapMarkers.forEach((m) => bounds.extend(m.getPosition()));
			fitMap(bounds);
		}
	}

	function fitMap(bounds: any) {
		// Ensure the container is laid out and the map has real dimensions before fitting,
		// otherwise fitBounds is a no-op and markers fall off-screen.
		(window as any).google.maps.event.trigger(gmap, 'resize');
		requestAnimationFrame(() => {
			gmap.fitBounds(bounds, 291);
			// Refit once tiles finish so all markers are visible (avoids truncated view).
			(window as any).google.maps.event.addListenerOnce(gmap, 'idle', () => {
				gmap.fitBounds(bounds, 291);
			});
		});
	}

	$effect(() => {
		// Refit when the window resizes so markers stay in view.
		function onResize() {
			if (!gmap || gmapMarkers.length === 0) return;
			const b = new (window as any).google.maps.LatLngBounds();
			gmapMarkers.forEach((m) => b.extend(m.getPosition()));
			fitMap(b);
		}
		window.addEventListener('resize', onResize);
		return () => window.removeEventListener('resize', onResize);
	});

	$effect(() => {
		if (mapEl && !gmap) {
			initMap();
		}
	});

	$effect(() => {
		const _locs = locations;
		const _places = gfFilteredPlaces;
		if (gmap) renderMarkers();
	});

	function dayName(day: string) {
		return ({ monday: 'Mon', tuesday: 'Tue', wednesday: 'Wed', thursday: 'Thu', friday: 'Fri', saturday: 'Sat', sunday: 'Sun' } as Record<string, string>)[day] || day;
	}

	function anyOf(v: any): any {
		return v;
	}

	$effect(() => {
		const q = gfSearchFilter.toLowerCase().trim();
		gfFilteredPlaces = q ? (gfResults || []).filter((p) => p.name?.toLowerCase().includes(q) || p.formatted_address?.toLowerCase().includes(q)) : (gfResults || []);
	});

	async function fetchLocations() {
		try {
			const res = await fetch(API_BASE + `brands/${brandId}/locations`);
			const data = await res.json();
			locations = Array.isArray(data) ? data : (data?.data && Array.isArray(data.data) ? data.data : []);
			gfExistingLocations = locations;
		} catch {
			locations = [];
		}
	}

	async function createLocation(e: SubmitEvent) {
		e.preventDefault();
		const res = await fetch(API_BASE + `admin/brands/${brandId}/locations`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(newLocation)
		});
		if (res.ok) {
			showCreateLocation = false;
			newLocation = {
				name: '', storeNumber: '', address: '', city: '', state: '', zipCode: '',
				country: 'US', latitude: 0, longitude: 0, phone: '', email: '',
				deliveryRadius: 5, deliveryEnabled: true, pickupEnabled: true, isActive: true, zone: ''
			};
			fetchLocations();
		} else {
			const d = await res.json();
			alert('Failed to create location: ' + (d.message || d.error || 'Unknown error'));
		}
	}

	async function updateLocation(e: SubmitEvent) {
		e.preventDefault();
		const res = await fetch(API_BASE + `admin/locations/${lid(editingLocation)}`, {
			method: 'PUT',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(editForm)
		});
		if (res.ok) {
			editingLocation = null;
			editForm = { hours: {} };
			fetchLocations();
		} else {
			const d = await res.json();
			alert('Failed to update location: ' + (d.message || d.error || 'Unknown error'));
		}
	}

	async function toggleLocation(loc: any, field: string) {
		const res = await fetch(API_BASE + `admin/locations/${lid(loc)}`, {
			method: 'PUT',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ [field]: !loc[field] })
		});
		if (res.ok) fetchLocations();
	}

	async function deleteLocation(id: string) {
		if (!confirm('Delete this location?')) return;
		const res = await fetch(API_BASE + `admin/locations/${id}`, { method: 'DELETE' });
		if (res.ok) fetchLocations();
	}

	async function handleRemoveAll() {
		if (!confirm(`Remove all ${locations.length} locations for this brand? This cannot be undone.`)) return;
		removingAll = true;
		try {
			const res = await fetch(API_BASE + `admin/brands/${brandId}/locations`, { method: 'DELETE' });
			if (res.ok) fetchLocations();
		} catch {}
		removingAll = false;
	}

	function startEdit(loc: any) {
		editingLocation = loc;
		editForm = {
			name: loc.name || '',
			storeNumber: loc.storeNumber || '',
			address: loc.address || '',
			city: loc.city || '',
			state: loc.state || '',
			zipCode: loc.zipCode || '',
			country: loc.country || 'US',
			latitude: loc.latitude || 0,
			longitude: loc.longitude || 0,
			phone: loc.phone || '',
			email: loc.email || '',
			deliveryRadius: loc.deliveryRadius || 5,
			deliveryEnabled: loc.deliveryEnabled !== undefined ? loc.deliveryEnabled : true,
			pickupEnabled: loc.pickupEnabled !== undefined ? loc.pickupEnabled : true,
			isActive: loc.isActive !== undefined ? loc.isActive : true,
			zone: loc.zone || '',
			hours: loc.hours || {}
		};
	}

	function setHours(day: string, patch: any) {
		editForm = { ...editForm, hours: { ...editForm.hours, [day]: { ...(editForm.hours[day] || {}), ...patch } } };
	}

	// ── Google Places autocomplete for address ──
	async function handleAddressChange(val: string) {
		newLocation = { ...newLocation, address: val };
		if (!val.trim()) { suggestions = []; showSuggestions = false; return; }
		isFetchingSuggestions = true;
		try {
			const res = await fetch(API_BASE + `autocomplete?query=${encodeURIComponent(val)}`);
			const data = await res.json();
			const list = Array.isArray(data.predictions) ? data.predictions : Array.isArray(data) ? data : [];
			suggestions = list.map((p: any) => ({ placeId: p.place_id, description: p.description || p.formatted_address || '' }));
			showSuggestions = suggestions.length > 0;
		} catch { suggestions = []; }
		isFetchingSuggestions = false;
	}

	function handleSuggestionSelect(s: any) {
		newLocation = { ...newLocation, address: s.description };
		showSuggestions = false;
	}

	// ── Google Places Fetcher ──
	async function gfFetchLocations() {
		gfLoading = true;
		gfError = null;
		gfResults = null;
		gfSelectedIds = new Set();
		gfShowRaw = false;
		gfAddStatus = null;
		const m = gfGmapsUrl.match(/[?&]query=([^&]+)/);
		const q = m ? decodeURIComponent(m[1].replace(/\+/g, ' ')) : '';
		if (!q) {
			gfError = 'Could not find query parameter in the URL.';
			gfLoading = false;
			return;
		}
		try {
			const res = await fetch(`${API_BASE}brands/${brandId}/locations/fetch-google`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ query: q })
			});
			const data = await res.json();
			if (res.ok) {
				gfResults = data.results || [];
				await fetchLocations();
				const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
				const existingIds = new Set<string>();
				for (const place of gfResults || []) {
					const placeAddr = normalize(place.formatted_address);
					const exists = gfExistingLocations.some((loc) => {
						const locAddr = normalize([loc.address, loc.city, loc.state, loc.zipCode].filter(Boolean).join(' '));
						return locAddr && (placeAddr.includes(locAddr) || locAddr.includes(placeAddr));
					});
					if (exists) existingIds.add(place.place_id);
				}
				gfSelectedIds = existingIds;
			} else {
				gfError = data.error || data.message || `HTTP ${res.status}: Request failed`;
			}
		} catch (err: any) {
			gfError = err.message || 'Network error';
		} finally {
			gfLoading = false;
		}
	}

	function gfParseAddressParts(formatted: string) {
		const parts = formatted.split(',').map((s) => s.trim());
		let city = '', state = '', zip = '', country = 'US';
		if (parts.length >= 2) {
			const last = parts[parts.length - 1];
			if (/^[A-Z]{2}$/.test(last) || /^US[AS]?$/.test(last)) country = last;
			const stateZip = parts[parts.length - 2] || '';
			const cityPart = parts[parts.length - 3] || '';
			const m = stateZip.match(/^([A-Z]{2})\s+(\d{5}(?:-\d{4})?)?$/);
			if (m) { state = m[1]; zip = m[2] || ''; city = cityPart; }
			else if (/^[A-Z]{2}$/.test(stateZip)) { state = stateZip; city = cityPart; }
			else { city = stateZip; }
		}
		return { city, state, zip, country };
	}

	function gfIsExistingPlace(place: any) {
		const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
		const placeAddr = normalize(place.formatted_address);
		return gfExistingLocations.some((loc) => {
			const locAddr = normalize([loc.address, loc.city, loc.state, loc.zipCode].filter(Boolean).join(' '));
			return locAddr && (placeAddr.includes(locAddr) || locAddr.includes(placeAddr));
		});
	}

	function gfToggleSelected(placeId: string) {
		const next = new Set(gfSelectedIds);
		if (next.has(placeId)) next.delete(placeId);
		else next.add(placeId);
		gfSelectedIds = next;
	}

	function gfSelectAll() {
		gfSelectedIds = new Set((gfFilteredPlaces || []).filter((p) => !gfIsExistingPlace(p)).map((p) => p.place_id));
	}

	function gfPlaceBody(place: any) {
		const a = gfParseAddressParts(place.formatted_address);
		return {
			name: place.name,
			address: place.formatted_address,
			city: a.city,
			state: a.state,
			zipCode: a.zip,
			country: a.country,
			latitude: place.geometry?.location?.lat || 0,
			longitude: place.geometry?.location?.lng || 0,
			deliveryEnabled: true,
			pickupEnabled: true,
			isActive: true,
			deliveryRadius: 5
		};
	}

	async function gfAddPlaces(places: any[]) {
		let success = 0, failed = 0;
		for (const place of places) {
			try {
				const res = await fetch(API_BASE + `admin/brands/${brandId}/locations`, {
					method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(gfPlaceBody(place))
				});
				if (res.ok || res.status === 409) success++; else failed++;
			} catch { failed++; }
		}
		return { success, failed };
	}

	async function gfAddSelectedToDB() {
		if (gfSelectedIds.size === 0) return;
		gfAdding = true;
		gfAddStatus = null;
		const selected = gfResults?.filter((p) => gfSelectedIds.has(p.place_id) && !gfIsExistingPlace(p)) || [];
		const skipped = gfResults?.filter((p) => gfSelectedIds.has(p.place_id) && gfIsExistingPlace(p)).length || 0;
		const { success, failed } = await gfAddPlaces(selected);
		gfAddStatus = { success, failed, skipped, total: selected.length + skipped };
		if (failed > 0) { gfAdding = false; return; }
		gfSelectedIds = new Set();
		await fetchLocations();
		gfAdding = false;
	}

	async function gfAddAllToDB() {
		gfAdding = true;
		gfAddStatus = null;
		const toAdd = (gfResults || []).filter((p) => !gfIsExistingPlace(p));
		const skipped = (gfResults || []).length - toAdd.length;
		const { success, failed } = await gfAddPlaces(toAdd);
		gfAddStatus = { success, failed, skipped, total: toAdd.length + skipped };
		if (failed > 0) { gfAdding = false; return; }
		gfSelectedIds = new Set();
		await fetchLocations();
		gfAdding = false;
	}

	async function gfCopy() {
		if (navigator.clipboard) await navigator.clipboard.writeText(JSON.stringify(gfResults, null, 2));
	}

	// light JSON syntax highlight
	function gfHighlight(json: string) {
		return json
			.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
			.replace(/("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+-]?\d+)?)/g, (match) => {
				let cls = 'text-amber-500';
				if (/^"/.test(match)) cls = /:$/.test(match) ? 'text-sky-500' : 'text-emerald-600';
				else if (/true|false/.test(match)) cls = 'text-purple-500';
				else if (/null/.test(match)) cls = 'text-gray-400';
				return `<span style="color:${cls}">${match}</span>`;
			});
	}

	onMount(() => fetchLocations());
</script>

<div>
	<!-- Top bar -->
	<div class="flex items-center justify-between mb-4 flex-wrap gap-2">
		<p class="text-sm text-gray-500">{locations.length} location{locations.length !== 1 ? 's' : ''}</p>
		<div class="flex gap-2 flex-wrap">
			<button onclick={handleRemoveAll} disabled={locations.length === 0 || removingAll} class="bg-red-600 text-white px-3 py-1.5 rounded-lg hover:bg-red-700 disabled:opacity-50 text-xs font-medium">{removingAll ? 'Removing...' : '🗑 Remove All Locs'}</button>
			<button onclick={() => (showCreateLocation = true)} class="bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700 text-xs font-medium">+ Add Location</button>
			<button onclick={gfFetchLocations} class="bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-1.5 rounded-lg text-xs font-medium">Fetch Locations → Misc</button>
		</div>
	</div>

	{#if locations.length === 0}
		<div class="text-center py-12 text-gray-400 bg-white rounded-xl border border-gray-200">
			<p class="text-2xl mb-2">📍</p>
			<p>No locations yet. Add the first store location!</p>
		</div>
	{:else}
		<div class="space-y-3">
			{#each locations as loc (lid(loc))}
				<div class="bg-white rounded-xl border border-gray-200 overflow-hidden">
					<div class="p-4 cursor-pointer hover:bg-gray-50 flex items-center justify-between" onclick={() => (expandedLocation = expandedLocation === lid(loc) ? null : lid(loc))}>
						<div class="flex items-center gap-3">
							<div class={`w-3 h-3 rounded-full ${loc.isActive ? 'bg-green-500' : 'bg-gray-400'}`} />
							<div>
								<h4 class="font-semibold text-gray-900 text-sm">{loc.name}</h4>
								<p class="text-xs text-gray-500">{loc.address}, {loc.city}{loc.state ? `, ${loc.state}` : ''}</p>
							</div>
						</div>
						<div class="flex items-center gap-2">
							{#if loc.deliveryEnabled}<span class="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full">Delivery</span>{/if}
							{#if loc.pickupEnabled}<span class="text-xs bg-emerald-50 text-emerald-600 px-2 py-0.5 rounded-full">Pickup</span>{/if}
							<span class="text-gray-400 text-xs">{expandedLocation === lid(loc) ? '▲' : '▼'}</span>
						</div>
					</div>

					{#if expandedLocation === lid(loc)}
						<div class="border-t border-gray-100 p-4 space-y-4">
							<div class="flex gap-2 flex-wrap">
								<button onclick={() => toggleLocation(loc, 'isActive')} class={`px-3 py-1.5 rounded-lg text-xs font-medium ${loc.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{loc.isActive ? '🟢 Online' : '🔴 Offline'}</button>
								<button onclick={() => toggleLocation(loc, 'deliveryEnabled')} class={`px-3 py-1.5 rounded-lg text-xs font-medium ${loc.deliveryEnabled ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-500'}`}>Delivery: {loc.deliveryEnabled ? 'ON' : 'OFF'}</button>
								<button onclick={() => toggleLocation(loc, 'pickupEnabled')} class={`px-3 py-1.5 rounded-lg text-xs font-medium ${loc.pickupEnabled ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>Pickup: {loc.pickupEnabled ? 'ON' : 'OFF'}</button>
								<button onclick={() => startEdit(loc)} class="px-3 py-1.5 rounded-lg text-xs font-medium bg-blue-50 text-blue-600 hover:bg-blue-100">✏️ Edit</button>
								<button onclick={() => deleteLocation(lid(loc))} class="px-3 py-1.5 rounded-lg text-xs font-medium bg-red-50 text-red-600 hover:bg-red-100">🗑 Delete</button>
							</div>
							<div class="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
								<div><span class="text-gray-400">Store #</span><br /><span class="font-medium">{loc.storeNumber || '—'}</span></div>
								<div><span class="text-gray-400">Phone</span><br /><span class="font-medium">{loc.phone || '—'}</span></div>
								<div><span class="text-gray-400">Zone</span><br /><span class="font-medium">{loc.zone || '—'}</span></div>
								<div><span class="text-gray-400">Radius</span><br /><span class="font-medium">{loc.deliveryRadius} mi</span></div>
							</div>
							{#if loc.hours}
								<div>
									<p class="text-xs font-medium text-gray-700 mb-1">Hours</p>
									<div class="grid grid-cols-7 gap-1">
									{#each Object.entries(loc.hours || {}) as [day, hrs] (day)}
										{@const hours = anyOf(hrs)}
										<div class="text-center text-xs">
											<div class="font-medium text-gray-600">{dayName(day)}</div>
											{#if hours.closed}<div class="text-red-400">Closed</div>{:else}<div class="text-gray-500">{hours.open}–{hours.close}</div>{/if}
										</div>
									{/each}
									</div>
								</div>
							{/if}
							<div>
								<p class="text-xs font-medium text-gray-700 mb-1">Blacklisted Items ({loc.blacklistedItemIds?.length || 0})</p>
								{#if loc.blacklistedItemIds?.length > 0}
									<div class="flex flex-wrap gap-1">
										{#each loc.blacklistedItemIds as id}<span class="text-xs bg-red-50 text-red-600 px-2 py-0.5 rounded-full">{id}</span>{/each}
									</div>
								{:else}
									<p class="text-xs text-gray-400">No blacklisted items</p>
								{/if}
							</div>
						</div>
					{/if}
				</div>
			{/each}
		</div>
	{/if}

	<!-- Edit Location Modal -->
	{#if editingLocation}
		<div class="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onclick={() => { editingLocation = null; editForm = { hours: {} }; }}>
			<div class="bg-white rounded-2xl p-6 w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto" onclick={(e) => e.stopPropagation()}>
				<h2 class="text-lg font-bold text-gray-900 mb-4">Edit Location</h2>
				<form onsubmit={updateLocation} class="space-y-3">
					<div class="grid grid-cols-2 gap-3">
						<div><label class="text-xs font-medium text-gray-600">Store Name *</label><input type="text" required bind:value={editForm.name} class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm mt-1" /></div>
						<div><label class="text-xs font-medium text-gray-600">Store #</label><input type="text" bind:value={editForm.storeNumber} class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm mt-1" /></div>
					</div>
					<div><label class="text-xs font-medium text-gray-600">Address *</label><input type="text" required bind:value={editForm.address} class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm mt-1" /></div>
					<div class="grid grid-cols-3 gap-3">
						<div><label class="text-xs font-medium text-gray-600">City *</label><input type="text" required bind:value={editForm.city} class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm mt-1" /></div>
						<div><label class="text-xs font-medium text-gray-600">State</label><input type="text" bind:value={editForm.state} class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm mt-1" /></div>
						<div><label class="text-xs font-medium text-gray-600">Zip</label><input type="text" bind:value={editForm.zipCode} class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm mt-1" /></div>
					</div>
					<div class="grid grid-cols-2 gap-3">
						<div><label class="text-xs font-medium text-gray-600">Latitude *</label><input type="number" step="any" required bind:value={editForm.latitude} class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm mt-1" /></div>
						<div><label class="text-xs font-medium text-gray-600">Longitude *</label><input type="number" step="any" required bind:value={editForm.longitude} class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm mt-1" /></div>
					</div>
					<div class="grid grid-cols-2 gap-3">
						<div><label class="text-xs font-medium text-gray-600">Phone</label><input type="text" bind:value={editForm.phone} class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm mt-1" /></div>
						<div><label class="text-xs font-medium text-gray-600">Delivery Radius (mi)</label><input type="number" step="0.5" bind:value={editForm.deliveryRadius} class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm mt-1" /></div>
					</div>
					<div class="grid grid-cols-2 gap-3">
						<div><label class="text-xs font-medium text-gray-600">Zone</label><input type="text" bind:value={editForm.zone} class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm mt-1" /></div>
						<div><label class="text-xs font-medium text-gray-600">Email</label><input type="text" bind:value={editForm.email} class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm mt-1" /></div>
					</div>
					<div class="flex gap-3 pt-1">
						<button type="button" onclick={() => (editForm = { ...editForm, deliveryEnabled: !editForm.deliveryEnabled })} class={`px-3 py-1.5 rounded-lg text-xs font-medium ${editForm.deliveryEnabled ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-500'}`}>Delivery: {editForm.deliveryEnabled ? 'ON' : 'OFF'}</button>
						<button type="button" onclick={() => (editForm = { ...editForm, pickupEnabled: !editForm.pickupEnabled })} class={`px-3 py-1.5 rounded-lg text-xs font-medium ${editForm.pickupEnabled ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>Pickup: {editForm.pickupEnabled ? 'ON' : 'OFF'}</button>
						<button type="button" onclick={() => (editForm = { ...editForm, isActive: !editForm.isActive })} class={`px-3 py-1.5 rounded-lg text-xs font-medium ${editForm.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{editForm.isActive ? '🟢 Online' : '🔴 Offline'}</button>
					</div>
					<div class="pt-2">
						<p class="text-xs font-medium text-gray-600 mb-2">Operating Hours</p>
						{#each ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] as day}
							{@const dh = editForm.hours?.[day] || {}}
							<div class="flex items-center gap-2 mb-1.5">
								<span class="text-xs font-medium text-gray-600 w-16 capitalize">{dayName(day)}</span>
								<label class="flex items-center gap-1 text-xs text-gray-500">
									<input type="checkbox" checked={dh.closed || false} onchange={(e) => setHours(day, { closed: (e.currentTarget as HTMLInputElement).checked })} />
									Closed
								</label>
								{#if !dh.closed}
									<input type="text" placeholder="09:00" value={dh.open || ''} oninput={(e) => setHours(day, { open: (e.currentTarget as HTMLInputElement).value })} class="border border-gray-300 rounded px-2 py-1 text-xs w-20" />
									<span class="text-xs text-gray-400">to</span>
									<input type="text" placeholder="22:00" value={dh.close || ''} oninput={(e) => setHours(day, { close: (e.currentTarget as HTMLInputElement).value })} class="border border-gray-300 rounded px-2 py-1 text-xs w-20" />
								{/if}
							</div>
						{/each}
					</div>
					<div class="flex gap-2 pt-2">
						<button type="submit" class="flex-1 bg-violet-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-violet-700">Save Changes</button>
						<button type="button" onclick={() => { editingLocation = null; editForm = { hours: {} }; }} class="flex-1 bg-gray-100 text-gray-700 py-2 rounded-lg text-sm font-medium hover:bg-gray-200">Cancel</button>
					</div>
				</form>
			</div>
		</div>
	{/if}

	<!-- Create Location Modal -->
	{#if showCreateLocation}
		<div class="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onclick={() => (showCreateLocation = false)}>
			<div class="bg-white rounded-2xl p-6 w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto" onclick={(e) => e.stopPropagation()}>
				<h2 class="text-lg font-bold text-gray-900 mb-4">Add Location</h2>
				<form onsubmit={createLocation} class="space-y-3">
					<div class="grid grid-cols-2 gap-3">
						<div><label class="text-xs font-medium text-gray-600">Store Name *</label><input type="text" required bind:value={newLocation.name} class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm mt-1" /></div>
						<div><label class="text-xs font-medium text-gray-600">Store #</label><input type="text" bind:value={newLocation.storeNumber} class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm mt-1" /></div>
					</div>
					<div class="relative">
						<label class="text-xs font-medium text-gray-600">Address * <span class="text-gray-400 font-normal">(start typing for suggestions)</span></label>
						<input type="text" required value={newLocation.address} oninput={(e) => handleAddressChange((e.currentTarget as HTMLInputElement).value)} onfocus={() => { if (suggestions.length > 0) showSuggestions = true; }} class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm mt-1 pr-10" placeholder="123 Main St, City, State ZIP" autocomplete="off" />
						{#if isFetchingSuggestions}<span class="absolute right-3 top-1/2 mt-0.5 -translate-y-1/2 text-xs text-blue-500">⏳</span>{/if}
						{#if showSuggestions && suggestions.length > 0}
							<div class="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg max-h-60 overflow-y-auto">
								{#each suggestions as s, i}
									<button type="button" onclick={() => handleSuggestionSelect(s)} class="w-full text-left px-4 py-3 hover:bg-blue-50 border-b border-gray-50 last:border-0 transition text-sm text-gray-700">{s.description}</button>
								{/each}
							</div>
						{/if}
					</div>
					<div class="grid grid-cols-3 gap-3">
						<div><label class="text-xs font-medium text-gray-600">City *</label><input type="text" required bind:value={newLocation.city} class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm mt-1" /></div>
						<div><label class="text-xs font-medium text-gray-600">State</label><input type="text" bind:value={newLocation.state} class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm mt-1" /></div>
						<div><label class="text-xs font-medium text-gray-600">Zip</label><input type="text" bind:value={newLocation.zipCode} class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm mt-1" /></div>
					</div>
					<div class="grid grid-cols-2 gap-3">
						<div><label class="text-xs font-medium text-gray-600">Latitude *</label><input type="number" step="any" required bind:value={newLocation.latitude} class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm mt-1" /></div>
						<div><label class="text-xs font-medium text-gray-600">Longitude *</label><input type="number" step="any" required bind:value={newLocation.longitude} class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm mt-1" /></div>
					</div>
					<div class="grid grid-cols-2 gap-3">
						<div><label class="text-xs font-medium text-gray-600">Phone</label><input type="text" bind:value={newLocation.phone} class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm mt-1" /></div>
						<div><label class="text-xs font-medium text-gray-600">Delivery Radius (mi)</label><input type="number" step="0.5" bind:value={newLocation.deliveryRadius} class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm mt-1" /></div>
					</div>
					<div class="flex gap-2 pt-2">
						<button type="submit" class="flex-1 bg-blue-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-blue-700">Create Location</button>
						<button type="button" onclick={() => (showCreateLocation = false)} class="flex-1 bg-gray-100 text-gray-700 py-2 rounded-lg text-sm font-medium hover:bg-gray-200">Cancel</button>
					</div>
				</form>
			</div>
		</div>
	{/if}

	<!-- Google Places Fetcher -->
	<div class="mt-10 space-y-6">
		<div class="bg-white rounded-xl border border-gray-200 p-5">
			<h3 class="font-semibold text-gray-900 mb-3">🔧 Google Places Fetcher</h3>
			<label class="text-xs font-semibold text-gray-600 mb-1 block">Google Places Text Search URL-LT</label>
			<textarea bind:value={gfGmapsUrl} rows={3} class="w-full border border-gray-300 rounded-lg px-3 py-2 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-orange-400 resize-none"></textarea>
			<p class="text-xs text-gray-400 mt-1">Edit the query parameters as needed.</p>
			<div class="flex justify-end mt-3">
				<button onclick={gfFetchLocations} disabled={gfLoading} class="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold px-4 py-2 rounded-lg transition flex items-center gap-2">
					{#if gfLoading}<svg class="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path></svg>{/if}
					{gfLoading ? 'Fetching...' : 'Fetch Locations'}
				</button>
			</div>
		</div>

		{#if gfLoading}
			<div class="bg-white rounded-xl border border-gray-200 p-5 text-center text-sm text-gray-500">
				<div class="flex items-center justify-center gap-2">
					<svg class="animate-spin w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path></svg>
					Fetching locations from Google Places...
				</div>
			</div>
		{/if}

		{#if gfError}
			<div class="bg-red-50 border border-red-200 rounded-xl p-4">
				<div class="text-xs font-bold text-red-600 mb-1">Request Failed</div>
				<div class="text-xs text-red-500">{gfError}</div>
			</div>
		{/if}

		{#if gfAddStatus}
			<div class={`rounded-xl p-4 ${gfAddStatus.failed === 0 ? 'bg-green-50 border border-green-200' : 'bg-yellow-50 border border-yellow-200'}`}>
				<div class={`text-xs font-bold mb-1 ${gfAddStatus.failed === 0 ? 'text-green-600' : 'text-yellow-600'}`}>{gfAddStatus.failed === 0 ? '✅ All locations added' : '⚠️ Some locations failed'}</div>
				<div class="text-xs text-gray-600">Added {gfAddStatus.success} of {gfAddStatus.total} — {gfAddStatus.failed} failed.{gfAddStatus.skipped > 0 ? ` ${gfAddStatus.skipped} already in DB.` : ''}</div>
			</div>
		{/if}

		{#if gfResults && gfResults.length > 0}
			<div class="bg-white rounded-xl border border-gray-200 overflow-hidden">
				<div class="flex items-center justify-between px-4 py-3 bg-gray-50 border-b border-gray-200 flex-wrap gap-2">
					<div>
						<span class="text-sm font-semibold text-gray-700">Results</span>
						<span class="ml-2 text-xs text-gray-400">{gfSearchFilter ? `${gfFilteredPlaces.length} of ${gfResults.length} found` : `${gfResults.length} found`}</span>
					</div>
					<div class="flex items-center gap-2">
						<button onclick={gfSelectAll} class="text-xs text-blue-600 hover:text-blue-700 font-medium">Select All</button>
						<button onclick={() => (gfSelectedIds = new Set())} class="text-xs text-gray-500 hover:text-gray-700 font-medium">Clear</button>
					</div>
				</div>
				<div class="px-4 py-2 border-b border-gray-100">
					<input type="text" bind:value={gfSearchFilter} placeholder="Filter results by name or address..." class="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-400" />
				</div>
				<div class="divide-y divide-gray-100 max-h-72 overflow-y-auto">
					{#each gfFilteredPlaces as place, idx (place.place_id || idx)}
						{@const existing = gfIsExistingPlace(place)}
						<label class={`flex items-start gap-3 px-4 py-3 ${existing ? '' : 'cursor-pointer hover:bg-gray-50'} transition ${gfSelectedIds.has(place.place_id) ? 'bg-blue-50' : ''}`}>
							<input type="checkbox" checked={gfSelectedIds.has(place.place_id)} disabled={existing} onchange={() => gfToggleSelected(place.place_id)} class="mt-0.5 rounded" />
							<div class="flex-1 min-w-0">
								<div class="text-sm font-medium text-gray-900 truncate">{place.name}</div>
								<div class="text-xs text-gray-500 truncate">{place.formatted_address}</div>
								{#if existing}
									<span class="inline-block mt-1 text-[10px] font-medium px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">✓ Already in DB</span>
								{:else if place.business_status}
									<span class={`inline-block mt-1 text-[10px] font-medium px-2 py-0.5 rounded-full ${place.business_status === 'OPERATIONAL' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>{place.business_status}</span>
								{/if}
							</div>
							<div class="text-xs text-gray-400 flex-shrink-0">{place.geometry?.location?.lat?.toFixed(4)}, {place.geometry?.location?.lng?.toFixed(4)}</div>
						</label>
					{/each}
				</div>
				<div class="px-4 py-3 bg-gray-50 border-t border-gray-200 flex items-center justify-between flex-wrap gap-2">
					<span class="text-xs text-gray-500">{gfSelectedIds.size} of {gfFilteredPlaces.length} selected</span>
					<div class="flex gap-2">
						<button onclick={gfAddAllToDB} disabled={gfAdding || gfFilteredPlaces.length === 0} class="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold px-5 py-2 rounded-lg transition flex items-center gap-2">
							{#if gfAdding}<svg class="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path></svg>{/if}
							{gfAdding ? 'Adding...' : 'Add All to DB'}
						</button>
						<button onclick={gfAddSelectedToDB} disabled={gfAdding || gfSelectedIds.size === 0} class="bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold px-5 py-2 rounded-lg transition flex items-center gap-2">
							{#if gfAdding}<svg class="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path></svg>{/if}
							{gfAdding ? 'Adding...' : 'Add to DB'}
						</button>
					</div>
				</div>
			</div>
		{/if}

		<!-- Raw Response -->
		{#if gfResults}
			<div class="bg-white rounded-xl border border-gray-200 overflow-hidden">
				<button onclick={() => (gfShowRaw = !gfShowRaw)} class="w-full flex items-center justify-between px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 transition">
					<span>Raw Response</span>
					<svg class={`w-4 h-4 transition-transform ${gfShowRaw ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path></svg>
				</button>
				{#if gfShowRaw}
					<div class="border-t border-gray-200">
						<div class="flex items-center justify-between px-4 py-2 bg-gray-50">
							<span class="text-xs text-gray-400">POST /brands/fetch-Locations</span>
							<button onclick={gfCopy} class="text-xs text-gray-500 hover:text-gray-700 flex items-center gap-1">
								<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/></svg>
								Copy
							</button>
						</div>
						<pre class="p-4 text-xs overflow-x-auto bg-white max-h-64 overflow-y-auto"><code>{@html gfHighlight(JSON.stringify(gfResults, null, 2))}</code></pre>
					</div>
				{/if}
			</div>
		{/if}
	</div>

	<div class="mt-6 rounded-xl overflow-hidden border border-gray-200">
		<div bind:this={mapEl} style="width:100%;height:600px"></div>
	</div>
	<div class="bg-white" style="min-height:50vh"></div>
</div>
