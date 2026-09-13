<script lang="ts">
	import { items } from './categoryData';
	
	let { 
		menu = [], 
		onScrollTo, 
		activeCategoryIndex = -1,
		onCategoryClick 
	}: { 
		menu: any[]; 
		onScrollTo: (index: number) => void;
		activeCategoryIndex?: number;
		onCategoryClick?: (item: any, index: number) => void;
	} = $props();
	let scroller: HTMLElement | undefined;
	let canL = $state(false);
	let canR = $state(true);
	let selectedIndex = $state(0);


	function findIndex(keywords: string[]): number {
		return menu.findIndex((s) =>
			keywords.some((k) => (s.category || '').toLowerCase().includes(k))
		);
	}
	function go(item: any, index: number) {
		if (onCategoryClick) {
			onCategoryClick(item, index);
		} else {
			const i = findIndex(item.keywords);
			if (i >= 0) {
				onScrollTo(i);
			}
			selectedIndex = index;
		}
	}
	function syncArrows() {
		if (!scroller) return;
		canL = scroller.scrollLeft > 0;
		canR = scroller.scrollLeft < scroller.scrollWidth - scroller.clientWidth - 1;
	}
	function scrollBy(amount: number) {
		scroller?.scrollBy({ left: amount, behavior: 'smooth' });
	}
	$effect(() => {
		if (scroller) syncArrows();
	});
</script>




<div class="border-b border-gray-100 bg-white">
	<div class="relative">
		{#if canL}
			<button
				onclick={() => scrollBy(-300)}
				class="absolute top-1/2 left-0 z-10 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-700 shadow-md transition hover:bg-gray-100 cursor-pointer"
				aria-label="Scroll left"
			>
				<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"
					><path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7" /></svg
				>
			</button>
		{/if}
		{#if canR}
			<button
				onclick={() => scrollBy(300)}
				class="absolute top-1/2 right-0 z-10 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-700 shadow-md transition hover:bg-gray-100 cursor-pointer"
				aria-label="Scroll right"
			>
				<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"
					><path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7" /></svg
				>
			</button>
		{/if}
		<div
			bind:this={scroller}
			onscroll={syncArrows}
			class="flex [scrollbar-width:none] items-center gap-8 overflow-x-auto py-3 [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
		>
			{#each items as item, i}
				<button
					onclick={() => go(item, i)}
					class="flex min-w-max cursor-pointer flex-col items-center justify-center hover:-translate-y-0.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400/50 active:scale-95"
				>
					<div
						class="flex flex-col items-center px-3 py-2 {i === activeCategoryIndex
							? 'rounded-xl bg-gray-100'
						: ''}"
					>
						<img
							src={item.img}
							alt={item.label}
							class="h-16 w-16 {item.rounded ? 'rounded-full' : ''} {item.fit ?? ''}"
							loading="lazy"
							draggable="false"
						/>
						<span
							// style="font-weight: 800 !important; color: #000000 !important;"
							style="font-weight: 800 !important;"
							class="mt-2 text-sm font-bold text-black whitespace-nowrap {i === activeCategoryIndex
								? 'font-bold text-red-600 underline'
								: 'font-semibold text-black'}">{item.label}</span
						>
					</div>
				</button>
			{/each}
		</div>
	</div>
</div>
