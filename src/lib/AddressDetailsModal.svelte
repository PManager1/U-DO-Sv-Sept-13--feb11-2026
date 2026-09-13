<script lang="ts">
	import { fade, scale } from 'svelte/transition';

	let {
		open,
		address = $bindable(''),
		deliveryPreference = $bindable('leave_at_door'),
		deliveryInstructions = $bindable(''),
		personalLabel = $bindable('none'),
		isGifting = $bindable(false),
		saving = $bindable(false),
		onSave,
		onBack,
		onClose
	} = $props();

	let selectedLabel = $state(personalLabel);
	let customLabel = $state('');

	function resolveLabel() {
		if (selectedLabel === 'custom') return customLabel.trim() || 'custom';
		return selectedLabel;
	}

	$effect(() => {
		if (open) {
			const isStandard = ['none', 'home', 'work', 'custom'].includes(personalLabel);
			if (personalLabel && !isStandard) {
				selectedLabel = 'custom';
				customLabel = personalLabel;
			} else {
				selectedLabel = personalLabel;
				customLabel = '';
			}
		}
	});

	$effect(() => {
		if (!open) return;
		const onKey = (e: KeyboardEvent) => {
			if (e.key === 'Escape') onClose();
		};
		window.addEventListener('keydown', onKey);
		return () => window.removeEventListener('keydown', onKey);
	});
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
					<h3 class="text-lg font-bold text-gray-900 leading-tight">Address details</h3>
					{#if address}<p class="text-xs text-gray-900 truncate">{address}</p>{/if}
				</div>
				<button onclick={onClose} class="w-9 h-9 rounded-full bg-gray-100 hover:bg-gray-200 active:scale-90 transition flex items-center justify-center text-gray-700 flex-shrink-0">
					<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" /></svg>
				</button>
			</div>

			<iframe title="Address map" src={`https://www.google.com/maps?q=${encodeURIComponent(address)}&output=embed`} class="w-full h-32 border-0" loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe>

			<div class="p-5 flex-1 overflow-y-auto">
				<!-- Address -->
				<p class="text-sm font-bold text-gray-900 mb-2">Address</p>
				<input
					bind:value={address}
					type="text"
					placeholder="e.g. 1875 18th St NW"
					class="w-full border border-gray-300 rounded-2xl px-3.5 py-3 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-400"
				/>

				<!-- Delivery preferences -->
				<p class="text-sm font-bold text-gray-900 mt-6 mb-2">Delivery preferences</p>
				<div class="space-y-2">
					<button
						onclick={() => (deliveryPreference = 'leave_at_door')}
						class={`relative w-full flex items-center gap-3 p-3.5 rounded-2xl border transition-all text-left duration-150 active:scale-[0.98] ${deliveryPreference === 'leave_at_door' ? 'ring-2 ring-orange-500 border-orange-500 bg-orange-50/60' : 'border-gray-200 bg-white hover:border-gray-300'}`}
					>
						<svg class={`w-6 h-6 flex-shrink-0 ${deliveryPreference === 'leave_at_door' ? 'text-orange-600' : 'text-gray-700'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12h3m3-6v6l-4 4m4-10l4 4h3m-8 6H8m3 0h4m-3 0h3m-3-6V6m4 6l4 4m-4-4h2" /></svg>
						<span class="text-base text-gray-900 font-medium">Leave at door</span>
						{#if deliveryPreference === 'leave_at_door'}
							<span class="ml-auto w-5 h-5 rounded-full bg-orange-500 flex items-center justify-center shadow">
								<svg class="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="3"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" /></svg>
							</span>
						{/if}
					</button>
					<button
						onclick={() => (deliveryPreference = 'meet_at_location')}
						class={`relative w-full flex items-center gap-3 p-3.5 rounded-2xl border transition-all text-left duration-150 active:scale-[0.98] ${deliveryPreference === 'meet_at_location' ? 'ring-2 ring-orange-500 border-orange-500 bg-orange-50/60' : 'border-gray-200 bg-white hover:border-gray-300'}`}
					>
						<svg class={`w-6 h-6 flex-shrink-0 ${deliveryPreference === 'meet_at_location' ? 'text-orange-600' : 'text-gray-700'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0zM15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
						<span class="text-base text-gray-900 font-medium">Meet at location</span>
						{#if deliveryPreference === 'meet_at_location'}
							<span class="ml-auto w-5 h-5 rounded-full bg-orange-500 flex items-center justify-center shadow">
								<svg class="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="3"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" /></svg>
							</span>
						{/if}
					</button>
				</div>

				<!-- Delivery instructions -->
				<p class="text-sm font-bold text-gray-900 mt-6 mb-2">Delivery instructions</p>
				<textarea
					bind:value={deliveryInstructions}
					rows={3}
					placeholder="e.g. ring the bell after dropoff, leave next to the porch, call upon arrival, etc."
					class="w-full border border-gray-300 rounded-2xl px-3.5 py-3 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-400 resize-none"
				></textarea>
				<p class="text-xs text-gray-500 mt-1.5">Do not add order changes or requests here.</p>

				<!-- Personal label -->
				<hr class="my-6 border-gray-100" />
				<p class="text-sm font-bold text-gray-900 mb-2">Personal label</p>
				<div class="flex flex-wrap gap-2">
				{#each ['none', 'home', 'work', 'custom'] as p}
					<button
						onclick={() => { selectedLabel = p; personalLabel = p; }}
						class={`px-4 py-2 rounded-full text-sm font-medium capitalize transition ${selectedLabel === p ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-900 hover:bg-gray-200'}`}
					>
						{p}
					</button>
				{/each}
				</div>
				{#if selectedLabel === 'custom'}
					<input
						type="text"
						bind:value={customLabel}
						oninput={() => (personalLabel = customLabel.trim() || 'custom')}
						placeholder="e.g. hotel, office, gym"
						class="mt-2 w-full border border-gray-300 rounded-2xl px-3.5 py-3 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-400"
					/>
				{/if}
				<p class="text-xs text-gray-500 mt-1.5">Only you can see this.</p>

				<!-- Gifting option -->
				<hr class="my-6 border-gray-100" />
				<div class="flex items-center gap-3">
					<input type="checkbox" bind:checked={isGifting} class="w-5 h-5 rounded border-gray-300 text-orange-500 focus:ring-orange-400" />
					<div class="flex-1">
						<p class="text-sm font-bold text-gray-900">I'm sending a gift</p>
						<p class="text-xs text-gray-500">Add a card and note at checkout</p>
					</div>
					<svg class="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
				</div>
			</div>

			<div class="p-4 border-t border-gray-100 flex-shrink-0">
				<button onclick={() => onSave(resolveLabel())} disabled={saving} class="w-full rounded-full py-3.5 text-base font-semibold text-white bg-orange-500 hover:bg-orange-600 active:scale-[0.98] transition-all shadow-lg shadow-orange-500/25 disabled:opacity-50 disabled:cursor-not-allowed">{saving ? 'Saving...' : 'Save address'}</button>
			</div>
		</div>
	</div>
{/if}
