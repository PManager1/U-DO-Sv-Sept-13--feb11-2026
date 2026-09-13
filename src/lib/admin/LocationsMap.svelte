<script lang="ts">
	import { onMount } from 'svelte';

	const ORANGE_PIN = 'https://maps.google.com/mapfiles/ms/icons/orange-dot.png';
	const GREEN_PIN = 'https://maps.google.com/mapfiles/ms/icons/green-dot.png';

	let {
		locations = [],
		googlePlaces = [],
		onAddPlace,
		isExistingPlace,
		onDeletePlace,
		initialZoom,
		onZoomChange,
		height = 400,
		polygons = [],
		selectedPolygonIds = new Set(),
		useLogoMarkers = false,
		gpIcon = ORANGE_PIN,
		focusPolygon,
		focusKey = 0
	}: {
		locations: any[];
		googlePlaces: any[];
		onAddPlace?: (p: any) => Promise<boolean>;
		isExistingPlace?: (p: any) => boolean;
		onDeletePlace?: (id: string) => Promise<void>;
		initialZoom?: number;
		onZoomChange?: (z: number) => void;
		height?: number;
		polygons?: any[];
		selectedPolygonIds?: Set<string>;
		useLogoMarkers?: boolean;
		gpIcon?: string;
		focusPolygon?: any;
		focusKey?: number;
	} = $props();

	let mapEl: HTMLDivElement;
	let mapInstance: any = null;
	let markers: any[] = [];
	let polygonOverlays: any[] = [];
	let currentInfo: any = null;
	let mounted = true;
	const dbPoints = $derived((locations || []).filter((loc) => loc.latitude && loc.longitude && loc.latitude !== 0 && loc.longitude !== 0));
	const gpPoints = $derived((googlePlaces || []).filter((p) => p.geometry?.location?.lat && p.geometry?.location?.lng));
	const hasAny = $derived(dbPoints.length > 0 || gpPoints.length > 0 || (polygons && polygons.some((p) => selectedPolygonIds?.has(p.id))));

	function makeDbMarker(loc: any, icon: any) {
		const marker = new (window as any).google.maps.Marker({ position: { lat: loc.latitude, lng: loc.longitude }, map: mapInstance, title: loc.name || loc.address, icon });
		const infoDiv = document.createElement('div');
		infoDiv.innerHTML = `<div style="font-size:13px;font-weight:500;white-space:nowrap">${loc.name || ''}</div><div style="font-size:11px;color:#666">${loc.address || ''}</div>`;
		if (onDeletePlace) {
			const btn = document.createElement('button');
			btn.textContent = 'Remove from DB';
			btn.style.cssText = 'margin-top:6px;padding:4px 10px;font-size:11px;font-weight:600;border:none;border-radius:4px;cursor:pointer;background:#dc2626;color:#fff;display:block;width:100%';
			btn.addEventListener('click', async () => {
				btn.disabled = true;
				btn.textContent = 'Removing...';
				btn.style.background = '#94a3b8';
				await onDeletePlace(loc.id || loc._id);
				info.close();
			});
			infoDiv.appendChild(btn);
		}
		const info = new (window as any).google.maps.InfoWindow({ content: infoDiv });
		marker.addListener('click', () => { if (currentInfo) currentInfo.close(); currentInfo = info; info.open(mapInstance, marker); });
		return marker;
	}

	function makeGpMarker(p: any, icon: any) {
		const marker = new (window as any).google.maps.Marker({ position: { lat: p.geometry.location.lat, lng: p.geometry.location.lng }, map: mapInstance, title: p.name || p.formatted_address, icon });
		const infoDiv = document.createElement('div');
		infoDiv.innerHTML = `<div style="font-size:13px;font-weight:500;white-space:nowrap">${p.name || ''}</div><div style="font-size:11px;color:#666">${p.formatted_address || ''}</div><div style="font-size:10px;color:#e67e22;margin-top:2px">Google Places result</div>`;
		if (onAddPlace) {
			const btn = document.createElement('button');
			btn.textContent = '+ Add to DB';
			btn.style.cssText = 'margin-top:6px;padding:4px 10px;font-size:11px;font-weight:600;border:none;border-radius:4px;cursor:pointer;background:#16a34a;color:#fff;display:block;width:100%';
			btn.addEventListener('click', async () => {
				btn.disabled = true;
				btn.textContent = 'Adding...';
				btn.style.background = '#94a3b8';
				const ok = await onAddPlace(p);
				if (ok) { btn.textContent = '✓ Added'; btn.style.background = '#16a34a'; }
				else {
					btn.textContent = 'Failed'; btn.style.background = '#dc2626';
					setTimeout(() => { btn.disabled = false; btn.textContent = '+ Add to DB'; btn.style.background = '#16a34a'; }, 2000);
				}
			});
			infoDiv.appendChild(btn);
		}
		const info = new (window as any).google.maps.InfoWindow({ content: infoDiv });
		marker.addListener('click', () => { if (currentInfo) currentInfo.close(); currentInfo = info; info.open(mapInstance, marker); });
		return marker;
	}

	function loadLogoMarker(loc: any) {
		const img = new Image();
		img.onload = () => {
			if (!mounted) return;
			const max = 32;
			let w: number, h: number;
			if (img.naturalWidth >= img.naturalHeight) { w = max; h = (img.naturalHeight / img.naturalWidth) * max; }
			else { h = max; w = (img.naturalWidth / img.naturalHeight) * max; }
			markers.push(makeDbMarker(loc, { url: loc.logoUrl, size: new (window as any).google.maps.Size(img.naturalWidth, img.naturalHeight), scaledSize: new (window as any).google.maps.Size(Math.round(w), Math.round(h)), origin: new (window as any).google.maps.Point(0, 0) }));
		};
		img.onerror = () => markers.push(makeDbMarker(loc, GREEN_PIN));
		img.src = loc.logoUrl;
	}

	function initMap() {
		if (mapInstance) return;
		let center = { lat: 38.9, lng: -77.0 };
		const bounds = new (window as any).google.maps.LatLngBounds();
		if (hasAny) {
			dbPoints.forEach((loc) => bounds.extend(new (window as any).google.maps.LatLng(loc.latitude, loc.longitude)));
			gpPoints.forEach((p) => bounds.extend(new (window as any).google.maps.LatLng(p.geometry.location.lat, p.geometry.location.lng)));
			center = bounds.getCenter();
		}
		const savedZoom = hasAny && initialZoom && initialZoom > 0 ? initialZoom : hasAny ? null : 11;
		mapInstance = new (window as any).google.maps.Map(mapEl, { zoom: savedZoom || 10, center, mapTypeId: 'roadmap' });
		if (onZoomChange) mapInstance.addListener('zoom_changed', () => { const z = mapInstance.getZoom(); if (z) onZoomChange(z); });

		markers = [];
		dbPoints.forEach((loc) => {
			if (!useLogoMarkers || !loc.logoUrl) markers.push(makeDbMarker(loc, GREEN_PIN));
			else loadLogoMarker(loc);
		});
		if (gpPoints.length > 0) {
			gpPoints.filter((p) => !(isExistingPlace ? isExistingPlace(p) : false)).forEach((p) => markers.push(makeGpMarker(p, gpIcon)));
		}
		if (polygons) {
			polygonOverlays = polygons.map((p) => {
				if (!p.coordinates || !selectedPolygonIds?.has(p.id)) return null;
				const c = p.color || '#f59e0b';
				const path = p.coordinates.map((cc: any) => ({ lat: cc.lat, lng: cc.lng }));
				if (path.length < 3) return null;
				return new (window as any).google.maps.Polygon({ paths: path, map: mapInstance, fillColor: c, fillOpacity: 0.3, strokeColor: c, strokeWeight: 3 });
			}).filter(Boolean);
		}
		if (hasAny && !savedZoom) mapInstance.fitBounds(bounds, 300);
	}

	function loadMaps() {
		const key = 'AIzaSyDTm4xeMjg5_GFa2YYUE6zsk2-vagqlAno';
		if ((window as any).google?.maps) initMap();
		else if (document.querySelector('script[src*="maps.googleapis.com/maps/api/js"]')) {
			const check = setInterval(() => { if ((window as any).google?.maps) { clearInterval(check); initMap(); } }, 200);
		} else {
			const script = document.createElement('script');
			script.src = `https://maps.googleapis.com/maps/api/js?key=${key}&libraries=places`;
			script.async = true;
			script.defer = true;
			script.onload = initMap;
			document.head.appendChild(script);
		}
	}

	onMount(() => {
		mounted = true;
		loadMaps();
		return () => {
			mounted = false;
			markers.forEach((m) => m.setMap(null));
			markers = [];
			polygonOverlays.forEach((p) => p.setMap(null));
			polygonOverlays = [];
			currentInfo = null;
			mapInstance = null;
		};
	});

	$effect(() => {
		if (mapInstance && initialZoom && initialZoom > 0) mapInstance.setZoom(initialZoom);
	});

	$effect(() => {
		if (!mapInstance || !focusPolygon?.coordinates?.length) return;
		const bounds = new (window as any).google.maps.LatLngBounds();
		focusPolygon.coordinates.forEach((c: any) => bounds.extend(new (window as any).google.maps.LatLng(c.lat, c.lng)));
		mapInstance.fitBounds(bounds, 50);
	});
</script>

<div bind:this={mapEl} class="w-full rounded-xl border border-gray-200 overflow-hidden" style={`height:${height}px`}></div>
