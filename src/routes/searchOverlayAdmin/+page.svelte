<script lang="ts">
	import { onMount } from 'svelte';
	import API_BASE from '$lib/api';

	let allItems = $state<any[]>([]);
	let currentFilter = $state('all');
	let loading = $state(true);
	let showModal = $state(false);
	let formMode = $state<'add' | 'edit'>('add');
	let formOriginalId = $state('');
	let toast = $state<{ message: string; type: string } | null>(null);
	let form = $state({ id: '', label: '', href: '', image: '', section: 'recent_searches', sort_order: 1 });

	const adminItems = API_BASE + 'admin/search-overlay-items';
	const filters = ['all', 'recent_searches', 'popular_on_udo', 'trending_now'];
	const sectionConfig: Record<string, { class: string; label: string }> = {
		recent_searches: { class: 'bg-blue-100 text-blue-800', label: 'Recent' },
		popular_on_udo: { class: 'bg-amber-100 text-amber-800', label: 'Popular' },
		trending_now: { class: 'bg-purple-100 text-purple-800', label: 'Trending' }
	};

	onMount(() => {
		loadItems();
	});

	function showToastMsg(message: string, type = 'success') {
		toast = { message, type };
		setTimeout(() => (toast = null), 3000);
	}

	async function loadItems() {
		loading = true;
		try {
			const res = await fetch(adminItems);
			const json = await res.json();
			allItems = json.items || [];
		} catch {
			showToastMsg('Failed to load items', 'error');
		} finally {
			loading = false;
		}
	}

	function getFiltered() {
		let filtered = currentFilter === 'all' ? [...allItems] : allItems.filter((i) => i.section === currentFilter);
		filtered.sort((a, b) => (a.section !== b.section ? a.section.localeCompare(b.section) : a.sort_order - b.sort_order));
		return filtered;
	}

	const filtered = $derived(getFiltered());

	function filterSection(section: string) {
		currentFilter = section;
	}

	async function toggleItem(id: string, isActive: boolean) {
		try {
			const res = await fetch(`${adminItems}/${id}/toggle`, {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ is_active: isActive })
			});
			const json = await res.json();
			if (json.success) {
				allItems = allItems.map((i) => (i.id === id ? { ...i, is_active: isActive } : i));
				showToastMsg(`Item ${isActive ? 'enabled' : 'disabled'}`);
			} else {
				showToastMsg(json.message || 'Failed to toggle', 'error');
				loadItems();
			}
		} catch {
			showToastMsg('Failed to toggle item', 'error');
			loadItems();
		}
	}

	function showAddModal() {
		formMode = 'add';
		formOriginalId = '';
		form = { id: '', label: '', href: '', image: '', section: 'recent_searches', sort_order: 1 };
		showModal = true;
	}

	function editItem(id: string) {
		const item = allItems.find((i) => i.id === id);
		if (!item) return;
		formMode = 'edit';
		formOriginalId = id;
		form = { id: item.id, label: item.label, href: item.href, image: item.image, section: item.section, sort_order: item.sort_order };
		showModal = true;
	}

	async function handleFormSubmit(e: Event) {
		e.preventDefault();
		const payload: any = { ...form, sort_order: parseInt(String(form.sort_order), 10) || 1, is_active: true };
		try {
			let url, method;
			if (formMode === 'add') {
				url = adminItems;
				method = 'POST';
			} else {
				url = `${adminItems}/${formOriginalId}`;
				method = 'PUT';
				const existing = allItems.find((i) => i.id === formOriginalId);
				if (existing) payload.is_active = existing.is_active;
			}
			const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
			const json = await res.json();
			if (json.success || res.ok) {
				showToastMsg(formMode === 'add' ? 'Item created!' : 'Item updated!');
				showModal = false;
				loadItems();
			} else showToastMsg(json.message || 'Failed to save', 'error');
		} catch {
			showToastMsg('Failed to save item', 'error');
		}
	}

	async function deleteItem(id: string) {
		if (!window.confirm('Delete this item? This cannot be undone.')) return;
		try {
			const res = await fetch(`${adminItems}/${id}`, { method: 'DELETE' });
			const json = await res.json();
			if (json.success) {
				showToastMsg('Item deleted');
				loadItems();
			} else showToastMsg(json.message || 'Failed to delete', 'error');
		} catch {
			showToastMsg('Failed to delete item', 'error');
		}
	}
</script>

<header class="bg-white border-b border-gray-200 sticky top-0 z-50">
	<div class="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
		<div>
			<h1 class="text-2xl font-bold text-gray-900">Search Overlay Admin</h1>
			<p class="text-sm text-gray-500 mt-1">Toggle items on/off to control what appears in the search overlay</p>
		</div>
		<div class="flex gap-3">
			<button onclick={loadItems} class="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-medium text-gray-700 transition">↻ Refresh</button>
			<button onclick={showAddModal} class="px-4 py-2 bg-orange-500 hover:bg-orange-600 rounded-lg text-sm font-medium text-white transition">+ Add Item</button>
		</div>
	</div>
</header>

<div class="max-w-6xl mx-auto px-6 mt-6">
	<div class="flex gap-2">
		{#each filters as f}
			<button onclick={() => filterSection(f)} class={`px-4 py-2 rounded-full text-sm font-medium transition ${currentFilter === f ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>
				{f === 'all' ? 'All' : f === 'recent_searches' ? 'Recent Searches' : f === 'popular_on_udo' ? 'Popular on UDO' : 'Trending Now'}
			</button>
		{/each}
	</div>
</div>

<main class="max-w-6xl mx-auto px-6 py-6">
	{#if loading}<div class="text-center py-12 text-gray-400">Loading items...</div>{/if}
	{#if !loading && filtered.length === 0}<div class="text-center py-12 text-gray-400">No items found.</div>{/if}
	<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
		{#each filtered as item}
			{@const sec = sectionConfig[item.section] || { class: 'bg-gray-100 text-gray-800', label: item.section }}
			<div class={`bg-white rounded-xl border border-gray-200 p-4 transition-all hover:shadow-md ${!item.is_active ? 'opacity-50' : ''}`}>
				<div class="flex items-start gap-3">
					<img src={item.image} alt={item.label} class="w-16 h-16 rounded-lg object-cover flex-shrink-0 bg-gray-100" onerror={(e) => { (e.currentTarget as HTMLImageElement).src = "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' width='64' height='64'><rect fill='%23f3f4f6' width='64' height='64'/><text x='50%25' y='50%25' text-anchor='middle' dy='.3em' fill='%239ca3af' font-size='12'>No img</text></svg>"; }} />
					<div class="flex-1 min-w-0">
						<div class="flex items-center gap-2 mb-1">
							<h3 class="font-semibold text-gray-900 truncate">{item.label}</h3>
							<span class={`text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full ${sec.class}`}>{sec.label}</span>
						</div>
						<p class="text-xs text-gray-500 truncate">{item.href}</p>
						<p class="text-xs text-gray-400 mt-1">Order: {item.sort_order} · ID: {item.id}</p>
					</div>
				</div>
				<div class="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
					<div class="flex items-center gap-2">
						<label class="relative w-12 h-[26px] cursor-pointer">
							<input type="checkbox" checked={item.is_active} onchange={(e) => toggleItem(item.id, (e.currentTarget as HTMLInputElement).checked)} class="sr-only peer" />
							<span class="absolute inset-0 bg-gray-300 rounded-full transition peer-checked:bg-green-500"></span>
							<span class="absolute left-[3px] bottom-[3px] w-5 h-5 bg-white rounded-full transition peer-checked:translate-x-[22px]"></span>
						</label>
						<span class={`text-xs font-medium ${item.is_active ? 'text-green-600' : 'text-gray-400'}`}>{item.is_active ? 'Active' : 'Disabled'}</span>
					</div>
					<div class="flex gap-1">
						<button onclick={() => editItem(item.id)} class="p-1.5 hover:bg-gray-100 rounded-lg transition" title="Edit">
							<svg class="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
						</button>
						<button onclick={() => deleteItem(item.id)} class="p-1.5 hover:bg-red-50 rounded-lg transition" title="Delete">
							<svg class="w-4 h-4 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
						</button>
					</div>
				</div>
			</div>
		{/each}
	</div>
</main>

{#if showModal}
	<div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onclick={(e) => { if (e.target === e.currentTarget) showModal = false; }}>
		<div class="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 p-6">
			<div class="flex items-center justify-between mb-6">
				<h2 class="text-xl font-bold text-gray-900">{formMode === 'add' ? 'Add New Item' : 'Edit Item'}</h2>
				<button onclick={() => (showModal = false)} class="p-1 hover:bg-gray-100 rounded-full">
					<svg class="w-6 h-6 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" /></svg>
				</button>
			</div>
			<form onsubmit={handleFormSubmit} class="space-y-4">
				<div>
					<label class="block text-sm font-medium text-gray-700 mb-1">ID</label>
					<input type="text" required value={form.id} disabled={formMode === 'edit'} oninput={(e) => (form = { ...form, id: (e.currentTarget as HTMLInputElement).value })} placeholder="e.g. recent-plumbing" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 text-sm disabled:bg-gray-100" />
				</div>
				<div>
					<label class="block text-sm font-medium text-gray-700 mb-1">Label</label>
					<input type="text" required value={form.label} oninput={(e) => (form = { ...form, label: (e.currentTarget as HTMLInputElement).value })} placeholder="e.g. Plumbing" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 text-sm" />
				</div>
				<div>
					<label class="block text-sm font-medium text-gray-700 mb-1">Link (href)</label>
					<input type="text" required value={form.href} oninput={(e) => (form = { ...form, href: (e.currentTarget as HTMLInputElement).value })} placeholder="e.g. profiles-list/" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 text-sm" />
				</div>
				<div>
					<label class="block text-sm font-medium text-gray-700 mb-1">Image Path</label>
					<input type="text" required value={form.image} oninput={(e) => (form = { ...form, image: (e.currentTarget as HTMLInputElement).value })} placeholder="e.g. img/plumbing.webp" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 text-sm" />
				</div>
				<div>
					<label class="block text-sm font-medium text-gray-700 mb-1">Section</label>
					<select required value={form.section} onchange={(e) => (form = { ...form, section: (e.currentTarget as HTMLSelectElement).value })} class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 text-sm">
						<option value="recent_searches">Recent Searches</option>
						<option value="popular_on_udo">Popular on UDO</option>
						<option value="trending_now">Trending Now</option>
					</select>
				</div>
				<div>
					<label class="block text-sm font-medium text-gray-700 mb-1">Sort Order</label>
					<input type="number" value={form.sort_order} min="1" oninput={(e) => (form = { ...form, sort_order: Number((e.currentTarget as HTMLInputElement).value) })} class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 text-sm" />
				</div>
				<div class="flex gap-3 mt-6">
					<button type="button" onclick={() => (showModal = false)} class="flex-1 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-medium text-gray-700 transition">Cancel</button>
					<button type="submit" class="flex-1 px-4 py-2 bg-orange-500 hover:bg-orange-600 rounded-lg text-sm font-medium text-white transition">Save</button>
				</div>
			</form>
		</div>
	</div>
{/if}

{#if toast}
	<div class={`fixed bottom-6 right-6 px-6 py-3 rounded-lg text-white font-medium z-[1000] ${toast.type === 'error' ? 'bg-red-500' : 'bg-green-500'}`}>{toast.message}</div>
{/if}
