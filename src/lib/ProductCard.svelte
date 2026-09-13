<script lang="ts">
	import { addToCart } from '$lib/cart.svelte';

	let { product, store }: { product: any; store: any } = $props();

	function handleAdd() {
		addToCart(store, product);
	}
</script>

<div class="w-40 sm:w-44 bg-white rounded-2xl border border-gray-100 hover:shadow-md transition-all duration-200 overflow-hidden">
	<div class="relative aspect-square bg-gray-50 flex items-center justify-center p-3">
		{#if product.image}
			<img src={product.image} alt={product.name} class="w-full h-full object-contain" />
		{:else}
			<div class="text-3xl text-gray-300">📦</div>
		{/if}
		<button onclick={handleAdd} class="absolute bottom-2 right-2 w-8 h-8 bg-orange-500 hover:bg-orange-600 text-white rounded-full shadow-lg flex items-center justify-center transition active:scale-90">
			<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" /></svg>
		</button>
	</div>

	<div class="p-2.5">
		<p class="text-sm font-bold text-gray-900">${product.price.toFixed(2)}</p>
		<p class="text-xs text-gray-700 truncate mt-0.5">{product.name}</p>
		{#if product.stock}
			<p class={`text-[10px] font-medium mt-1 ${product.stock === 'Many in stock' ? 'text-green-600' : 'text-orange-500'}`}>{product.stock}</p>
		{/if}
	</div>
</div>
