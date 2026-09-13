<script lang="ts">
	import { onMount } from 'svelte';
	import API_BASE from '$lib/api';

	const RED_PIN = 'https://maps.google.com/mapfiles/ms/icons/red-dot.png';

	let locations = $state<any[]>([]);
	let loading = $state(true);
	let mapEl: HTMLDivElement;
	let mapInstance: any = null;
	let markers: any[] = [];

	const validPoints = $derived(locations.filter((l) => l.latitude && l.longitude && l.latitude !== 0 && l.longitude !== 0));

	function initMap() {
		if (mapInstance || !mapEl) return;
		const bounds = new (window as any).google.maps.LatLngBounds();
		validPoints.forEach((loc) => bounds.extend(new (window as any).google.maps.LatLng(loc.latitude, loc.longitude)));
		mapInstance = new (window as any).google.maps.Map(mapEl, { zoom: 10, center: bounds.getCenter(), mapTypeId: 'roadmap' });
		markers = validPoints.map((loc) => {
			const marker = new (window as any).google.maps.Marker({ position: { lat: loc.latitude, lng: loc.longitude }, map: mapInstance, icon: RED_PIN });
			const info = new (window as any).google.maps.InfoWindow({
				content: `<div style="font-size:13px;line-height:1.5"><strong>${loc.latitude.toFixed(4)}, ${loc.longitude.toFixed(4)}</strong><br/>${loc.timestamp ? new Date(loc.timestamp).toLocaleString() : ''}<br/>${loc.deviceModel || ''} ${loc.osVersion || ''}</div>`
			});
			marker.addListener('click', () => {
				if (mapInstance._currentInfo) mapInstance._currentInfo.close();
				info.open(mapInstance, marker);
				mapInstance._currentInfo = info;
			});
			return marker;
		});
	}

	function loadMaps() {
		const key = 'AIzaSyDTm4xeMjg5_GFa2YYUE6zsk2-vagqlAno';
		if (!document.querySelector(`script[src*="${key}"]`)) {
			const script = document.createElement('script');
			script.src = `https://maps.googleapis.com/maps/api/js?key=${key}&libraries=places`;
			script.async = true;
			script.onload = initMap;
			document.head.appendChild(script);
		} else if ((window as any).google?.maps) {
			initMap();
		}
	}

	$effect(() => {
		if (loading || validPoints.length === 0 || mapInstance) return;
		loadMaps();
	});

	function formatDate(ts: string) {
		if (!ts) return '—';
		return new Date(ts).toLocaleString();
	}

	onMount(() => {
		fetch(API_BASE + 'admin/download-locations')
			.then((r) => r.json())
			.then((data) => (locations = Array.isArray(data) ? data : []))
			.catch(() => (locations = []))
			.finally(() => (loading = false));
	});
</script>

<div class="max-w-6xl mx-auto p-6">
	<h1 class="text-2xl font-bold text-gray-900 mb-1">📍 App Download Locations</h1>
	<p class="text-sm text-gray-500 mb-6">Showing {locations.length} record{locations.length !== 1 ? 's' : ''}</p>

	{#if loading}
		<div class="text-sm text-gray-400">Loading...</div>
	{:else}
		{#if validPoints.length > 0}
			<div bind:this={mapEl} class="w-full h-[400px] rounded-xl border border-gray-200 mb-6" style="min-height:400px"></div>
		{/if}

		<div class="bg-white rounded-xl border border-gray-200 overflow-hidden">
			<div class="overflow-x-auto">
				<table class="w-full text-sm">
					<thead>
						<tr class="bg-gray-50 border-b border-gray-200">
							<th class="text-left px-4 py-3 font-semibold text-gray-700">Latitude</th>
							<th class="text-left px-4 py-3 font-semibold text-gray-700">Longitude</th>
							<th class="text-left px-4 py-3 font-semibold text-gray-700">Date / Time</th>
							<th class="text-left px-4 py-3 font-semibold text-gray-700">Device Model</th>
							<th class="text-left px-4 py-3 font-semibold text-gray-700">OS Version</th>
						</tr>
					</thead>
					<tbody>
						{#if locations.length === 0}
							<tr><td colspan="5" class="text-center px-4 py-8 text-gray-400">No download locations recorded yet.</td></tr>
						{:else}
							{#each locations as loc, i}
								<tr class="border-b border-gray-100 hover:bg-gray-50 transition">
									<td class="px-4 py-3 text-gray-900 font-mono text-xs">{loc.latitude?.toFixed(6)}</td>
									<td class="px-4 py-3 text-gray-900 font-mono text-xs">{loc.longitude?.toFixed(6)}</td>
									<td class="px-4 py-3 text-gray-700">{formatDate(loc.timestamp)}</td>
									<td class="px-4 py-3 text-gray-700">{loc.deviceModel || '—'}</td>
									<td class="px-4 py-3 text-gray-700">{loc.osVersion || '—'}</td>
								</tr>
							{/each}
						{/if}
					</tbody>
				</table>
			</div>
		</div>
	{/if}
</div>
