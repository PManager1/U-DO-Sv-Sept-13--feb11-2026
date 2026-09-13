<script lang="ts">
	import API_BASE from './api';
	import tokenManager from './tokenManager';

	let { open, onClose, onSelect, onSelectNew, onEdit = () => {}, currentAddress = '' } = $props();

	let addresses = $state<any[]>([]);
	let query = $state('');
	let suggestions = $state<any[]>([]);
	let fetching = $state(false);
	let debounceTimer: ReturnType<typeof setTimeout> | null = null;
	let loadingAddresses = $state(false);

	$effect(() => {
		if (!open) return;
		const onKey = (e: KeyboardEvent) => {
			if (e.key === 'Escape') onClose?.();
		};
		window.addEventListener('keydown', onKey);
		return () => window.removeEventListener('keydown', onKey);
	});

	function authHeaders() {
		return tokenManager.getHeaders();
	}

	async function loadAddresses() {
		const headers = authHeaders();
		if (!headers.Authorization) { addresses = []; return; }
		loadingAddresses = true;
		try {
			const res = await fetch(API_BASE + 'addresses', { headers });
			if (!res.ok) { addresses = []; return; }
			const data = await res.json();
			const list = Array.isArray(data) ? data : data.addresses || [];
			addresses = list.map((a: any) => ({
				id: a.id || a._id,
				street: a.street || '',
				cityStateZip: a.cityStateZip || '',
				label: a.label || '',
				addressType: a.addressType || 'house',
				deliveryPreference: a.deliveryPreference || 'leave_at_door',
				deliveryInstructions: a.deliveryInstructions || '',
				isGifting: !!a.isGifting,
				isDefault: !!a.is_default || !!a.isDefault,
				displayLabel: [a.street, a.cityStateZip].filter(Boolean).join(', ') || a.street || 'Address'
			}));
		} catch {
			addresses = [];
		} finally {
			loadingAddresses = false;
		}
	}

	$effect(() => {
		if (!open) return;
		query = '';
		suggestions = [];
		loadAddresses();
	});

	async function fetchSuggestions(input: string) {
		if (!input || input.length < 3) { suggestions = []; return; }
		fetching = true;
		try {
			const res = await fetch(API_BASE + 'autocomplete', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ input })
			});
			if (!res.ok) throw new Error('Autocomplete failed');
			const data = await res.json();
			suggestions = data.predictions || data.suggestions || [];
		} catch {
			suggestions = [];
		} finally {
			fetching = false;
		}
	}

	function handleQuery(v: string) {
		query = v;
		if (debounceTimer) clearTimeout(debounceTimer);
		debounceTimer = setTimeout(() => fetchSuggestions(v), 400);
	}

	function addAddress(label: string) {
		query = '';
		suggestions = [];
		onSelectNew?.(label);
		onClose?.();
	}

	function selectSaved(a: any) {
		onSelect?.(a.displayLabel || a.street || a.label);
		onClose?.();
		const headers = authHeaders();
		if (headers.Authorization && a.id) {
			fetch(API_BASE + 'addresses/' + a.id + '/touch', { method: 'PUT', headers }).catch(() => {});
			fetch(API_BASE + 'addresses/' + a.id + '/set-default', { method: 'PUT', headers })
				.then(() => loadAddresses())
				.catch(() => {});
		}
	}

	function editAddress(a: any) {
		onEdit?.(a);
		onClose?.();
	}
</script>

{#if open}
	<div class="fixed inset-0 z-[100] flex items-center justify-center p-4">
		<div class="absolute inset-0 bg-black/50" onclick={onClose}></div>
		<div class="relative w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
			<div class="flex items-center justify-between px-5 py-3 border-b border-gray-100 flex-shrink-0">
				<h3 class="text-lg font-bold text-gray-900">Select Address</h3>
				<button onclick={onClose} class="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-900 cursor-pointer">&times;</button>
			</div>
			<div class="p-5 flex-1 overflow-y-auto">
				<div class="relative">
					<svg class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
					<input value={query} oninput={(e) => handleQuery((e.currentTarget as HTMLInputElement).value)} placeholder="Search or enter a new address..." class="w-full bg-[#F3F4F6] border-none rounded-full pl-9 pr-8 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" autofocus />
					{#if query}
						<button onclick={() => { query = ''; suggestions = []; }} class="absolute right-3 top-1/2 -translate-y-1/2 text-gray-900">&times;</button>
					{/if}
				</div>
				{#if fetching}<p class="text-xs text-gray-900 mt-2">Loading...</p>{/if}
				{#if suggestions.length > 0}
					<div class="mt-1 max-h-48 overflow-y-auto">
						{#each suggestions as s, i}
							{@const label = s.description || s.text || s}
							<button onclick={() => addAddress(label)} class="w-full text-left px-3 py-2 text-sm text-gray-900 hover:bg-orange-50 rounded-lg flex items-center gap-2 cursor-pointer">
								<svg class="w-4 h-4 text-gray-900 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path stroke-linecap="round" stroke-linejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
								<span>{label}</span>
							</button>
						{/each}
					</div>
				{/if}

				<p class="text-md font-bold text-black mt-6 mb-2">Saved addresses</p>
				{#if loadingAddresses}
					<p class="text-sm text-black">Loading...</p>
				{:else if addresses.length === 0}
					<p class="text-sm text-gray-900">No saved addresses yet.</p>
				{:else}
					<div class="max-h-64 overflow-y-auto">
						{#each addresses as a}
							{@const selected = a.street === currentAddress || a.displayLabel === currentAddress}
							<div class={`flex items-center gap-2 py-3 border-b border-gray-100 ${selected ? 'bg-gray-100 rounded-xl px-3 my-1' : ''}`}>
								<button onclick={() => selectSaved(a)} class="flex-1 min-w-0 text-left text-sm text-black hover:text-orange-600 cursor-pointer">
									<span class="flex items-start gap-2">
										<svg class="w-4 h-4 text-black fill-current flex-shrink-0 mt-0.5" viewBox="0 0 24 24"><path d="M12 2a8 8 0 00-8 8c0 5.4 7 11.5 7.3 11.8a1 1 0 001.4 0C13 21.5 20 15.4 20 10a8 8 0 00-8-8zm0 11a3 3 0 110-6 3 3 0 010 6z" /></svg>
										<span class="min-w-0">
											{#if a.label && a.label !== 'none'}
												<span class="text-[10px] font-semibold uppercase tracking-wide bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded-full mr-1.5 align-middle">{a.label}</span>
											{/if}
											<span class="block text-sm font-semibold text-black break-words">{a.street || a.displayLabel}</span>
											{#if a.cityStateZip}<span class="block text-xs text-gray-500 truncate">{a.cityStateZip}</span>{/if}
											{#if a.isDefault}<span class="block text-xs text-orange-600 font-medium">Default</span>{/if}
										</span>
									</span>
								</button>
								<button onclick={() => editAddress(a)} class="p-1.5 text-gray-400 hover:text-gray-700" title="Edit">
									<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
								</button>
							</div>
						{/each}
					</div>
				{/if}
			</div>
		</div>
	</div>
{/if}
