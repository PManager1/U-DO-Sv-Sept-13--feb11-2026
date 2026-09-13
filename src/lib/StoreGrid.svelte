<script lang="ts">
	import StoreCard from '$lib/StoreCard.svelte';

	let { stores, title = 'Stores Near You', seeAllLink = '/?view=all-stores' }: { stores: any[]; title?: string; seeAllLink?: string } = $props();
</script>

<section class="mb-8">
	<h2 class="text-lg font-bold text-gray-900 mb-3">{title}</h2>
	<div class="flex flex-wrap gap-3">
		{#each stores as store}
			<div class="w-full sm:w-[calc(50%-0.375rem)] lg:w-[calc(33.333%-0.5rem)] xl:w-[calc(25%-0.5625rem)]">
				<StoreCard {store} />
			</div>
		{/each}
		{#if seeAllLink}
			<a href={seeAllLink} class="w-full sm:w-[calc(50%-0.375rem)] lg:w-[calc(33.333%-0.5rem)] xl:w-[calc(25%-0.5625rem)] ml-auto flex items-center justify-center p-4 rounded-xl border-2 border-dashed border-gray-200 bg-gray-50 hover:bg-gray-100 hover:border-gray-300 transition min-h-[80px] active:scale-[0.98]">
				<span class="text-sm font-semibold text-gray-500 text-center">See all stores nearby →</span>
			</a>
		{/if}
	</div>
</section>
