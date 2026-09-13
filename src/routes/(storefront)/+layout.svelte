<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/state';
	import StorefrontChrome from '$lib/StorefrontChrome.svelte';
	import { loadUserCarts } from '$lib/cart.svelte';

	let { children } = $props();

	const isStoreDetail = $derived(page.url.pathname.startsWith('/store/'));
	const isHome = $derived(page.url.pathname === '/');
	const isCategory = $derived(page.url.pathname.startsWith('/category/'));
	const pageBg = $derived(isHome || isCategory ? 'bg-[#fafafa]' : 'bg-white');

	onMount(() => {
		loadUserCarts();
	});
</script>

<StorefrontChrome home={isHome} {pageBg}>
	<div class={`mx-auto max-w-[1400px] px-3 sm:px-6 ${isStoreDetail ? 'pb-4' : 'py-4'}`}>
		{@render children()}
	</div>
</StorefrontChrome>
