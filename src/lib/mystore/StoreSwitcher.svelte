<script lang="ts">
	let { stores, activeStoreId, onSwitch, onAddNew }: {
		stores: any[];
		activeStoreId: string;
		onSwitch: (id: string) => void;
		onAddNew: () => void;
	} = $props();

	let dropdownOpen = $state(false);
	let container: HTMLDivElement;

	function handleClickOutside(e: MouseEvent) {
		if (container && !container.contains(e.target as Node)) dropdownOpen = false;
	}

	$effect(() => {
		document.addEventListener('mousedown', handleClickOutside);
		return () => document.removeEventListener('mousedown', handleClickOutside);
	});

	const activeStore = stores.find((s) => s.id === activeStoreId);
</script>

<div class="relative" bind:this={container}>
	<button onclick={() => (dropdownOpen = !dropdownOpen)} class="flex items-center gap-1 group min-w-0" title="Store options">
		<span class="text-sm font-bold text-black truncate">My Store</span>
		<svg class={`w-3.5 h-3.5 text-gray-500 transition-transform flex-shrink-0 ${dropdownOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" /></svg>
	</button>

	{#if dropdownOpen}
		<div class="absolute left-0 top-full mt-1.5 w-60 bg-white border border-gray-200 rounded-xl shadow-lg z-[60] overflow-hidden">
			{#if stores.length >= 2}
				<div class="px-3 py-2 bg-gray-50 border-b border-gray-100">
					<span class="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Current Location</span>
				</div>
				<div class="py-1">
					{#each stores as store}
						{@const isActive = store.id === activeStoreId}
						<button onclick={() => { if (!isActive) onSwitch(store.id); dropdownOpen = false; }} class={`w-full flex items-center gap-2.5 px-3 py-2.5 text-sm text-left transition ${isActive ? 'bg-orange-50 text-orange-700 font-semibold' : 'text-gray-700 hover:bg-gray-50'}`}>
							{#if store.logoUrl}
								<img src={store.logoUrl} alt="" class="w-6 h-6 rounded-full object-cover flex-shrink-0" />
							{:else}
								<span class="text-base flex-shrink-0">🏪</span>
							{/if}
							<div class="min-w-0 flex-1">
								<span class="truncate block">{store.name || 'Unnamed Store'}</span>
								{#if store.address}<span class="text-[10px] text-gray-400 truncate block">{store.address}</span>{/if}
							</div>
							{#if isActive}
								<svg class="w-4 h-4 text-orange-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" /></svg>
							{/if}
						</button>
					{/each}
				</div>
				<div class="border-t border-gray-100">
					<button onclick={() => { onAddNew(); dropdownOpen = false; }} class="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm text-orange-600 hover:bg-orange-50 font-semibold transition">
						<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" /></svg>
						Add New Location
					</button>
				</div>
			{:else}
				<div class="py-1">
					<button onclick={() => { onAddNew(); dropdownOpen = false; }} class="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm text-orange-600 hover:bg-orange-50 font-semibold transition">
						<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" /></svg>
						Add New Location
					</button>
				</div>
			{/if}
		</div>
	{/if}
</div>
