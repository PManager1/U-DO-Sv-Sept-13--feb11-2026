<script lang="ts">
	import type { Snippet } from 'svelte';

	let { title, seeAllLink, items, renderCard }: {
		title: string;
		seeAllLink?: string;
		items: any[];
		renderCard: Snippet<[any]>;
	} = $props();

	let scrollEl = $state<HTMLElement>();
	let canScrollLeft = $state(false);
	let canScrollRight = $state(true);

	function updateScrollButtons() {
		const el = scrollEl;
		if (!el) return;
		canScrollLeft = el.scrollLeft > 0;
		canScrollRight = el.scrollLeft < el.scrollWidth - el.clientWidth - 10;
	}

	function scroll(direction: 'left' | 'right') {
		const el = scrollEl;
		if (!el) return;
		const amount = el.clientWidth * 0.6;
		el.scrollBy({ left: direction === 'left' ? -amount : amount, behavior: 'smooth' });
	}
</script>

<section class="mb-8">
	<div class="flex items-center justify-between mb-3">
		<h2 class="text-lg font-bold text-gray-900">{title}</h2>
		<div class="flex items-center gap-2">
			{#if seeAllLink}
				<a href={seeAllLink} class="text-sm font-semibold text-orange-500 hover:text-orange-600 transition">See All</a>
			{/if}
			<div class="hidden sm:flex items-center gap-1">
				<button onclick={() => scroll('left')} disabled={!canScrollLeft} class="w-8 h-8 rounded-full border border-gray-200 flex items-center justify-center text-gray-600 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed transition">
					<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" /></svg>
				</button>
				<button onclick={() => scroll('right')} disabled={!canScrollRight} class="w-8 h-8 rounded-full border border-gray-200 flex items-center justify-center text-gray-600 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed transition">
					<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" /></svg>
				</button>
			</div>
		</div>
	</div>

	<div
		bind:this={scrollEl}
		onscroll={updateScrollButtons}
		class="flex overflow-x-auto snap-x snap-mandatory gap-4 pb-2 scrollbar-none"
	>
		{#each items as item, i}
			<div class="flex-shrink-0 snap-start">
				{@render renderCard(item)}
			</div>
		{/each}
	</div>
</section>
