<script lang="ts">
	import servicesData from '$lib/services.json';

	const EMPTY_SERVICE = { id: '', name: '', icon: '📦', category: '', isActive: true };

	const CATEGORY_OPTIONS = [
		'Home Repair',
		'Cleaning',
		'Home Improvement',
		'Outdoor',
		'Automotive',
		'Moving',
		'Security',
		'Pets',
		'Home'
	];

	let services = $state<any[]>(servicesData);
	let activeCategory = $state<string | null>(null);
	let search = $state('');

	let showModal = $state(false);
	let editingId = $state<string | null>(null);
	let form = $state({ ...EMPTY_SERVICE });

	const categories = $derived([...new Set(services.map((s) => s.category))]);
	const filtered = $derived(
		services.filter((s) => {
			if (activeCategory && s.category !== activeCategory) return false;
			if (search && !s.name.toLowerCase().includes(search.toLowerCase())) return false;
			return true;
		})
	);
	const activeCount = $derived(services.filter((s) => s.isActive).length);

	function openAdd() {
		editingId = null;
		form = { ...EMPTY_SERVICE, id: 'srv_' + Date.now() };
		showModal = true;
	}

	function openEdit(service: any) {
		editingId = service.id;
		form = { ...service };
		showModal = true;
	}

	function handleSave() {
		if (!form.name.trim() || !form.category.trim()) return;
		if (editingId) {
			services = services.map((s) => (s.id === editingId ? { ...form } : s));
		} else {
			services = [...services, form];
		}
		showModal = false;
	}

	function handleDelete(id: string) {
		if (!window.confirm('Delete this service?')) return;
		services = services.filter((s) => s.id !== id);
	}

	function toggleService(id: string) {
		services = services.map((s) => (s.id === id ? { ...s, isActive: !s.isActive } : s));
	}
</script>

<div class="min-h-screen bg-gray-50">
	<header class="bg-white border-b border-gray-200">
		<div class="max-w-6xl mx-auto px-6 py-5">
			<a href="/admin/brands" class="text-orange-500 hover:text-orange-600 hover:underline text-sm">← Back to Brands</a>
			<div class="flex items-center justify-between mt-3">
				<div>
					<h1 class="text-2xl font-bold text-gray-900">Services Control</h1>
					<p class="text-sm text-gray-500">{services.length} services · {activeCount} active</p>
				</div>
				<button onclick={openAdd} class="bg-cyan-600 text-white px-4 py-2 rounded-lg hover:bg-cyan-700 text-sm font-medium">+ Add Service</button>
			</div>
		</div>
	</header>

	<main class="max-w-6xl mx-auto px-6 py-6">
		<div class="flex flex-wrap gap-2 mb-4">
			{#each categories as cat}
				<button
					onclick={() => (activeCategory = activeCategory === cat ? null : cat)}
					class={`px-4 py-2 rounded-lg text-sm font-medium border-2 transition-all ${activeCategory === cat ? 'bg-cyan-600 text-white border-cyan-600 shadow-sm' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300 hover:bg-gray-50'}`}
				>{cat}</button>
			{/each}
			{#if activeCategory}
				<button onclick={() => (activeCategory = null)} class="px-3 py-2 rounded-lg text-xs font-medium text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition">✕ Clear</button>
			{/if}
		</div>

		<div class="flex gap-3 mb-4">
			<input type="text" placeholder="Search services..." value={search} oninput={(e) => (search = (e.currentTarget as HTMLInputElement).value)} class="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-400" />
		</div>

		{#if filtered.length === 0}
			<div class="text-center py-12 text-gray-400">No services found.</div>
		{:else}
			<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
				{#each filtered as service}
					<div class="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-lg transition-shadow relative group">
						<input type="checkbox" checked={service.isActive} onchange={() => toggleService(service.id)} class="absolute top-3 right-3 w-5 h-5 rounded border-gray-300 text-cyan-600 focus:ring-cyan-500 cursor-pointer" />
						<div class="absolute top-3 left-3 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
							<button onclick={() => openEdit(service)} class="w-7 h-7 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 text-gray-500 text-xs font-bold" title="Edit">✏️</button>
							<button onclick={() => handleDelete(service.id)} class="w-7 h-7 flex items-center justify-center rounded-full bg-gray-100 hover:bg-red-100 text-gray-500 hover:text-red-600 text-xs font-bold" title="Delete">🗑️</button>
						</div>
						<div class="flex flex-col items-center text-center">
							<div class="w-20 h-20 rounded-xl overflow-hidden border border-gray-100 mb-3 flex-shrink-0 bg-cyan-100 flex items-center justify-center">
								<span class="text-3xl">{service.icon}</span>
							</div>
							<h3 class="font-semibold text-gray-900 text-lg">{service.name}</h3>
							<span class="text-xs px-2 py-0.5 rounded-full font-medium bg-gray-100 text-gray-600 mt-1">{service.category}</span>
							{#if service.isActive}
								<span class="text-xs px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600 mt-1">Active</span>
							{:else}
								<span class="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 mt-1">Inactive</span>
							{/if}
						</div>
					</div>
				{/each}
			</div>
		{/if}
	</main>

	{#if showModal}
		<div class="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onclick={() => (showModal = false)}>
			<div class="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 mx-4" onclick={(e) => e.stopPropagation()}>
				<div class="flex items-center justify-between mb-5">
					<h2 class="text-lg font-bold text-gray-900">{editingId ? 'Edit Service' : 'Add Service'}</h2>
					<button onclick={() => (showModal = false)} class="text-gray-400 hover:text-gray-600 text-xl">✕</button>
				</div>

				<div class="space-y-4">
					<div>
						<label class="text-xs font-semibold text-gray-600 mb-1 block">Service Name</label>
						<input type="text" value={form.name} oninput={(e) => (form = { ...form, name: (e.currentTarget as HTMLInputElement).value })} class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-400" placeholder="e.g. Plumbing" />
					</div>
					<div>
						<label class="text-xs font-semibold text-gray-600 mb-1 block">Icon (emoji)</label>
						<input type="text" value={form.icon} oninput={(e) => (form = { ...form, icon: (e.currentTarget as HTMLInputElement).value })} class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-400" placeholder="🔧" />
					</div>
					<div>
						<label class="text-xs font-semibold text-gray-600 mb-1 block">Category</label>
						<select value={form.category} onchange={(e) => (form = { ...form, category: (e.currentTarget as HTMLSelectElement).value })} class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-400 bg-white">
							<option value="">Select category</option>
							{#each CATEGORY_OPTIONS as c}
								<option value={c}>{c}</option>
							{/each}
						</select>
					</div>
					<div class="flex items-center gap-2">
						<input type="checkbox" id="modalActive" checked={form.isActive} onchange={(e) => (form = { ...form, isActive: (e.currentTarget as HTMLInputElement).checked })} class="w-4 h-4 rounded border-gray-300 text-cyan-600 focus:ring-cyan-500" />
						<label for="modalActive" class="text-sm text-gray-700">Active</label>
					</div>
				</div>

				<div class="flex gap-3 mt-6">
					<button onclick={() => (showModal = false)} class="flex-1 px-4 py-2 rounded-lg border border-gray-300 text-sm font-medium text-gray-600 hover:bg-gray-50 transition">Cancel</button>
					<button onclick={handleSave} class="flex-1 px-4 py-2 rounded-lg bg-cyan-600 text-white text-sm font-medium hover:bg-cyan-700 transition">{editingId ? 'Save Changes' : 'Add Service'}</button>
				</div>
			</div>
		</div>
	{/if}
</div>
