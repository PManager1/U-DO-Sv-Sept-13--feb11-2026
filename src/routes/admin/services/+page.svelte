<script lang="ts">
	import { onMount } from 'svelte';
	import API_BASE from '$lib/api';

	const sfToEmoji: Record<string, string> = {
		'bag.fill': '🍔',
		'square.grid.2x2.fill': '📱',
		'fork.knife': '🍽️',
		'car.2.fill': '🚗',
		'box.truck': '🚚',
		'person.2.fill': '👥',
		'shippingbox.fill': '📦',
		'flame.fill': '🔥',
		'book.fill': '📚',
		'pawprint.fill': '🐾',
		'sparkles': '✨',
		'figure.walk': '🚶',
		'calendar': '📅',
		'wrench.and.screwdriver.fill': '🔧',
		'bolt.fill': '⚡',
		'leaf.fill': '🍃',
		'pencil.and.ruler.fill': '✏️'
	};

	function getEmoji(icon: string) {
		if (!icon) return '📦';
		return sfToEmoji[icon] || '📦';
	}

	let allServices = $state<any[]>([]);
	let servicesLoading = $state(true);
	let servicesError = $state<string | null>(null);
	let togglingId = $state<string | null>(null);

	onMount(() => {
		loadServices();
	});

	async function loadServices() {
		servicesLoading = true;
		servicesError = null;
		try {
			const res = await fetch(API_BASE + 'admin/categories');
			const data = await res.json();
			if (data.categories) {
				allServices = data.categories;
			} else if (data.success === false) {
				servicesError = data.message || 'Failed to load';
			} else {
				servicesError = 'Unexpected response format';
			}
		} catch (err) {
			servicesError = (err as Error).message;
		} finally {
			servicesLoading = false;
		}
	}

	async function toggleServiceActive(categoryId: string, currentActive: boolean) {
		togglingId = categoryId;
		try {
			const res = await fetch(API_BASE + `admin/categories/${categoryId}/toggle`, {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ is_active: !currentActive })
			});
			const data = await res.json();
			if (data.success) {
				allServices = allServices.map((s) => (s.id === categoryId ? { ...s, is_active: !currentActive } : s));
			}
		} catch (err) {
			console.error('Toggle failed:', err);
		} finally {
			togglingId = null;
		}
	}
</script>

<header class="bg-white border-b border-gray-200">
	<div class="max-w-6xl mx-auto px-4 sm:px-6 py-4 sm:py-6">
		<div class="flex items-center gap-3">
			<a href="/admin/" class="w-9 h-9 sm:w-10 sm:h-10 bg-gray-100 rounded-xl flex items-center justify-center hover:bg-gray-200 transition">
				<svg class="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" /></svg>
			</a>
			<div class="w-9 h-9 sm:w-10 sm:h-10 bg-emerald-500 rounded-xl flex items-center justify-center">
				<svg class="w-5 h-5 sm:w-6 sm:h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 10h16M4 14h16M4 18h16" /></svg>
			</div>
			<div>
				<h1 class="text-xl sm:text-2xl font-bold text-gray-900">All Services</h1>
				<p class="text-xs sm:text-sm text-gray-500">Manage and toggle service categories</p>
			</div>
		</div>
	</div>
</header>

<main class="max-w-6xl mx-auto px-3 sm:px-6 py-4 sm:py-8">
	<div class="bg-white rounded-xl border border-gray-200 mb-6 sm:mb-8 overflow-hidden">
		<div class="px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-100 flex items-center justify-between">
			<div class="flex items-center gap-2 sm:gap-3">
				<div class="w-7 h-7 sm:w-8 sm:h-8 bg-emerald-100 rounded-lg flex items-center justify-center">
					<svg class="w-4 h-4 sm:w-5 sm:h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 10h16M4 14h16M4 18h16" /></svg>
				</div>
				<div>
					<h2 class="text-base sm:text-lg font-semibold text-gray-800">Services ({allServices.length})</h2>
					<p class="text-[10px] sm:text-xs text-gray-400">Auto-loaded from /admin/categories</p>
				</div>
			</div>
			<button onclick={loadServices} class="text-xs text-gray-500 hover:text-gray-700 flex items-center gap-1 px-2 sm:px-3 py-1.5 rounded-lg hover:bg-gray-50 border border-gray-200">
				<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
				<span class="hidden sm:inline">Refresh</span>
			</button>
		</div>

		{#if servicesLoading}
			<div class="px-4 sm:px-6 py-10 flex items-center justify-center gap-3 text-gray-400">
				<svg class="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path></svg>
				Loading services...
			</div>
		{:else if servicesError}
			<div class="px-4 sm:px-6 py-8 text-center">
				<p class="text-red-500 text-sm font-medium">Error loading services</p>
				<p class="text-red-400 text-xs mt-1">{servicesError}</p>
			</div>
		{:else if allServices.length === 0}
			<div class="px-4 sm:px-6 py-8 text-center text-gray-400 text-sm">No services found</div>
		{:else}
			<div class="divide-y divide-gray-100">
				{#each allServices as service}
					{@const isActive = service.is_active !== false}
					{@const isToggling = togglingId === service.id}
					<div class="flex items-center gap-3 sm:gap-4 px-4 sm:px-6 py-3 sm:py-4 hover:bg-gray-50/50 transition-colors">
						<div class="w-9 h-9 sm:w-10 sm:h-10 bg-gray-100 rounded-lg sm:rounded-xl flex items-center justify-center flex-shrink-0 text-lg sm:text-xl">{getEmoji(service.icon)}</div>
						<div class="flex-1 min-w-0">
							<div class="flex items-center gap-1.5 sm:gap-2 flex-wrap">
								<span class="font-medium text-sm sm:text-base text-gray-900">{service.name || service.id}</span>
								{#if service.is_menu_based}<span class="text-[9px] sm:text-[10px] bg-orange-50 text-orange-700 px-1.5 sm:px-2 py-0.5 rounded-full font-medium">Menu-Based</span>{/if}
								{#if service.group}<span class="text-[9px] sm:text-[10px] bg-blue-50 text-blue-700 px-1.5 sm:px-2 py-0.5 rounded-full">{service.group}</span>{/if}
							</div>
							{#if service.description}<p class="text-[11px] sm:text-xs text-gray-400 mt-0.5 line-clamp-1">{service.description}</p>{/if}
						</div>
						<button
							onclick={() => toggleServiceActive(service.id, isActive)}
							disabled={isToggling}
							class={`relative inline-flex h-6 w-11 sm:h-7 sm:w-12 flex-shrink-0 items-center rounded-full transition-colors duration-200 focus:outline-none ${isToggling ? 'bg-gray-200 opacity-60 cursor-wait' : isActive ? 'bg-emerald-500 cursor-pointer' : 'bg-gray-300 cursor-pointer'}`}
						>
							<span class={`inline-block h-4 w-4 sm:h-5 sm:w-5 transform rounded-full bg-white shadow-sm transition-transform duration-200 ${isActive ? 'translate-x-5 sm:translate-x-6' : 'translate-x-1'}`}></span>
						</button>
					</div>
				{/each}
			</div>
		{/if}
	</div>

	<div class="text-center text-xs text-gray-400 py-4 sm:py-6 border-t border-gray-100">
		<a href="/admin/" class="text-orange-500 hover:text-orange-600 hover:underline">← Back to Admin Dashboard</a>
	</div>
</main>
