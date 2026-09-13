<script lang="ts">
	import { onMount } from 'svelte';
	import API_BASE from '$lib/api';

	const COLOR_OPTIONS = ['#6366f1', '#ef4444', '#f97316', '#f59e0b', '#22c55e', '#14b8a6', '#3b82f6', '#a855f7', '#ec4899', '#6b7280'];

	function simplifyPoints(pts: any[], tolerance = 0.0001): any[] {
		if (pts.length <= 2) return pts;
		let maxDist = 0;
		let maxIdx = 0;
		const first = pts[0];
		const last = pts[pts.length - 1];
		for (let i = 1; i < pts.length - 1; i++) {
			const d = perpendicularDist(pts[i], first, last);
			if (d > maxDist) { maxDist = d; maxIdx = i; }
		}
		if (maxDist > tolerance) {
			const left: any[] = simplifyPoints(pts.slice(0, maxIdx + 1), tolerance);
			const right: any[] = simplifyPoints(pts.slice(maxIdx), tolerance);
			return [...left.slice(0, -1), ...right];
		}
		return [first, last];
	}
	function perpendicularDist(p: any, a: any, b: any) {
		const dx = b.lng - a.lng;
		const dy = b.lat - a.lat;
		const mag = Math.sqrt(dx * dx + dy * dy);
		if (mag === 0) return Math.sqrt((p.lat - a.lat) ** 2 + (p.lng - a.lng) ** 2);
		const u = ((p.lng - a.lng) * dx + (p.lat - a.lat) * dy) / (mag * mag);
		const ix = a.lng + u * dx;
		const iy = a.lat + u * dy;
		return Math.sqrt((p.lng - ix) ** 2 + (p.lat - iy) ** 2);
	}

	let {
		onPolygonChange,
		showSaveUI = false,
		existingPolygons = [],
		height = 400,
		selectedPolygonIds = new Set(),
		onSaved,
		editingPolygon
	}: {
		onPolygonChange?: (pts: any) => void;
		showSaveUI?: boolean;
		existingPolygons?: any[];
		height?: number;
		selectedPolygonIds?: Set<string>;
		onSaved?: () => void;
		editingPolygon?: any;
	} = $props();

	let mapEl: HTMLDivElement;
	let mapInstance: any = null;
	let polygonOverlay: any = null;
	let polylineOverlay: any = null;
	let markers: any[] = [];
	let savedPolys: any[] = [];
	let vertices: any[] = [];
	let coords = $state('');
	let polygonName = $state('');
	let polygonColor = $state('#6366f1');
	let drawingMode = $state(false);
	let drawn = false;

	function clearAll() {
		markers.forEach((m) => m.setMap(null));
		markers = [];
		if (polylineOverlay) { polylineOverlay.setMap(null); polylineOverlay = null; }
		if (polygonOverlay) { polygonOverlay.setMap(null); polygonOverlay = null; }
		vertices = [];
		drawn = false;
		coords = '';
		polygonName = '';
		if (onPolygonChange) onPolygonChange(null);
	}

	function syncCoords() {
		const pts = vertices.map((ll: any) => ({ lat: ll.lat(), lng: ll.lng() }));
		coords = JSON.stringify(pts, null, 2);
		if (onPolygonChange) onPolygonChange(pts);
	}

	function updatePreview() {
		markers.forEach((m) => m.setMap(null));
		markers = vertices.map((ll: any, i: number) => {
			const m = new (window as any).google.maps.Marker({ position: ll, map: mapInstance, label: String(i + 1), draggable: true });
			m.addListener('dragend', () => { vertices[i] = m.getPosition(); updatePreview(); });
			return m;
		});
		if (polylineOverlay) polylineOverlay.setMap(null);
		if (vertices.length >= 2) {
			polylineOverlay = new (window as any).google.maps.Polyline({ path: vertices, map: mapInstance, strokeColor: polygonColor, strokeWeight: 2, strokeOpacity: 0.8 });
		}
		if (polygonOverlay) polygonOverlay.setMap(null);
		if (vertices.length >= 3) {
			polygonOverlay = new (window as any).google.maps.Polygon({ paths: vertices, map: mapInstance, fillColor: polygonColor, fillOpacity: 0.3, strokeColor: polygonColor, strokeWeight: 2, editable: true });
			syncCoords();
			polygonOverlay.getPath().addListener('set_at', syncFromEditable);
			polygonOverlay.getPath().addListener('insert_at', syncFromEditable);
		}
	}

	function syncFromEditable() {
		if (!polygonOverlay) return;
		const path = polygonOverlay.getPath();
		markers.forEach((m) => m.setMap(null));
		markers = [];
		vertices = [];
		for (let i = 0; i < path.getLength(); i++) {
			const ll = path.getAt(i);
			vertices.push(ll);
			const m = new (window as any).google.maps.Marker({ position: ll, map: mapInstance, label: String(i + 1), draggable: true });
			const idx = i;
			m.addListener('dragend', () => { vertices[idx] = m.getPosition(); syncFromEditable(); });
			markers.push(m);
		}
		syncCoords();
	}

	function toggleDraw() {
		const next = !drawingMode;
		drawingMode = next;
		if (next) {
			clearAll();
			mapInstance?.setOptions({ draggable: false, gestureHandling: 'none' });
		} else {
			mapInstance?.setOptions({ draggable: true, gestureHandling: 'auto' });
		}
	}

	function handleMapClick(e: any) {
		if (!drawingMode) return;
		vertices.push(e.latLng);
		updatePreview();
	}

	function handleDblClick(e: any) {
		if (!drawingMode) return;
		e.stop();
		finishPolygon();
	}

	function handleRightClick() {
		if (!drawingMode || vertices.length === 0) return;
		vertices.pop();
		updatePreview();
	}

	function finishPolygon() {
		if (vertices.length < 3) { updatePreview(); return; }
		if (polylineOverlay) { polylineOverlay.setMap(null); polylineOverlay = null; }
		drawn = true;
		mapInstance?.setOptions({ draggable: true, gestureHandling: 'auto' });
		drawingMode = false;
		syncCoords();
	}

	async function handleSave() {
		if (!coords || !polygonName.trim()) return;
		try {
			const res = await fetch(API_BASE + 'admin/polygons', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: polygonName, color: polygonColor, coordinates: JSON.parse(coords) }) });
			if (res.ok) { polygonName = ''; coords = ''; if (onSaved) onSaved(); }
		} catch {}
	}

	async function handleUpdate() {
		if (!coords || !editingPolygon) return;
		try {
			const res = await fetch(API_BASE + 'admin/polygons/' + editingPolygon.id, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: polygonName, color: polygonColor, coordinates: JSON.parse(coords) }) });
			if (res.ok) { clearAll(); if (onSaved) onSaved(); }
		} catch {}
	}

	function renderSavedPolygons(map: any) {
		savedPolys = (existingPolygons || []).map((p) => {
			if (!p.coordinates) return null;
			const c = p.color || '#6366f1';
			return new (window as any).google.maps.Polygon({ paths: p.coordinates.map((c2: any) => ({ lat: c2.lat, lng: c2.lng })), map, fillColor: c, fillOpacity: 0.2, strokeColor: c, strokeWeight: 2 });
		}).filter(Boolean);
	}

	function initMap() {
		const map = new (window as any).google.maps.Map(mapEl, { zoom: 11, center: { lat: 38.9, lng: -77.0 }, mapTypeId: 'roadmap' });
		mapInstance = map;
		renderSavedPolygons(map);
		(window as any).__clearCurrentPolygon = clearAll;
		const c = map.addListener('click', handleMapClick);
		const d = map.addListener('dblclick', handleDblClick);
		const r = map.addListener('rightclick', handleRightClick);
		map._suListeners = { c, d, r };
	}

	$effect(() => {
		if (!mapInstance) return;
		savedPolys.forEach((p) => p.setMap(null));
		savedPolys = (existingPolygons || []).map((p) => {
			if (!p.coordinates) return null;
			const isSelected = selectedPolygonIds?.has(p.id);
			const c = p.color || '#6366f1';
			return new (window as any).google.maps.Polygon({ paths: p.coordinates.map((cc: any) => ({ lat: cc.lat, lng: cc.lng })), map: mapInstance, fillColor: isSelected ? '#f59e0b' : c, fillOpacity: 0.3, strokeColor: isSelected ? '#f59e0b' : c, strokeWeight: isSelected ? 3 : 2 });
		}).filter(Boolean);
	});

	$effect(() => {
		if (!mapInstance || !editingPolygon) return;
		clearAll();
		const pts = editingPolygon.coordinates?.map((c: any) => new (window as any).google.maps.LatLng(c.lat, c.lng)) || [];
		vertices = pts;
		updatePreview();
		polygonName = editingPolygon.name || '';
		polygonColor = editingPolygon.color || '#6366f1';
	});

	function loadMaps() {
		const key = 'AIzaSyDTm4xeMjg5_GFa2YYUE6zsk2-vagqlAno';
		if ((window as any).google?.maps) initMap();
		else if (document.querySelector('script[src*="maps.googleapis.com/maps/api/js"]')) {
			const check = setInterval(() => { if ((window as any).google?.maps) { clearInterval(check); initMap(); } }, 200);
		} else {
			const s = document.createElement('script');
			s.src = `https://maps.googleapis.com/maps/api/js?key=${key}&libraries=places`;
			s.async = true;
			s.defer = true;
			s.onload = initMap;
			document.head.appendChild(s);
		}
	}

	onMount(() => {
		loadMaps();
		return () => {
			savedPolys.forEach((p) => p.setMap(null));
			markers.forEach((m) => m.setMap(null));
			mapInstance?._suListeners?.c.remove();
			mapInstance?._suListeners?.d.remove();
			mapInstance?._suListeners?.r.remove();
		};
	});
</script>

<div>
	<div class="px-4 py-2 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
		<div class="flex items-center gap-3">
			<button onclick={toggleDraw} class={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${drawingMode ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'}`}>
				✏️ {drawingMode ? 'Drawing Active' : 'Draw Polygon'}
			</button>
			{#if drawingMode}
				<span class="text-xs text-indigo-600 font-medium animate-pulse">Click the map to place points — double-click to finish</span>
			{:else if editingPolygon}
				<span class="text-xs text-amber-600 font-medium">✏️ Editing "{editingPolygon.name}" — drag vertices to adjust, then click Update Polygon</span>
			{:else if vertices.length >= 3}
				<button onclick={() => { toggleDraw(); setTimeout(() => toggleDraw(), 100); }} class="text-xs text-indigo-600 hover:text-indigo-700 font-medium underline">Edit Polygon</button>
			{/if}
		</div>
		{#if drawingMode}<span class="text-xs text-gray-400">Right-click to undo last point</span>{/if}
	</div>
	<div bind:this={mapEl} class="w-full" style={`height:${height}px`}></div>
	{#if coords}
		<div class="border-t border-gray-200 p-4 space-y-3">
			<div class="flex items-center justify-between">
				<span class="text-xs font-semibold text-gray-600">Polygon Coordinates ({JSON.parse(coords).length} points)</span>
				<button onclick={() => { clearAll(); coords = ''; }} class="text-xs text-red-600 hover:text-red-700 font-medium">Clear</button>
			</div>
			<pre class="text-xs bg-gray-50 rounded-lg p-3 max-h-32 overflow-y-auto border border-gray-200 font-mono">{coords}</pre>
		</div>
	{/if}
	{#if showSaveUI}
		<div class="border-t border-gray-200 p-4 space-y-3">
			<div class="flex items-center gap-1.5">
				{#each COLOR_OPTIONS as c}
					<button onclick={() => (polygonColor = c)} class={`w-6 h-6 rounded-full border-2 transition-all ${polygonColor === c ? 'border-gray-800 scale-110 shadow-sm' : 'border-transparent'}`} style={`background-color:${c}`}></button>
				{/each}
			</div>
			<div class="flex items-center gap-2">
				<input type="text" value={polygonName} oninput={(e) => (polygonName = (e.currentTarget as HTMLInputElement).value)} placeholder="Polygon name..." class="flex-1 border border-gray-300 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-400" />
				{#if editingPolygon}
					<button onclick={handleUpdate} disabled={!coords} class="bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white text-xs font-semibold px-4 py-1.5 rounded-lg transition">Update Polygon</button>
				{:else}
					<button onclick={handleSave} disabled={!polygonName.trim() || !coords} class="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-semibold px-4 py-1.5 rounded-lg transition">Save Polygon</button>
				{/if}
			</div>
		</div>
	{/if}
</div>
