<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import API_BASE from '$lib/api';
	import { env } from '$env/dynamic/public';
	import 'mapbox-gl/dist/mapbox-gl.css';
	import '@mapbox/mapbox-gl-draw/dist/mapbox-gl-draw.css';

	type Point = { lat: number; lng: number };
	type Zone = {
		id: string;
		name: string;
		color: string | null;
		active: boolean;
		coordinates: Point[];
		createdAt?: string;
		updatedAt?: string;
	};

	const PALETTE = ['#f59e0b', '#6366f1', '#10b981', '#ef4444', '#3b82f6', '#ec4899', '#8b5cf6', '#14b8a6'];
	const DEFAULT_COLOR = '#3b82f6';
	const DC_CENTER: [number, number] = [-77.0369, 38.9072];

	// Draw styles: each zone is drawn in its own color; inactive zones are faint and dashed.
	// `active` below is Mapbox Draw's own "is selected" flag; our on/off flag is `user_enabled`.
	const colorExpr = ['coalesce', ['get', 'user_color'], DEFAULT_COLOR];
	const DRAW_STYLES = [
		{
			id: 'gf-fill',
			type: 'fill',
			filter: ['all', ['==', '$type', 'Polygon']],
			paint: {
				'fill-color': colorExpr,
				'fill-opacity': [
					'case',
					['==', ['get', 'active'], 'true'], 0.4,
					['==', ['get', 'user_enabled'], 'false'], 0.08,
					0.25
				]
			}
		},
		{
			id: 'gf-line-on',
			type: 'line',
			filter: ['all', ['==', '$type', 'Polygon'], ['!=', 'user_enabled', 'false']],
			layout: { 'line-cap': 'round', 'line-join': 'round' },
			paint: {
				'line-color': colorExpr,
				'line-width': ['case', ['==', ['get', 'active'], 'true'], 3, 2]
			}
		},
		{
			id: 'gf-line-off',
			type: 'line',
			filter: ['all', ['==', '$type', 'Polygon'], ['==', 'user_enabled', 'false']],
			layout: { 'line-cap': 'round', 'line-join': 'round' },
			paint: { 'line-color': '#9ca3af', 'line-width': 2, 'line-dasharray': [2, 2] }
		},
		{
			id: 'gf-line-drawing',
			type: 'line',
			filter: ['all', ['==', '$type', 'LineString']],
			layout: { 'line-cap': 'round', 'line-join': 'round' },
			paint: { 'line-color': '#2563eb', 'line-width': 2, 'line-dasharray': [2, 2] }
		},
		{
			id: 'gf-vertex',
			type: 'circle',
			filter: ['all', ['==', 'meta', 'vertex'], ['==', '$type', 'Point']],
			paint: {
				'circle-radius': 5,
				'circle-color': '#ffffff',
				'circle-stroke-color': '#2563eb',
				'circle-stroke-width': 2
			}
		},
		{
			id: 'gf-midpoint',
			type: 'circle',
			filter: ['all', ['==', 'meta', 'midpoint'], ['==', '$type', 'Point']],
			paint: { 'circle-radius': 3, 'circle-color': '#2563eb' }
		}
	];

	let mapEl: HTMLDivElement;
	let map: any = null;
	let draw: any = null;
	let resizeObserver: ResizeObserver | null = null;

	let zones = $state<Zone[]>([]);
	let loading = $state(true);
	let mapReady = $state(false);
	let drawing = $state(false);
	let selectedId = $state<string | null>(null);
	let message = $state<{ type: 'ok' | 'error'; text: string } | null>(null);
	let messageTimer: ReturnType<typeof setTimeout> | undefined;

	let neighborhoods = $state<any[]>([]);
	let nhQuery = $state('');
	let nhResults = $derived(
		nhQuery.trim().length < 2
			? []
			: neighborhoods
					.filter((f) => f.properties?.name?.toLowerCase().includes(nhQuery.trim().toLowerCase()))
					.slice(0, 8)
	);

	let activeCount = $derived(zones.filter((z) => z.active).length);

	// ── API ──

	async function api(path: string, method = 'GET', body?: unknown) {
		const res = await fetch(API_BASE + path, {
			method,
			headers: { 'Content-Type': 'application/json' },
			body: body === undefined ? undefined : JSON.stringify(body)
		});
		const data = await res.json().catch(() => ({}));
		if (!res.ok) throw new Error(formatError(data) || `Request failed (HTTP ${res.status})`);
		return data;
	}

	function formatError(data: any): string {
		if (!data?.error) return '';
		if (!data.details) return data.error;
		const parts = Object.entries(data.details).map(
			([field, msgs]) => `${field} ${(msgs as string[]).join(', ')}`
		);
		return `${data.error}: ${parts.join('; ')}`;
	}

	function flash(type: 'ok' | 'error', text: string) {
		message = { type, text };
		clearTimeout(messageTimer);
		if (type === 'ok') messageTimer = setTimeout(() => (message = null), 3000);
	}

	// ── Geometry conversion ──
	// Backend: [{lat, lng}, ...] (open ring). Map: GeoJSON [[lng, lat], ...] (closed ring).

	function toRing(points: Point[]): number[][] {
		const ring = points.map((p) => [p.lng, p.lat]);
		const [first, last] = [ring[0], ring[ring.length - 1]];
		if (first && (first[0] !== last[0] || first[1] !== last[1])) ring.push([...first]);
		return ring;
	}

	function fromGeometry(geometry: any): Point[] {
		let ring: number[][] = [];
		if (geometry?.type === 'Polygon') {
			ring = geometry.coordinates[0] ?? [];
		} else if (geometry?.type === 'MultiPolygon') {
			// Use the largest part
			ring = geometry.coordinates
				.map((poly: number[][][]) => poly[0] ?? [])
				.sort((a: number[][], b: number[][]) => b.length - a.length)[0] ?? [];
		}
		const round = (n: number) => Math.round(n * 1e6) / 1e6;
		const points = ring.map(([lng, lat]) => ({ lat: round(lat), lng: round(lng) }));
		const first = points[0];
		const last = points[points.length - 1];
		if (points.length > 1 && first.lat === last.lat && first.lng === last.lng) points.pop();
		return points;
	}

	function toFeature(zone: Zone) {
		return {
			id: zone.id,
			type: 'Feature',
			properties: {
				color: zone.color ?? DEFAULT_COLOR,
				enabled: zone.active ? 'true' : 'false',
				name: zone.name
			},
			geometry: { type: 'Polygon', coordinates: [toRing(zone.coordinates)] }
		};
	}

	function fitZone(zone: Zone) {
		if (!map || zone.coordinates.length === 0) return;
		const lats = zone.coordinates.map((p) => p.lat);
		const lngs = zone.coordinates.map((p) => p.lng);
		map.fitBounds(
			[
				[Math.min(...lngs), Math.min(...lats)],
				[Math.max(...lngs), Math.max(...lats)]
			],
			{ padding: 60, duration: 600 }
		);
	}

	// ── State helpers ──

	function upsertZone(zone: Zone) {
		zones = zones.some((z) => z.id === zone.id)
			? zones.map((z) => (z.id === zone.id ? zone : z))
			: [...zones, zone];
		draw?.add(toFeature(zone)); // same id replaces the drawn feature
	}

	function nextColor() {
		return PALETTE[zones.length % PALETTE.length];
	}

	function nameTaken(name: string, exceptId?: string) {
		return zones.some((z) => z.id !== exceptId && z.name.trim().toLowerCase() === name.trim().toLowerCase());
	}

	// ── Load ──

	async function loadZones() {
		try {
			const data = await api('admin/polygons');
			if (!Array.isArray(data)) {
				throw new Error(`Expected a list of zones from ${API_BASE}admin/polygons but got: ${JSON.stringify(data).slice(0, 200)}`);
			}
			zones = data;
			draw.deleteAll();
			zones.forEach((z) => draw.add(toFeature(z)));
		} catch (e: any) {
			console.error('[Geofencing] load failed:', e);
			flash('error', `Couldn't load zones from ${API_BASE}admin/polygons. ${e.message}`);
		}
	}

	// ── Create ──

	async function createZone(geometry: any, suggestedName: string, tempDrawId?: string) {
		const discardTemp = () => tempDrawId && draw.delete(tempDrawId);

		let name = prompt('Name this zone:', suggestedName);
		if (name === null) return discardTemp();
		name = name.trim() || suggestedName;

		if (nameTaken(name) && !confirm(`A zone named "${name}" already exists. Save another one anyway?`)) {
			return discardTemp();
		}

		const coordinates = fromGeometry(geometry);
		try {
			const saved: Zone = await api('admin/polygons', 'POST', {
				name,
				color: nextColor(),
				active: true,
				coordinates
			});
			discardTemp(); // replaced by the saved zone, which uses the server id
			upsertZone(saved);
			selectZone(saved);
			flash('ok', `Saved "${saved.name}".`);
		} catch (e: any) {
			discardTemp();
			flash('error', `Couldn't save "${name}". ${e.message}`);
		}
	}

	function onDrawCreate(e: any) {
		drawing = false;
		const feature = e.features?.[0];
		if (!feature) return;
		createZone(feature.geometry, `Zone ${zones.length + 1}`, feature.id);
	}

	function addNeighborhood(feature: any) {
		nhQuery = '';
		createZone(feature.geometry, feature.properties?.name || `Zone ${zones.length + 1}`);
	}

	// ── Update ──

	async function updateZone(zone: Zone, changes: Partial<Zone>, successText?: string) {
		try {
			const saved: Zone = await api(`admin/polygons/${zone.id}`, 'PUT', changes);
			upsertZone(saved);
			if (successText) flash('ok', successText);
		} catch (e: any) {
			upsertZone(zone); // put the map back the way it was
			flash('error', `Couldn't update "${zone.name}". ${e.message}`);
		}
	}

	// Fires when a shape is moved or its points are dragged — only for the shapes that changed.
	function onDrawUpdate(e: any) {
		for (const feature of e.features ?? []) {
			const zone = zones.find((z) => z.id === feature.id);
			if (zone) updateZone(zone, { coordinates: fromGeometry(feature.geometry) }, `Updated the shape of "${zone.name}".`);
		}
	}

	function toggleActive(zone: Zone) {
		updateZone(
			zone,
			{ active: !zone.active },
			zone.active ? `Turned off "${zone.name}".` : `Turned on "${zone.name}".`
		);
	}

	function renameZone(zone: Zone) {
		const name = prompt('Rename zone:', zone.name);
		if (name === null || name.trim() === '' || name.trim() === zone.name) return;
		if (nameTaken(name, zone.id) && !confirm(`A zone named "${name.trim()}" already exists. Use this name anyway?`)) return;
		updateZone(zone, { name: name.trim() }, `Renamed to "${name.trim()}".`);
	}

	function setColor(zone: Zone, color: string) {
		if (color !== zone.color) updateZone(zone, { color });
	}

	// ── Delete ──

	async function deleteZone(zone: Zone, skipConfirm = false) {
		if (!skipConfirm && !confirm(`Delete "${zone.name}"? Stores inside it will stop showing for this area.`)) return;
		try {
			await api(`admin/polygons/${zone.id}`, 'DELETE');
			zones = zones.filter((z) => z.id !== zone.id);
			draw.delete(zone.id);
			if (selectedId === zone.id) selectedId = null;
			flash('ok', `Deleted "${zone.name}".`);
		} catch (e: any) {
			draw.add(toFeature(zone));
			flash('error', `Couldn't delete "${zone.name}". ${e.message}`);
		}
	}

	// Fires when a selected shape is deleted from the map with the Delete/Backspace key.
	function onDrawDelete(e: any) {
		const deleted = (e.features ?? [])
			.map((f: any) => zones.find((z) => z.id === f.id))
			.filter(Boolean) as Zone[];
		if (deleted.length === 0) return;

		const names = deleted.map((z) => `"${z.name}"`).join(', ');
		if (!confirm(`Delete ${names}? Stores inside will stop showing for this area.`)) {
			deleted.forEach((z) => draw.add(toFeature(z)));
			return;
		}
		deleted.forEach((z) => deleteZone(z, true));
	}

	// ── Selection & drawing mode ──

	function selectZone(zone: Zone) {
		selectedId = zone.id;
		draw?.changeMode('simple_select', { featureIds: [zone.id] });
		fitZone(zone);
	}

	function onSelectionChange(e: any) {
		selectedId = e.features?.[0]?.id ?? null;
	}

	function onModeChange(e: any) {
		if (e.mode !== 'draw_polygon') drawing = false;
	}

	function toggleDrawing() {
		if (!draw) return;
		if (drawing) {
			draw.changeMode('simple_select');
			drawing = false;
		} else {
			draw.changeMode('draw_polygon');
			drawing = true;
		}
	}

	// ── Map setup ──

	onMount(async () => {
		const token = env.PUBLIC_MAPBOX_TOKEN;
		if (!token) {
			loading = false;
			flash('error', 'Map can’t load: add PUBLIC_MAPBOX_TOKEN to the backoffice .env file and restart the dev server.');
			return;
		}

		const mapboxgl = (await import('mapbox-gl')).default;
		const MapboxDraw = (await import('@mapbox/mapbox-gl-draw')).default;

		mapboxgl.accessToken = token;
		map = new mapboxgl.Map({
			container: mapEl,
			style: 'mapbox://styles/mapbox/streets-v12',
			center: DC_CENTER,
			zoom: 11
		});
		map.addControl(new mapboxgl.NavigationControl(), 'top-right');

		// Keep the map sized to its box (it stays blank if created while the box had no size)
		resizeObserver = new ResizeObserver(() => map?.resize());
		resizeObserver.observe(mapEl);

		// Surface Mapbox problems (bad/restricted token, style failed to load) instead of a blank box
		map.on('error', (e: any) => {
			console.error('[Geofencing] Mapbox error:', e?.error ?? e);
			const status = e?.error?.status;
			if (status === 401 || status === 403) {
				flash('error', `Mapbox rejected the token (HTTP ${status}). Check PUBLIC_MAPBOX_TOKEN and its allowed URLs in the Mapbox dashboard.`);
			}
		});

		draw = new MapboxDraw({ displayControlsDefault: false, userProperties: true, styles: DRAW_STYLES });
		map.addControl(draw);

		map.on('draw.create', onDrawCreate);
		map.on('draw.update', onDrawUpdate);
		map.on('draw.delete', onDrawDelete);
		map.on('draw.selectionchange', onSelectionChange);
		map.on('draw.modechange', onModeChange);

		map.on('load', async () => {
			map.resize();
			await loadZones();
			mapReady = true;
			loading = false;
		});

		fetch('/dc-neighborhoods.json')
			.then((r) => (r.ok ? r.json() : null))
			.then((data) => (neighborhoods = data?.features ?? []))
			.catch(() => (neighborhoods = []));
	});

	onDestroy(() => {
		clearTimeout(messageTimer);
		resizeObserver?.disconnect();
		map?.remove();
		map = null;
		draw = null;
	});
</script>



<div class="flex flex-col gap-4 lg:flex-row">
	<!-- Sidebar -->
	<aside class="flex w-full flex-col gap-4 lg:w-60 lg:shrink-0">
		<div class="rounded-xl border border-gray-200 bg-white p-4">
			<h2 class="text-lg font-bold text-gray-900">Delivery zones</h2>
			<p class="mt-1 text-sm text-gray-500">
				Customers only see stores that have a location inside an active zone.
			</p>

			<button
				type="button"
				onclick={toggleDrawing}
				disabled={!mapReady}
				class="mt-4 w-full rounded-lg px-4 py-2 text-sm font-semibold text-white transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 {drawing
					? 'bg-red-600 hover:bg-red-700 focus-visible:ring-red-500'
					: 'bg-blue-600 hover:bg-blue-700 focus-visible:ring-blue-500'}"
			>
				{drawing ? 'Cancel drawing' : 'Draw a new zone'}
			</button>

			{#if drawing}
				<p class="mt-2 text-xs text-gray-600">
					Click on the map to place points. Click the first point again to finish.
				</p>
			{/if}

			{#if neighborhoods.length > 0}
				<div class="relative mt-4">
					<label for="nh-search" class="text-sm font-medium text-gray-700">Or start from a DC neighborhood</label>
					<input
						id="nh-search"
						type="search"
						bind:value={nhQuery}
						placeholder="e.g. Petworth"
						autocomplete="off"
						class="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
					/>
					{#if nhResults.length > 0}
						<ul class="absolute z-20 mt-1 max-h-64 w-full overflow-auto rounded-lg border border-gray-200 bg-white py-1 shadow-lg">
							{#each nhResults as feature}
								<li>
									<button
										type="button"
										onclick={() => addNeighborhood(feature)}
										class="w-full px-3 py-2 text-left text-sm hover:bg-blue-50 focus:bg-blue-50 focus:outline-none"
									>
										{feature.properties.name}
										{#if feature.properties.borough}
											<span class="text-xs text-gray-400">({feature.properties.borough})</span>
										{/if}
									</button>
								</li>
							{/each}
						</ul>
					{:else if nhQuery.trim().length >= 2}
						<p class="mt-1 text-xs text-gray-500">No neighborhood matches "{nhQuery.trim()}".</p>
					{/if}
					<p class="mt-1 text-xs text-gray-400">Neighborhood shapes are approximate. Adjust the points after adding.</p>
				</div>
			{/if}
		</div>

		{#if message}
			<div
				role="status"
				class="rounded-lg border px-3 py-2 text-sm {message.type === 'ok'
					? 'border-green-200 bg-green-50 text-green-800'
					: 'border-red-200 bg-red-50 text-red-800'}"
			>
				<div class="flex items-start gap-2">
					<span class="flex-1 break-words">{message.text}</span>
					<button type="button" onclick={() => (message = null)} aria-label="Dismiss message" class="shrink-0 font-bold opacity-60 hover:opacity-100">×</button>
				</div>
			</div>
		{/if}

		<div class="rounded-xl border border-gray-200 bg-white p-4">
			<div class="flex items-baseline justify-between">
				<h3 class="text-sm font-semibold text-gray-900">Saved zones</h3>
				{#if zones.length > 0}
					<span class="text-xs text-gray-500">{activeCount} of {zones.length} on</span>
				{/if}
			</div>

			{#if loading}
				<p class="mt-3 text-sm text-gray-500">Loading zones…</p>
			{:else if zones.length === 0}
				<p class="mt-3 text-sm text-gray-500">No zones yet. Draw one or pick a neighborhood to get started.</p>
			{:else}
				<ul class="mt-3 flex flex-col gap-2">
					{#each zones as zone (zone.id)}
						<li
							class="rounded-lg border p-3 transition-colors {selectedId === zone.id
								? 'border-blue-500 bg-blue-50'
								: 'border-gray-200'}"
						>
							<div class="flex items-center gap-2">
								<input
									type="color"
									value={zone.color ?? DEFAULT_COLOR}
									onchange={(e) => setColor(zone, (e.currentTarget as HTMLInputElement).value)}
									aria-label="Color for {zone.name}"
									class="h-6 w-6 shrink-0 cursor-pointer rounded border border-gray-300 bg-transparent p-0"
								/>
								<button
									type="button"
									onclick={() => selectZone(zone)}
									class="min-w-0 flex-1 truncate text-left text-sm font-semibold hover:underline focus:outline-none focus-visible:underline {zone.active
										? 'text-gray-900'
										: 'text-gray-400'}"
									title="Show on map"
								>
									{zone.name}
								</button>
								<button
									type="button"
									role="switch"
									aria-checked={zone.active}
									aria-label="{zone.active ? 'Turn off' : 'Turn on'} {zone.name}"
									onclick={() => toggleActive(zone)}
									class="relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1 {zone.active
										? 'bg-green-500'
										: 'bg-gray-300'}"
								>
									<span
										class="inline-block h-4 w-4 rounded-full bg-white shadow transition-transform {zone.active
											? 'translate-x-4'
											: 'translate-x-0.5'}"
									></span>
								</button>
							</div>
							<div class="mt-2 flex items-center gap-3 text-xs">
								<span class="text-gray-500">{zone.coordinates.length} points{zone.active ? '' : ', off'}</span>
								<button type="button" onclick={() => renameZone(zone)} class="text-blue-600 hover:text-blue-800">Rename</button>
								<button type="button" onclick={() => deleteZone(zone)} class="text-red-600 hover:text-red-800">Delete</button>
							</div>
						</li>
					{/each}
				</ul>
			{/if}
		</div>

		<p class="px-1 text-xs text-gray-500">
			To reshape a zone, click it on the map, then click it again and drag its points. Changes save automatically.
		</p>
	</aside>

	<!-- Map -->
	<!-- Explicit height on the wrapper; the map fills it. Don't put absolute positioning on the map element
	     itself: Mapbox's CSS sets .mapboxgl-map { position: relative; overflow: hidden }, which cancels it
	     and collapses the map to 0px high (invisible). -->
	<div class="relative h-[70vh] min-h-[480px] flex-1 overflow-hidden rounded-xl border border-gray-200 bg-gray-100 lg:h-[calc(100vh-10rem)]">
		<div bind:this={mapEl} class="h-full w-full"></div>
		{#if loading}
			<div class="absolute inset-0 flex items-center justify-center bg-white/60 text-sm text-gray-600">Loading map…</div>
		{/if}
	</div>
</div>
