<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/state';
	import StorefrontChrome from '$lib/StorefrontChrome.svelte';
	import { loadUserCarts } from '$lib/cart.svelte';

	let { children } = $props();

	const isHome = $derived(page.url.pathname.startsWith('/why-udo'));
	const pageBg = $derived(isHome ? 'bg-cream' : 'bg-white');

	onMount(() => {
		loadUserCarts();
	});
</script>

<StorefrontChrome home={isHome} {pageBg}>
	{@render children()}
</StorefrontChrome>
