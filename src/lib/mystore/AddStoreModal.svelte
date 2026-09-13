<script lang="ts">
	const STORE_TYPES = [
		{ value: '', label: 'Select type...' },
		{ value: 'cafe', label: '☕ Cafe' },
		{ value: 'restaurant', label: '🍽️ Restaurant' },
		{ value: 'grocery', label: '🛒 Grocery / Convenience' },
		{ value: 'flowers', label: '💐 Flower Shop / Boutique' },
		{ value: 'bakery', label: '🧁 Bakery' },
		{ value: 'food_truck', label: '🚚 Food Truck' },
		{ value: 'other', label: '📦 Other' }
	];

	let { onClose, onCreated }: {
		onClose: () => void;
		onCreated: (store: any) => void;
	} = $props();

	let form = $state({ name: '', address: '', type: '' });
	let saving = $state(false);

	function handleSubmit(e: Event) {
		e.preventDefault();
		if (!form.name.trim()) return;
		saving = true;
		const newStore = {
			id: 'store_' + crypto.randomUUID().replace(/-/g, '').substring(0, 12),
			name: form.name.trim(),
			address: form.address.trim(),
			type: form.type,
			logoUrl: '',
			active: false
		};
		setTimeout(() => {
			onCreated(newStore);
			saving = false;
		}, 300);
	}
</script>

<div class="fixed inset-0 bg-black/40 z-[200]" onclick={onClose}></div>
<div class="fixed inset-0 z-[201] flex items-center justify-center p-4">
	<div class="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
		<div class="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
			<div>
				<h2 class="text-lg font-bold text-gray-900">Add Another Location</h2>
				<p class="text-xs text-gray-500 mt-0.5">Add a new store or restaurant location</p>
			</div>
			<button onclick={onClose} class="p-2 hover:bg-gray-100 rounded-full transition">
				<svg class="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" /></svg>
			</button>
		</div>

		<form onsubmit={handleSubmit} class="p-6 space-y-5">
			<div>
				<label class="block text-sm font-semibold text-gray-700 mb-1">Store Name <span class="text-red-500">*</span></label>
				<input type="text" value={form.name} oninput={(e) => (form = { ...form, name: (e.currentTarget as HTMLInputElement).value })} class="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500" placeholder="e.g., Joe's Burgers" autofocus required />
			</div>
			<div>
				<label class="block text-sm font-semibold text-gray-700 mb-1">Store Type</label>
				<select value={form.type} onchange={(e) => (form = { ...form, type: (e.currentTarget as HTMLSelectElement).value })} class="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 cursor-pointer">
					{#each STORE_TYPES as t}<option value={t.value}>{t.label}</option>{/each}
				</select>
			</div>
			<div>
				<label class="block text-sm font-semibold text-gray-700 mb-1">Address</label>
				<input type="text" value={form.address} oninput={(e) => (form = { ...form, address: (e.currentTarget as HTMLInputElement).value })} class="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500" placeholder="123 Main St, City, State" />
			</div>
			<div class="flex gap-3 pt-2">
				<button type="button" onclick={onClose} class="flex-1 py-2.5 px-4 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-lg text-sm transition">Cancel</button>
				<button type="submit" disabled={saving || !form.name.trim()} class="flex-1 py-2.5 px-4 bg-orange-500 hover:bg-orange-600 disabled:bg-orange-300 text-white font-bold rounded-lg text-sm transition shadow-sm flex items-center justify-center gap-2">
					{#if saving}<div class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>{/if}
					{saving ? 'Adding...' : 'Add Location'}
				</button>
			</div>
		</form>
	</div>
</div>
