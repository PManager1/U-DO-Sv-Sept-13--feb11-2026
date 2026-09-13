<script lang="ts">
	import { onMount } from 'svelte';
	import { stores } from '$lib/groceryMockData';
	import StoreGrid from '$lib/StoreGrid.svelte';
	import { fetchGroceryBrands } from '$lib/storefront';
	import { deliveryAddress, ensureAddressLoaded, shortAddress } from '$lib/address.svelte';

	let groceryBrands = $state<any[]>([]);

	onMount(async () => {
		await ensureAddressLoaded();
		groceryBrands = await fetchGroceryBrands(deliveryAddress.value);
	});

	const allStores = $derived(groceryBrands.length ? groceryBrands : stores);
</script>

<svelte:head><title>All Grocery Stores · U-DO</title></svelte:head>

<div class="pb-20 pb-[env(safe-area-inset-bottom)]">
	<div class="mb-6">
		<h1 class="text-2xl font-extrabold tracking-tight text-gray-900">All Grocery Stores</h1>
		<p class="text-sm text-gray-500 mt-1">{deliveryAddress.value ? `Grocery stores near ${shortAddress(deliveryAddress.value)}` : 'Grocery stores near you'}</p>
	</div>

	<StoreGrid stores={allStores} title="All Grocery Stores" seeAllLink="" />
</div>
