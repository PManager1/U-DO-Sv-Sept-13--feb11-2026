<script lang="ts">
	import { onMount } from 'svelte';
	import { stores, banners, popularStores, productItems } from '$lib/groceryMockData';
	import StoreGrid from '$lib/StoreGrid.svelte';
	import PromoBanner from '$lib/PromoBanner.svelte';
	import CarouselSection from '$lib/CarouselSection.svelte';
	import MerchantCarouselCard from '$lib/MerchantCarouselCard.svelte';
	import ProductCard from '$lib/ProductCard.svelte';
	import { activeFilters } from '$lib/storefrontFilters.svelte';
	import { fetchGroceryBrands } from '$lib/storefront';
	import { deliveryAddress, ensureAddressLoaded } from '$lib/address.svelte';

	let groceryBrands = $state<any[]>([]);
	let loading = $state(true);

	onMount(async () => {
		await ensureAddressLoaded();
		groceryBrands = await fetchGroceryBrands(deliveryAddress.value);
		loading = false;
	});

	const gridStores = $derived(groceryBrands.slice(0, 16));
	const filteredStores = $derived(
		activeFilters.length > 0
			? gridStores.filter((s: any) => s.tags?.some((t: string) => activeFilters.includes(t)))
			: gridStores
	);

	const sections = $derived([
		{ id: 'popular-near-you', title: 'Popular Near You', seeAllLink: '#', type: 'merchant', items: popularStores },
		{ id: 'thanksgiving-pies', title: 'Thanksgiving Pies', seeAllLink: '#', type: 'product', items: productItems }
	]);
</script>

<svelte:head><title>Grocery · U-DO</title></svelte:head>

<div>
	<!-- "Fight for cheaper food" banner -->
	<div class="bg-gradient-to-r from-orange-500 to-red-500 text-white text-center py-3 px-4 rounded-xl mb-6">
		<p class="text-sm sm:text-base font-bold leading-tight">Customers save more. Drivers earn more. Merchants keep more.</p>
	</div>

	<!-- Stores grid -->
	{#if loading}
		<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
			{#each Array(8) as _, i}
				<div class="flex items-center gap-3 p-3 rounded-xl border border-gray-100 bg-white overflow-hidden">
					<div class="w-16 h-16 rounded-xl bg-gray-100 flex-shrink-0 relative overflow-hidden">
						<div class="absolute inset-0 animate-[shimmer_1.6s_infinite] bg-gradient-to-r from-transparent via-white/70 to-transparent"></div>
					</div>
					<div class="flex-1 space-y-2">
						<div class="h-3.5 rounded bg-gray-100 w-3/4 relative overflow-hidden">
							<div class="absolute inset-0 animate-[shimmer_1.6s_infinite] bg-gradient-to-r from-transparent via-white/70 to-transparent"></div>
						</div>
						<div class="h-3 rounded bg-gray-100 w-1/2 relative overflow-hidden">
							<div class="absolute inset-0 animate-[shimmer_1.6s_infinite] bg-gradient-to-r from-transparent via-white/70 to-transparent"></div>
						</div>
					</div>
				</div>
			{/each}
		</div>
	{:else}
		<StoreGrid stores={filteredStores} seeAllLink="/allgrocery" />
	{/if}

	<!-- Promo banners -->
	{#if loading}
		<div class="rounded-xl bg-gray-100 h-28 relative overflow-hidden">
			<div class="absolute inset-0 animate-[shimmer_1.6s_infinite] bg-gradient-to-r from-transparent via-white/70 to-transparent"></div>
		</div>
	{:else if banners.length > 0}
		<PromoBanner {banners} />
	{/if}

	<!-- Carousel sections -->
	{#if loading}
		{#each sections as section}
			<div class="mb-8">
				<div class="h-4 rounded bg-gray-100 w-48 mb-4 relative overflow-hidden">
					<div class="absolute inset-0 animate-[shimmer_1.6s_infinite] bg-gradient-to-r from-transparent via-white/70 to-transparent"></div>
				</div>
				<div class="flex gap-3 overflow-hidden">
					{#each Array(4) as _, j}
						<div class="w-40 flex-shrink-0 rounded-xl bg-gray-100 relative overflow-hidden">
							<div class="h-24 w-full bg-gray-100"></div>
							<div class="absolute inset-0 animate-[shimmer_1.6s_infinite] bg-gradient-to-r from-transparent via-white/70 to-transparent"></div>
							<div class="p-2.5 space-y-2">
								<div class="h-3 rounded bg-gray-100 w-3/4"></div>
								<div class="h-3 rounded bg-gray-100 w-1/2"></div>
							</div>
						</div>
					{/each}
				</div>
			</div>
		{/each}
	{:else}
		{#each sections as section}
			<CarouselSection title={section.title} seeAllLink={section.seeAllLink} items={section.items}>
				{#snippet renderCard(item)}
					{#if section.type === 'merchant'}
						<MerchantCarouselCard merchant={item} />
					{:else}
						<ProductCard product={item} store={stores.find((s) => s.id === item.storeId) || stores[0]} />
					{/if}
				{/snippet}
			</CarouselSection>
		{/each}
	{/if}

	<!-- Bottom padding -->
	<div class="h-20 pb-[env(safe-area-inset-bottom)]"></div>
</div>
