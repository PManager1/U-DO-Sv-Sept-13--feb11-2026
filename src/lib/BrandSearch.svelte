<script lang="ts">
	import BrandSuggestions from '$lib/BrandSuggestions.svelte';
	import { storePath } from '$lib/storePath';

	let { placeholder = 'search anything you want to buy', onSubmit }: {
		placeholder?: string;
		onSubmit?: (q: string) => void;
	} = $props();

	let query = $state('');
	let brandSuggestions = $state<BrandSuggestions>();

	function go(brand: any) {
		window.location.href = storePath(brand);
		query = '';
	}

	function onKeydown(e: KeyboardEvent) {
		if (brandSuggestions?.handleKeydown(e)) return;
		if (e.key === 'Enter') submit();
	}

	function submit() {
		const q = query.trim();
		if (!q) return;
		if (onSubmit) {
			onSubmit(q);
		} else {
			window.location.href = '/search?q=' + encodeURIComponent(q);
		}
	}

	function close() {
		query = '';
	}
</script>

<div class="relative px-3 sm:px-6 mb-4">
	<div class="relative">
		<svg class="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
		<input
			type="text"
			bind:value={query}
			onkeydown={onKeydown}
			placeholder={placeholder}
			class="w-full pl-10 pr-4 py-3 bg-gray-100 rounded-xl border-0 focus:outline-none focus:ring-2 focus:ring-orange-400 text-sm"
		/>
		{#if query}
			<button onclick={close} class="absolute right-2 top-1/2 -translate-y-1/2 w-6 h-6 flex items-center justify-center text-gray-400 hover:text-gray-600 rounded-full bg-white" aria-label="Clear search">
				<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" /></svg>
			</button>
		{/if}
		<BrandSuggestions bind:this={brandSuggestions} query={query} onPick={go} />
	</div>
</div>
