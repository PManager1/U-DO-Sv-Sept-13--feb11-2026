<script lang="ts">
	import { fade, scale } from 'svelte/transition';

	type AddressOption = {
		id: 'house' | 'apartment' | 'hotel' | 'office' | 'other';
		label: string;
		iconName: string;
	};

	let { open, address = '', selectedType = $bindable('house'), onNext, onBack, onClose } = $props();

	$effect(() => {
		if (!open) return;
		const onKey = (e: KeyboardEvent) => {
			if (e.key === 'Escape') onClose();
		};
		window.addEventListener('keydown', onKey);
		return () => window.removeEventListener('keydown', onKey);
	});

	const options: AddressOption[] = [
		{ id: 'house', label: 'House', iconName: 'home' },
		{ id: 'apartment', label: 'Apartment', iconName: 'building' },
		{ id: 'hotel', label: 'Hotel', iconName: 'concierge-bell' },
		{ id: 'office', label: 'Office', iconName: 'building-2' },
		{ id: 'other', label: 'Other', iconName: 'map-pin' }
	];

	const icons: Record<string, string> = {
		home: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l9-9 9 9M5 10v10a1 1 0 001 1h3v-6h6v6h3a1 1 0 001-1V10" />',
		building: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0H3m14 0h3M5 21H3M9 7h1m4 0h1M9 11h1m4 0h1M9 15h1m4 0h1" />',
		'concierge-bell': '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18 15a6 6 0 00-12 0M3 15h18m-9-6V7a1 1 0 011-1h1a1 1 0 011 1v1M4 19h16" />',
		'building-2': '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 21V5a2 2 0 012-2h4a2 2 0 012 2v16m-8 0h8m-8 0H3a1 1 0 01-1-1v-4a1 1 0 011-1h5m8 0h5a1 1 0 011 1v4a1 1 0 01-1 1h-5M10 7h4m-4 4h4" />',
		'map-pin': '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0zM15 11a3 3 0 11-6 0 3 3 0 016 0z" />'
	};
</script>

{#if open}
	<div class="fixed inset-0 z-[100] flex items-center justify-center p-4">
		<div class="absolute inset-0 bg-black/50 backdrop-blur-sm" transition:fade={{ duration: 150 }} onclick={onClose}></div>
		<div transition:scale={{ duration: 180, start: 0.95 }} class="relative w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
			<div class="flex items-center px-4 py-3.5 border-b border-gray-100 flex-shrink-0">
				<button onclick={onBack} aria-label="Go back" class="w-9 h-9 rounded-full bg-gray-100 hover:bg-gray-200 active:scale-90 transition flex items-center justify-center text-gray-700 flex-shrink-0">
					<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" /></svg>
				</button>
				<div class="flex-1 text-center px-2 min-w-0">
					<h3 class="text-lg font-bold text-gray-900 leading-tight">Address type</h3>
					{#if address}<p class="text-xs text-gray-900 truncate">{address}</p>{/if}
				</div>
				<button onclick={onClose} class="w-9 h-9 rounded-full bg-gray-100 hover:bg-gray-200 active:scale-90 transition flex items-center justify-center text-gray-700 flex-shrink-0">
					<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" /></svg>
				</button>
			</div>
			<div class="p-5 flex-1 overflow-y-auto">
				<div class="grid grid-cols-2 gap-3">
					{#each options as o}
						<button
							onclick={() => (selectedType = o.id)}
							class={`relative group p-4 flex flex-col justify-between h-28 rounded-2xl border transition-all text-left duration-150 active:scale-[0.97] ${selectedType === o.id ? 'ring-2 ring-orange-500 border-orange-500 bg-orange-50/60 shadow-sm' : 'border-gray-200 bg-white text-gray-900 hover:border-gray-300 hover:shadow-md hover:-translate-y-0.5'}`}
						>
							{#if selectedType === o.id}
								<span class="absolute top-2.5 right-2.5 w-5 h-5 rounded-full bg-orange-500 flex items-center justify-center shadow">
									<svg class="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="3"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" /></svg>
								</span>
							{/if}
							<svg class={`w-6 h-6 transition-colors ${selectedType === o.id ? 'text-orange-600' : 'text-gray-700'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">{@html icons[o.iconName]}</svg>
							<span class="font-medium text-base text-gray-900">{o.label}</span>
						</button>
					{/each}
				</div>
				<button onclick={onNext} class="w-full rounded-full py-3.5 mt-5 text-base font-semibold text-white bg-orange-500 hover:bg-orange-600 active:scale-[0.98] transition-all shadow-lg shadow-orange-500/25">Next</button>
			</div>
		</div>
	</div>
{/if}
