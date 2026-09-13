<script lang="ts">
	import { onMount } from 'svelte';
	import API_BASE from '$lib/api';

	const RED_PIN = 'https://maps.google.com/mapfiles/ms/icons/red-dot.png';
	const BLUE_PIN = 'https://maps.google.com/mapfiles/ms/icons/blue-dot.png';

	let records = $state<any[]>([]);
	let loading = $state(true);
	let hoveredId = $state<string | null>(null);
	let selectedId = $state<string | null>(null);
	let mapEl: HTMLDivElement;
	let mapInstance: any = null;
	let markers: Record<string, any> = {};

	const validPoints = $derived(records.filter((r) => r.latitude && r.longitude && r.latitude !== 0 && r.longitude !== 0));

	function initMap() {
		if (mapInstance || !mapEl) return;
		const bounds = new (window as any).google.maps.LatLngBounds();
		validPoints.forEach((loc) => bounds.extend(new (window as any).google.maps.LatLng(loc.latitude, loc.longitude)));
		mapInstance = new (window as any).google.maps.Map(mapEl, { zoom: 10, center: bounds.getCenter(), mapTypeId: 'roadmap' });
		validPoints.forEach((loc) => {
			const marker = new (window as any).google.maps.Marker({ position: { lat: loc.latitude, lng: loc.longitude }, map: mapInstance, icon: RED_PIN });
			const info = new (window as any).google.maps.InfoWindow({
				content: `<div style="font-size:13px;line-height:1.5"><strong>${loc.email || 'No email'}</strong><br/>Zip: ${loc.zipCode || '—'}<br/>${loc.latitude?.toFixed(4)}, ${loc.longitude?.toFixed(4)}<br/>${loc.createdAt ? new Date(loc.createdAt).toLocaleString() : ''}</div>`
			});
			marker.addListener('click', () => {
				if (mapInstance._currentInfo) mapInstance._currentInfo.close();
				info.open(mapInstance, marker);
				mapInstance._currentInfo = info;
				selectedId = loc.id;
			});
			markers[loc.id] = marker;
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

	$effect(() => {
		Object.entries(markers).forEach(([id, marker]) => {
			const isActive = id === hoveredId || id === selectedId;
			if (isActive) {
				marker.setIcon(BLUE_PIN);
				marker.setAnimation((window as any).google.maps.Animation.BOUNCE);
			} else {
				marker.setIcon(RED_PIN);
				marker.setAnimation(null);
			}
		});
	});

	function handleRowClick(record: any) {
		if (selectedId === record.id) {
			selectedId = null;
			return;
		}
		selectedId = record.id;
		const marker = markers[record.id];
		if (marker && mapInstance) {
			mapInstance.panTo(marker.getPosition());
			mapInstance.setZoom(14);
			if (mapInstance._currentInfo) mapInstance._currentInfo.close();
			const info = new (window as any).google.maps.InfoWindow({
				content: `<div style="font-size:13px;line-height:1.5"><strong>${record.email || 'No email'}</strong><br/>Zip: ${record.zipCode || '—'}<br/>${record.latitude?.toFixed(4)}, ${record.longitude?.toFixed(4)}<br/>${record.createdAt ? new Date(record.createdAt).toLocaleString() : ''}</div>`
			});
			info.open(mapInstance, marker);
			mapInstance._currentInfo = info;
		}
	}

	function formatDate(ts: string) {
		if (!ts) return '—';
		return new Date(ts).toLocaleString();
	}

	onMount(() => {
		fetch(API_BASE + 'admin/zone-interests')
			.then((r) => r.json())
			.then((data) => (records = Array.isArray(data) ? data : []))
			.catch(() => (records = []))
			.finally(() => (loading = false));
	});
</script>

<div class="max-w-6xl mx-auto p-6">
	<h1 class="text-2xl font-bold text-gray-900 mb-1">📍 Zone Interests</h1>
	<p class="text-sm text-gray-500 mb-6">{loading ? 'Loading...' : `${records.length} signup${records.length !== 1 ? 's' : ''}`}</p>

	{#if !loading}
		{#if validPoints.length > 0}
			<div bind:this={mapEl} class="w-full h-[350px] rounded-xl border border-gray-200 mb-6"></div>
		{/if}

		<div class="bg-white rounded-xl border border-gray-200 overflow-hidden">
			<div class="overflow-x-auto">
				<table class="w-full text-sm">
					<thead>
						<tr class="bg-gray-50 border-b border-gray-200">
							<th class="text-left px-4 py-3 font-semibold text-gray-700">Email</th>
							<th class="text-left px-4 py-3 font-semibold text-gray-700">Phone</th>
							<th class="text-left px-4 py-3 font-semibold text-gray-700">Zip Code</th>
							<th class="text-left px-4 py-3 font-semibold text-gray-700">Latitude</th>
							<th class="text-left px-4 py-3 font-semibold text-gray-700">Longitude</th>
							<th class="text-left px-4 py-3 font-semibold text-gray-700">Date / Time</th>
						</tr>
					</thead>
					<tbody>
						{#if records.length === 0}
							<tr><td colspan="6" class="text-center px-4 py-8 text-gray-400">No zone interests recorded yet.</td></tr>
						{:else}
							{#each records as r, i}
								<tr
									onmouseenter={() => (hoveredId = r.id)}
									onmouseleave={() => (hoveredId = null)}
									onclick={() => handleRowClick(r)}
									class={`border-b border-gray-100 transition cursor-pointer ${selectedId === r.id ? 'bg-blue-50' : 'hover:bg-gray-50'}`}
								>
									<td class="px-4 py-3 text-gray-900">{r.email || '—'}</td>
									<td class="px-4 py-3 text-gray-900">{r.phone || '—'}</td>
									<td class="px-4 py-3 text-gray-900 font-mono">{r.zipCode}</td>
									<td class="px-4 py-3 text-gray-700 font-mono text-xs">{r.latitude?.toFixed(6)}</td>
									<td class="px-4 py-3 text-gray-700 font-mono text-xs">{r.longitude?.toFixed(6)}</td>
									<td class="px-4 py-3 text-gray-700">{formatDate(r.createdAt)}</td>
								</tr>
							{/each}
						{/if}
					</tbody>
				</table>
			</div>
		</div>
	{/if}
</div>
