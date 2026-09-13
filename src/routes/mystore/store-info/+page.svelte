<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import API_BASE from '$lib/api';
	import * as api from '$lib/mystore/api';

	const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
	const STORE_TYPES = [
		{ value: '', label: 'Select type...' },
		{ value: 'cafe', label: '☕ Cafe' },
		{ value: 'restaurant', label: '🍽️ Restaurant' },
		{ value: 'grocery', label: '🛒 Grocery / Convenience' },
		{ value: 'flowers', label: '💐 Flower Shop / Boutique' }
	];

	let saving = $state(false);
	let toast = $state<{ show: boolean; message: string; type: string }>({ show: false, message: '', type: 'success' });
	let suggestions = $state<any[]>([]);
	let showSuggestions = $state(false);
	let isFetchingSuggestions = $state(false);
	let addressInput: HTMLInputElement;
	let suggestionsBox: HTMLDivElement;
	let debounceTimer: ReturnType<typeof setTimeout> | null = null;

	let form = $state({ restaurantName: '', storeType: '', storeAddress: '', emergencyPause: false, _lat: 0, _lng: 0 });
	let hours = $state<Record<string, any>>(() => { const h: Record<string, any> = {}; DAYS.forEach((d) => { h[d] = { open: '09:00', close: '21:00', closed: false }; }); return h; });

	function showToast(message: string, type = 'success') {
		toast = { show: true, message, type };
		setTimeout(() => (toast = { show: false, message: '', type: 'success' }), 3000);
	}

	function handleClickOutside(e: MouseEvent) {
		if ((suggestionsBox && !suggestionsBox.contains(e.target as Node)) && (addressInput && !addressInput.contains(e.target as Node))) {
			showSuggestions = false;
		}
	}

	$effect(() => {
		document.addEventListener('mousedown', handleClickOutside);
		return () => document.removeEventListener('mousedown', handleClickOutside);
	});

	async function fetchSuggestions(input: string) {
		if (!input || input.length < 3) { suggestions = []; showSuggestions = false; return; }
		isFetchingSuggestions = true;
		try {
			const res = await fetch(API_BASE + 'autocomplete', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ input }) });
			const data = await res.json();
			const list = data.suggestions || [];
			suggestions = list;
			showSuggestions = list.length > 0;
		} catch { suggestions = []; } finally {
			isFetchingSuggestions = false;
		}
	}

	async function geocodeAddress(address: string) {
		try {
			const res = await fetch(API_BASE + 'geocoordinates', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ address }) });
			const data = await res.json();
			if (data.coordinates) return { lat: data.coordinates.lat, lng: data.coordinates.lng };
		} catch {}
		return null;
	}

	function handleAddressChange(value: string) {
		form = { ...form, storeAddress: value };
		if (debounceTimer) clearTimeout(debounceTimer);
		debounceTimer = setTimeout(() => fetchSuggestions(value), 300);
	}

	async function handleSuggestionSelect(suggestion: any) {
		form = { ...form, storeAddress: suggestion.description };
		showSuggestions = false;
		suggestions = [];
		const coords = await geocodeAddress(suggestion.description);
		if (coords) {
			form = { ...form, _lat: coords.lat, _lng: coords.lng };
			showToast('Address selected with coordinates', 'success');
		}
	}

	onMount(() => {
		(async () => {
			try {
				const profile: any = await api.getProfile();
				const data = profile.store || profile;
				form = { restaurantName: data.restaurantName || data.storeName || data.name || '', storeType: data.storeType || '', storeAddress: data.storeAddress || data.address || '', emergencyPause: data.emergencyPause || false, _lat: 0, _lng: 0 };
				if (data.storeHours && typeof data.storeHours === 'object') {
					const parsed: Record<string, any> = {};
					DAYS.forEach((d) => {
						const val = data.storeHours[d];
						if (val && val === 'closed') parsed[d] = { open: '', close: '', closed: true };
						else if (val && String(val).includes('-')) { const [o, c] = String(val).split('-'); parsed[d] = { open: o, close: c, closed: false }; }
						else parsed[d] = { open: '09:00', close: '21:00', closed: false };
					});
					hours = parsed;
				} else if (data.hours && typeof data.hours === 'object') {
					const parsed: Record<string, any> = {};
					DAYS.forEach((d) => { const h = data.hours[d]; parsed[d] = h ? { open: h.open || '09:00', close: h.close || '21:00', closed: h.closed || false } : { open: '09:00', close: '21:00', closed: false }; });
					hours = parsed;
				}
			} catch (err) { console.error('Failed to load profile:', err); }
		})();
	});

	function updateField(field: string, value: any) { form = { ...form, [field]: value }; }
	function updateHour(day: string, field: string, value: any) { hours = { ...hours, [day]: { ...hours[day], [field]: value } }; }
	function fillAllHours(open: string, close: string) { const updated: Record<string, any> = {}; DAYS.forEach((d) => { updated[d] = { open, close }; }); hours = updated; }
	function clearAllHours() { const cleared: Record<string, any> = {}; DAYS.forEach((d) => { cleared[d] = { open: '', close: '' }; }); hours = cleared; }

	async function handleSave() {
		if (!form.restaurantName.trim()) { showToast('Enter a store name', 'error'); return; }
		saving = true;
		try {
			const storeHours: Record<string, string> = {};
			DAYS.forEach((d) => {
				const h = hours[d];
				if (h?.closed) storeHours[d] = 'closed';
				else if (h && h.open && h.close) storeHours[d] = `${h.open}-${h.close}`;
			});
			await api.patchProfile({ restaurantName: form.restaurantName, storeType: form.storeType, storeAddress: form.storeAddress, emergencyPause: form.emergencyPause, storeHours, latitude: form._lat || undefined, longitude: form._lng || undefined });
			showToast('Store information saved!');
			goto('/mystore');
		} catch (err: any) {
			showToast('Failed to save: ' + err.message, 'error');
		} finally {
			saving = false;
		}
	}
</script>

<div class="min-h-screen bg-[#f9f7f5]">
	<header class="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-200 shadow-sm">
		<div class="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-3 flex items-center justify-between gap-2 sm:gap-4">
			<div class="flex items-center gap-2 sm:gap-4 min-w-0">
				<button onclick={() => goto('/mystore')} class="p-2 text-gray-500 hover:text-orange-500 hover:bg-gray-100 rounded-lg transition flex-shrink-0">
					<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" /></svg>
				</button>
				<div class="min-w-0">
					<h1 class="text-lg sm:text-2xl font-bold text-gray-900 flex items-center gap-1 sm:gap-2 truncate">
						<svg class="w-5 h-5 sm:w-6 sm:h-6 text-orange-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
						<span class="truncate">Store Information</span>
					</h1>
					<p class="text-xs sm:text-sm text-gray-500 mt-0.5 hidden sm:block">Manage your store details and hours</p>
				</div>
			</div>
			<button onclick={handleSave} disabled={saving} class="bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white font-semibold py-2 px-4 sm:px-8 rounded-full transition shadow-sm hover:shadow-md flex items-center gap-2 text-sm sm:text-lg flex-shrink-0">
				{#if saving}<svg class="w-5 h-5 animate-spin" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" fill="none"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path></svg>{/if}
				{saving ? 'Saving...' : 'Save'}
			</button>
		</div>
	</header>

	<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
		<div class="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
			<h2 class="text-xl font-bold text-gray-800 mb-6">Basic Details</h2>
			<div class="grid grid-cols-1 sm:grid-cols-2 gap-6">
				<div>
					<label class="block text-sm font-semibold text-gray-700 mb-2">Store Name</label>
					<input type="text" value={form.restaurantName} oninput={(e) => updateField('restaurantName', (e.currentTarget as HTMLInputElement).value)} class="w-full px-4 py-3 border border-gray-300 rounded-xl text-base focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500 transition" placeholder="Your store name" />
				</div>
				<div>
					<label class="block text-sm font-semibold text-gray-700 mb-2">Store Type</label>
					<select value={form.storeType} onchange={(e) => updateField('storeType', (e.currentTarget as HTMLSelectElement).value)} class="w-full px-4 py-3 border border-gray-300 rounded-xl text-base focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500 transition cursor-pointer">
						{#each STORE_TYPES as t}<option value={t.value}>{t.label}</option>{/each}
					</select>
				</div>
			</div>

			<div class="mt-6 relative">
				<label class="block text-sm font-semibold text-gray-700 mb-2">Store Address</label>
				<div class="relative">
					<input bind:this={addressInput} type="text" value={form.storeAddress} oninput={(e) => handleAddressChange((e.currentTarget as HTMLInputElement).value)} onfocus={() => { if (suggestions.length > 0) showSuggestions = true; }} class="w-full px-4 py-3 border border-gray-300 rounded-xl text-base focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500 transition pr-10" placeholder="Start typing address..." autocomplete="off" />
					{#if isFetchingSuggestions}
						<div class="absolute right-3 top-1/2 -translate-y-1/2">
							<svg class="w-5 h-5 text-orange-500 animate-spin" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" fill="none"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path></svg>
						</div>
					{/if}
				</div>
				{#if showSuggestions && suggestions.length > 0}
					<div bind:this={suggestionsBox} class="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg max-h-60 overflow-y-auto">
						{#each suggestions as s, i}
							<button type="button" onclick={() => handleSuggestionSelect(s)} class="w-full text-left px-4 py-3 hover:bg-orange-50 border-b border-gray-50 last:border-0 transition flex items-start gap-3">
								<svg class="w-5 h-5 text-orange-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
								<span class="text-sm text-gray-700">{s.description}</span>
							</button>
						{/each}
					</div>
				{/if}
			</div>
		</div>

		<div class="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 sm:p-8">
			<h2 class="text-lg sm:text-xl font-bold text-gray-800 mb-4 sm:mb-6">Store Hours</h2>
			<div class="flex items-center gap-2 sm:gap-3 mb-4 sm:mb-6 p-3 sm:p-4 bg-gray-50 rounded-xl flex-wrap">
				<span class="text-xs sm:text-sm font-medium text-gray-600">Quick Fill:</span>
				<input type="time" id="bulkOpen" value="09:00" class="px-2 sm:px-3 py-1.5 sm:py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-500/50" />
				<span class="text-gray-400 text-sm">to</span>
				<input type="time" id="bulkClose" value="21:00" class="px-2 sm:px-3 py-1.5 sm:py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-500/50" />
				<button onclick={() => { const o = (document.getElementById('bulkOpen') as HTMLInputElement).value; const c = (document.getElementById('bulkClose') as HTMLInputElement).value; fillAllHours(o, c); }} class="bg-orange-500 hover:bg-orange-600 text-white px-3 sm:px-5 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-medium transition shadow-sm">Apply All</button>
				<button onclick={clearAllHours} class="bg-gray-200 hover:bg-gray-300 text-gray-700 px-3 sm:px-5 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-medium transition">Clear</button>
			</div>

			<div class="space-y-3 sm:space-y-4">
				{#each DAYS as day}
					{@const isClosed = hours[day]?.closed || false}
					<div class="py-2">
						<div class="flex items-center justify-between mb-1.5 sm:mb-0">
							<span class="text-sm sm:text-base font-semibold text-gray-700">{day}</span>
							<label class="flex items-center gap-2 cursor-pointer select-none" title={isClosed ? 'Turn on' : 'Turn off'}>
								<div class="relative">
									<input type="checkbox" checked={!isClosed} onchange={() => updateHour(day, 'closed', !isClosed)} class="sr-only peer" />
									<div class="w-9 h-5 bg-red-400 peer-checked:bg-green-500 rounded-full transition-colors"></div>
									<div class="absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform peer-checked:translate-x-4"></div>
								</div>
								<span class={`text-xs font-semibold ${isClosed ? 'text-red-500' : 'text-green-600'}`}>{isClosed ? 'Closed' : 'Open'}</span>
							</label>
						</div>
						{#if !isClosed}
							<div class="flex items-center gap-2 sm:gap-4">
								<input type="time" value={hours[day]?.open || ''} oninput={(e) => updateHour(day, 'open', (e.currentTarget as HTMLInputElement).value)} class="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm sm:text-base focus:ring-2 focus:ring-orange-500/50" />
								<span class="text-gray-400 text-sm flex-shrink-0">to</span>
								<input type="time" value={hours[day]?.close || ''} oninput={(e) => updateHour(day, 'close', (e.currentTarget as HTMLInputElement).value)} class="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm sm:text-base focus:ring-2 focus:ring-orange-500/50" />
							</div>
						{/if}
					</div>
				{/each}
			</div>
		</div>

		<div class="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
			<div class="flex items-center justify-between">
				<div>
					<h2 class="text-xl font-bold text-red-800 flex items-center gap-2">
						<svg class="w-6 h-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" /></svg>
						Emergency Pause
					</h2>
					<p class="text-sm text-red-600 mt-1">Temporarily stop accepting all orders</p>
				</div>
				<button onclick={() => updateField('emergencyPause', !form.emergencyPause)} class={`relative w-16 h-8 rounded-full transition-colors duration-300 ${form.emergencyPause ? 'bg-red-500' : 'bg-gray-300'}`}>
					<span class={`absolute top-0.5 left-0.5 w-7 h-7 bg-white rounded-full shadow transition-transform duration-300 ${form.emergencyPause ? 'translate-x-8' : ''}`}></span>
				</button>
			</div>
		</div>
	</div>

	{#if toast.show}
		<div class={`fixed bottom-6 left-1/2 -translate-x-1/2 ${toast.type === 'error' ? 'bg-red-500' : 'bg-green-500'} text-white px-6 py-3 rounded-full shadow-lg z-[100] font-medium text-sm`}>{toast.message}</div>
	{/if}
</div>
