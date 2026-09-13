<script lang="ts">
	import { storePath } from '$lib/storePath';

	let { merchant }: { merchant: any } = $props();
</script>

<a href={storePath(merchant)} class="block w-56 sm:w-64 bg-white rounded-2xl border border-gray-100 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 overflow-hidden active:scale-[0.98]">
	<div class="h-32 sm:h-36 bg-gray-100 overflow-hidden">
		{#if merchant.image}
			<img src={merchant.image} alt={merchant.name} class="w-full h-full object-contain object-center bg-white" />
		{:else}
			<div class="w-full h-full flex items-center justify-center text-3xl text-gray-300">🍽️</div>
		{/if}
	</div>

	<div class="p-3">
		<h3 class="text-sm font-bold text-gray-900 truncate">{merchant.name}</h3>
		<div class="flex items-center gap-2 text-xs text-gray-500 mt-1">
			<span class="flex items-center gap-0.5 text-yellow-500">
				<svg class="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>
				{merchant.rating}
			</span>
			<span>({merchant.reviewCount})</span>
			<span>•</span>
			<span>{merchant.distance}</span>
		</div>
		<div class="flex items-center justify-between mt-2 text-xs text-gray-500">
			<span>{merchant.deliveryFee} delivery</span>
			<span class="font-medium text-gray-700">{merchant.eta}</span>
		</div>
	</div>
</a>
