<script lang="ts">
	import { onMount } from 'svelte';
	import API_BASE from '$lib/api';

	let { brandId, brand } = $props();

	// Notes
	let notes = $state(brand?.notes || '');
	let savingNotes = $state(false);
	let notesSaved = $state(false);

	// Manual location count
	let manualLocationCount = $state(brand?.manualLocationCount ? String(brand.manualLocationCount) : '');
	let savingLocCount = $state(false);
	let locCountSaved = $state(false);

	// Min batch order
	let minBatchOrder = $state(brand?.minBatchOrder ?? '');
	let savingMinBatchOrder = $state(false);
	let minBatchOrderSaved = $state(false);

	// Owner name
	let ownerName = $state(brand?.ownerName || '');
	let savingOwnerName = $state(false);
	let ownerNameSaved = $state(false);

	// Company link
	let companyLink = $state(brand?.companyLink || '');
	let savingCompanyLink = $state(false);
	let companyLinkSaved = $state(false);

	// Google Places fetcher
	let gmapsUrl = $state(
		`https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(brand?.name || 'Pizza Hut')}&key=AIzaSyDTm4xeMjg5_GFa2YYUE6zsk2-vagqlAno`
	);
	let results = $state<any[] | null>(null);
	let loading = $state(false);
	let error = $state<string | null>(null);
	let selectedIds = $state(new Set<string>());
	let existingLocations = $state<any[]>([]);
	let showRaw = $state(false);
	let adding = $state(false);
	let addStatus = $state<{ success: number; failed: number; skipped: number; total: number } | null>(null);
	let searchFilter = $state('');
	let filteredPlaces = $state<any[]>([]);

	$effect(() => {
		const q = searchFilter.toLowerCase().trim();
		filteredPlaces = q
			? (results || []).filter((p) => p.name?.toLowerCase().includes(q) || p.formatted_address?.toLowerCase().includes(q))
			: (results || []);
	});

	async function fetchExisting() {
		try {
			const res = await fetch(API_BASE + `brands/${brandId}/locations`);
			const data = await res.json();
			existingLocations = Array.isArray(data) ? data : [];
		} catch {
			existingLocations = [];
		}
	}

	async function putField(body: any) {
		const res = await fetch(API_BASE + `admin/brands/${brandId}`, {
			method: 'PUT',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(body)
		});
		if (!res.ok) {
			const d = await res.json();
			throw new Error(d.message || d.error || 'Save failed');
		}
	}

	async function saveNotes() {
		savingNotes = true;
		try {
			await putField({ notes });
			notesSaved = true;
			setTimeout(() => (notesSaved = false), 2500);
		} catch (err: any) {
			alert(err.message);
		} finally {
			savingNotes = false;
		}
	}

	async function saveManualLocationCount() {
		savingLocCount = true;
		try {
			await putField({ manualLocationCount: manualLocationCount ? Number(manualLocationCount) : 0 });
			locCountSaved = true;
			setTimeout(() => (locCountSaved = false), 2500);
		} catch (err: any) {
			alert(err.message);
		} finally {
			savingLocCount = false;
		}
	}

	async function saveMinBatchOrder() {
		savingMinBatchOrder = true;
		try {
			await putField({ minBatchOrder: String(minBatchOrder || '') });
			minBatchOrderSaved = true;
			setTimeout(() => (minBatchOrderSaved = false), 2500);
		} catch (err: any) {
			alert(err.message);
		} finally {
			savingMinBatchOrder = false;
		}
	}

	async function saveOwnerName() {
		savingOwnerName = true;
		try {
			await putField({ ownerName });
			ownerNameSaved = true;
			setTimeout(() => (ownerNameSaved = false), 2500);
		} catch (err: any) {
			alert(err.message);
		} finally {
			savingOwnerName = false;
		}
	}

	async function saveCompanyLink() {
		savingCompanyLink = true;
		try {
			await putField({ companyLink });
			companyLinkSaved = true;
			setTimeout(() => (companyLinkSaved = false), 2500);
		} catch (err: any) {
			alert(err.message);
		} finally {
			savingCompanyLink = false;
		}
	}

	async function deleteBrand() {
		if (!confirm(`Are you sure you want to delete "${brand?.name}"? This cannot be undone.`)) return;
		try {
			const res = await fetch(API_BASE + `admin/brands/${brandId}`, { method: 'DELETE' });
			if (res.ok) window.location.href = '/admin/brands';
			else {
				const d = await res.json();
				alert('Failed to delete brand: ' + (d.message || d.error || res.status));
			}
		} catch (err: any) {
			alert('Network error: ' + err.message);
		}
	}

	// ── Google Places fetcher ──
	async function fetchLocations() {
		loading = true;
		error = null;
		results = null;
		selectedIds = new Set();
		showRaw = false;
		addStatus = null;
		const m = gmapsUrl.match(/[?&]query=([^&]+)/);
		const q = m ? decodeURIComponent(m[1].replace(/\+/g, ' ')) : '';
		if (!q) {
			error = 'Could not find query parameter in the URL.';
			loading = false;
			return;
		}
		try {
			const res = await fetch(API_BASE + 'brands/fetch-Locations', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ query: q })
			});
			const data = await res.json();
			if (res.ok) {
				results = data.results || (Array.isArray(data) ? data : []);
				await fetchExisting();
				const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
				const existingIds = new Set<string>();
				for (const place of results || []) {
					const placeAddr = normalize(place.formatted_address);
					const exists = existingLocations.some((loc) => {
						const locAddr = normalize([loc.address, loc.city, loc.state, loc.zipCode].filter(Boolean).join(' '));
						return locAddr && (placeAddr.includes(locAddr) || locAddr.includes(placeAddr));
					});
					if (exists) existingIds.add(place.place_id);
				}
				selectedIds = existingIds;
			} else {
				error = data.message || data.error || `HTTP ${res.status}: Request failed`;
			}
		} catch (err: any) {
			error = err.message || 'Network error';
		} finally {
			loading = false;
		}
	}

	function isExistingPlace(place: any) {
		const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
		const placeAddr = normalize(place.formatted_address);
		return existingLocations.some((loc) => {
			const locAddr = normalize([loc.address, loc.city, loc.state, loc.zipCode].filter(Boolean).join(' '));
			return locAddr && (placeAddr.includes(locAddr) || locAddr.includes(placeAddr));
		});
	}

	function toggleSelected(placeId: string) {
		const next = new Set(selectedIds);
		if (next.has(placeId)) next.delete(placeId);
		else next.add(placeId);
		selectedIds = next;
	}

	function selectAll() {
		selectedIds = new Set((filteredPlaces || []).filter((p) => !isExistingPlace(p)).map((p) => p.place_id));
	}

	function parseAddressParts(formatted: string) {
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

	async function addSelectedToDB() {
		adding = true;
		addStatus = null;
		const selected = (results || []).filter((p) => selectedIds.has(p.place_id) && !isExistingPlace(p));
		let success = 0, failed = 0, skipped = (results || []).filter((p) => selectedIds.has(p.place_id) && isExistingPlace(p)).length;
		for (const place of selected) {
			const a = parseAddressParts(place.formatted_address);
			const body = {
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
			try {
				const res = await fetch(API_BASE + `admin/brands/${brandId}/locations`, {
					method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body)
				});
				if (res.ok) success++;
				else failed++;
			} catch { failed++; }
		}
		addStatus = { success, failed, skipped, total: selected.length + skipped };
		if (failed === 0) selectedIds = new Set();
		adding = false;
		fetchExisting();
	}

	async function gfCopy() {
		if (navigator.clipboard) await navigator.clipboard.writeText(JSON.stringify(results, null, 2));
	}

	function highlight(json: string) {
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

	onMount(() => fetchExisting());
</script>

<div class="space-y-6">
	<!-- Notes -->
	<div class="bg-white rounded-xl border border-gray-200 p-5">
		<div class="flex items-center justify-between mb-3">
			<div class="flex items-center gap-2">
				<h3 class="font-semibold text-gray-900">📝 Notes</h3>
				<a href={`https://www.google.com/search?q=how+many+${encodeURIComponent(brand.name || '')}+locations+in+the+United+States`} target="_blank" rel="noopener noreferrer" class="text-xs font-bold text-gray-400 hover:text-blue-600 transition" style="font-family:'Product Sans', Arial, sans-serif" title="Ask Google how many locations this brand has in the US">L</a>
				<a href={`https://www.google.com/search?q=how+many+different+types+of+menu+categories+or+product+classification+lines+does+${encodeURIComponent(brand.name || '')}+sell`} target="_blank" rel="noopener noreferrer" class="text-xs font-bold text-gray-400 hover:text-blue-600 transition" style="font-family:'Product Sans', Arial, sans-serif" title="Ask Google about menu categories or product lines this brand sells">T</a>
			</div>
			<div class="flex items-center gap-2">
				{#if notesSaved}<span class="text-xs text-green-600 font-medium">Saved ✓</span>{/if}
				<button onclick={saveNotes} disabled={savingNotes} class="bg-violet-600 hover:bg-violet-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition">{savingNotes ? 'Saving...' : 'Save Notes'}</button>
			</div>
		</div>
		<div class="flex items-center gap-2 mb-3">
			<input type="number" bind:value={manualLocationCount} placeholder="Total locations in US..." class="w-40 border border-gray-300 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-violet-400" />
			<button onclick={saveManualLocationCount} disabled={savingLocCount} class="bg-violet-600 hover:bg-violet-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition">{savingLocCount ? 'Saving...' : 'Save'}</button>
			{#if locCountSaved}<span class="text-xs text-green-600 font-medium">Saved ✓</span>{/if}
		</div>
		<textarea bind:value={notes} rows={4} placeholder="Add internal notes about this brand..." class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400 resize-y"></textarea>
	</div>

	<!-- Take Signature -->
	<div class="bg-white rounded-xl border border-gray-200 p-5">
		<h3 class="font-semibold text-gray-900 mb-3">🖊️ Take Signature</h3>
		<a href={`/take-signature/${brandId}`} target="_blank" rel="noopener noreferrer" class="inline-block bg-violet-600 hover:bg-violet-700 text-white text-xs font-semibold px-4 py-2 rounded-lg transition">Open Take Signature</a>
	</div>

	<!-- Min Batch Order -->
	<div class="bg-white rounded-xl border border-gray-200 p-5">
		<h3 class="font-semibold text-gray-900 mb-3">📦 Min Batch Order</h3>
		<div class="flex items-center gap-2">
			<input type="number" min="0" bind:value={minBatchOrder} placeholder="0" class="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400" />
			<button onclick={saveMinBatchOrder} disabled={savingMinBatchOrder} class="bg-violet-600 hover:bg-violet-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-semibold px-3 py-2 rounded-lg transition shrink-0">{savingMinBatchOrder ? 'Saving...' : 'Save'}</button>
			{#if minBatchOrderSaved}<span class="text-xs text-green-600 font-medium shrink-0">Saved ✓</span>{/if}
		</div>
	</div>

	<!-- Owner Name -->
	<div class="bg-white rounded-xl border border-gray-200 p-5">
		<h3 class="font-semibold text-gray-900 mb-3">👤 Owner Name</h3>
		<div class="flex items-center gap-2">
			<input type="text" bind:value={ownerName} placeholder="John Doe" class="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400" />
			<button onclick={saveOwnerName} disabled={savingOwnerName} class="bg-violet-600 hover:bg-violet-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-semibold px-3 py-2 rounded-lg transition shrink-0">{savingOwnerName ? 'Saving...' : 'Save'}</button>
			{#if ownerNameSaved}<span class="text-xs text-green-600 font-medium shrink-0">Saved ✓</span>{/if}
		</div>
	</div>

	<!-- Company Link -->
	<div class="bg-white rounded-xl border border-gray-200 p-5">
		<div class="flex items-center justify-between mb-3">
			<h3 class="font-semibold text-gray-900">🔗 Company Link</h3>
			<div class="flex items-center gap-2">
				{#if companyLinkSaved}<span class="text-xs text-green-600 font-medium">Saved ✓</span>{/if}
				<button onclick={saveCompanyLink} disabled={savingCompanyLink} class="bg-violet-600 hover:bg-violet-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition">{savingCompanyLink ? 'Saving...' : 'Save'}</button>
			</div>
		</div>
		<input type="text" bind:value={companyLink} placeholder="https://www.company.com" class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400" />
		{#if companyLink}
			<a href={companyLink} target="_blank" rel="noopener noreferrer" class="inline-block mt-2 text-xs text-blue-600 hover:text-blue-800 hover:underline">Open link ↗</a>
		{/if}
	</div>

	<!-- Google Places Fetcher -->
	<div class="bg-white rounded-xl border border-gray-200 p-5">
		<div class="flex items-center justify-between mb-3"><h3 class="font-semibold text-gray-900">🔧 Misc</h3></div>
		<div>
			<label class="text-xs font-semibold text-gray-600 mb-1 block">Google Places Text Search URL</label>
			<textarea bind:value={gmapsUrl} rows={3} class="w-full border border-gray-300 rounded-lg px-3 py-2 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-orange-400 resize-none"></textarea>
			<p class="text-xs text-gray-400 mt-1">Edit the query parameters as needed.</p>
		</div>
		<div class="flex justify-end mt-3">
			<button onclick={fetchLocations} disabled={loading} class="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold px-4 py-2 rounded-lg transition flex items-center gap-2">
				{#if loading}<svg class="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path></svg>{/if}
				{loading ? 'Fetching...' : 'Fetch Locations'}
			</button>
		</div>
	</div>

	{#if loading}
		<div class="bg-white rounded-xl border border-gray-200 p-5 text-center text-sm text-gray-500">
			<div class="flex items-center justify-center gap-2">
				<svg class="animate-spin w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path></svg>
				Fetching locations from Google Places...
			</div>
		</div>
	{/if}

	{#if error}
		<div class="bg-red-50 border border-red-200 rounded-xl p-4">
			<div class="text-xs font-bold text-red-600 mb-1">Request Failed</div>
			<div class="text-xs text-red-500">{error}</div>
		</div>
	{/if}

	{#if addStatus}
		<div class={`rounded-xl p-4 ${addStatus.failed === 0 ? 'bg-green-50 border border-green-200' : 'bg-yellow-50 border border-yellow-200'}`}>
			<div class={`text-xs font-bold mb-1 ${addStatus.failed === 0 ? 'text-green-600' : 'text-yellow-600'}`}>{addStatus.failed === 0 ? '✅ All locations added' : '⚠️ Some locations failed'}</div>
			<div class="text-xs text-gray-600">Added {addStatus.success} of {addStatus.total} — {addStatus.failed} failed.{addStatus.skipped > 0 ? ` ${addStatus.skipped} already in DB.` : ''}</div>
		</div>
	{/if}

	{#if results && results.length > 0}
		<div class="bg-white rounded-xl border border-gray-200 overflow-hidden">
			<div class="flex items-center justify-between px-4 py-3 bg-gray-50 border-b border-gray-200 flex-wrap gap-2">
				<div>
					<span class="text-sm font-semibold text-gray-700">Results</span>
					<span class="ml-2 text-xs text-gray-400">{searchFilter ? `${filteredPlaces.length} of ${results.length} found` : `${results.length} found`}</span>
				</div>
				<div class="flex items-center gap-2">
					<button onclick={selectAll} class="text-xs text-blue-600 hover:text-blue-700 font-medium">Select All</button>
					<button onclick={() => (selectedIds = new Set())} class="text-xs text-gray-500 hover:text-gray-700 font-medium">Clear</button>
				</div>
			</div>
			<div class="px-4 py-2 border-b border-gray-100">
				<input type="text" bind:value={searchFilter} placeholder="Filter results by name or address..." class="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-400" />
			</div>
			<div class="divide-y divide-gray-100 max-h-72 overflow-y-auto">
				{#each filteredPlaces as place, idx (place.place_id || idx)}
					{@const existing = isExistingPlace(place)}
					<label class={`flex items-start gap-3 px-4 py-3 ${existing ? '' : 'cursor-pointer hover:bg-gray-50'} transition ${selectedIds.has(place.place_id) ? 'bg-blue-50' : ''}`}>
						<input type="checkbox" checked={selectedIds.has(place.place_id)} disabled={existing} onchange={() => toggleSelected(place.place_id)} class="mt-0.5 rounded" />
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
			<div class="px-4 py-3 bg-gray-50 border-t border-gray-200 flex items-center justify-between">
				<span class="text-xs text-gray-500">{selectedIds.size} of {filteredPlaces.length} selected</span>
				<button onclick={addSelectedToDB} disabled={adding || selectedIds.size === 0} class="bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold px-5 py-2 rounded-lg transition flex items-center gap-2">
					{#if adding}<svg class="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path></svg>{/if}
					{adding ? 'Adding...' : 'Add to DB'}
				</button>
			</div>
		</div>
	{/if}

	<!-- Raw Response -->
	{#if results}
		<div class="bg-white rounded-xl border border-gray-200 overflow-hidden">
			<button onclick={() => (showRaw = !showRaw)} class="w-full flex items-center justify-between px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 transition">
				<span>Raw Response</span>
				<svg class={`w-4 h-4 transition-transform ${showRaw ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path></svg>
			</button>
			{#if showRaw}
				<div class="border-t border-gray-200">
					<div class="flex items-center justify-between px-4 py-2 bg-gray-50">
						<span class="text-xs text-gray-400">POST /brands/fetch-Locations</span>
						<button onclick={gfCopy} class="text-xs text-gray-500 hover:text-gray-700 flex items-center gap-1">
							<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/></svg>
							Copy
						</button>
					</div>
					<pre class="p-4 text-xs overflow-x-auto bg-white max-h-64 overflow-y-auto"><code>{@html highlight(JSON.stringify(results, null, 2))}</code></pre>
				</div>
			{/if}
		</div>
	{/if}

	<!-- Danger Zone -->
	<div class="bg-white rounded-xl border border-red-200 p-5">
		<div class="flex items-center justify-between">
			<div>
				<h3 class="font-semibold text-red-600">Danger Zone</h3>
				<p class="text-xs text-gray-500 mt-1">Permanently delete this brand and all its data.</p>
			</div>
			<button onclick={deleteBrand} class="bg-red-600 hover:bg-red-700 text-white text-sm font-semibold px-4 py-2 rounded-lg transition">Delete Brand</button>
		</div>
	</div>
</div>
