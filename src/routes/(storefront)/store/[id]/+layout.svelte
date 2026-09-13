<script lang="ts">
	import { page } from '$app/state';
	import CategoryRibbon from '$lib/CategoryRibbon.svelte';
	import { items } from '$lib/categoryData';
	import { slugify } from '$lib/slug';
	import { goto } from '$app/navigation';

	let { data } = $props();

	function scrollToCategory(index: number) {
		const el = document.getElementById(`cat-${index}`);
		if (!el) return;
		el.scrollIntoView({ behavior: 'smooth', block: 'start' });
	}

	function handleCategoryClick(item: any, index: number) {
		goto(`./category/${slugify(item.label)}`);
	}

	function getActiveCategoryIndex(): number {
		const path = page.url.pathname;
		const match = path.match(/\/category\/([^/]+)/);
		if (!match) return -1;
		const slug = match[1];
		return items.findIndex((item) => slugify(item.label) === slug);
	}
</script>

<div class="min-h-screen bg-white">
	<CategoryRibbon 
		menu={data.menu || []}
		onScrollTo={scrollToCategory}
		onCategoryClick={handleCategoryClick}
		activeCategoryIndex={getActiveCategoryIndex()}
	/>
	<div class="pt-4">
		<slot />
	</div>
</div>
