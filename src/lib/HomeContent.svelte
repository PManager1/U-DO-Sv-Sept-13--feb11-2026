<script lang="ts">
	import { onMount } from 'svelte';
	import API_BASE from '$lib/api';
	import tokenManager from '$lib/tokenManager';
	import { homeCategories, homeFilters, homeHero, homeSections } from '$lib/homeMockData';
	import { storePath } from '$lib/storePath';
	import CategoryIcon from '$lib/CategoryIcon.svelte';
	import LoginPromptModal from '$lib/LoginPromptModal.svelte';

	function snapReset(node: HTMLElement) {
		node.scrollLeft = 0;
		return {};
	}

	let filtersOpen = $state(false);
	let liked = $state<Set<string>>(new Set());
	let loginPrompt = $state(false);

	function toggleLike(id: string, e: Event) {
		e.preventDefault();
		e.stopPropagation();
		if (!tokenManager.hasValidToken()) {
			loginPrompt = true;
			return;
		}
		const next = new Set(liked);
		if (next.has(id)) next.delete(id);
		else next.add(id);
		liked = next;
	}

	let activeCat = $state<string | null>(null);
	let activeFilters = $state(new Set<string>());
	let realBrands = $state<any[]>([]);
	let pizzaBrands = $state<any[]>([]);
	let tacoBrands = $state<any[]>([]);
	let recentlyViewed = $state<any[]>([]);

	async function enrichTypes(list: any[], getId: (b: any) => string) {
		await Promise.all(
			list.map(async (b) => {
				const id = getId(b);
				if (!id || b.brandType || b.type) return;
				try {
					const res = await fetch(API_BASE + 'brands/' + id);
					if (!res.ok) return;
					const data = await res.json();
					const t = data.brandType || data.type;
					if (t) {
						b.brandType = t;
						b.type = t;
					}
				} catch {
					/* leave unknown */
				}
			})
		);
	}

	onMount(async () => {
		const r1 = await fetch(API_BASE + 'brands/search-by-tag?q=pizza').catch(() => null);
		const d1 = r1 ? await r1.json().catch(() => ({})) : {};
		const rb = Array.isArray(d1) ? d1 : d1.brands || [];
		await enrichTypes(rb, (b: any) => b.id);
		realBrands = rb;

		const r2 = await fetch(API_BASE + 'brands/search-by-tag?q=tacos').catch(() => null);
		const d2 = r2 ? await r2.json().catch(() => ({})) : {};
		const tb = (d2.brands || []).slice(0, 8);
		await enrichTypes(tb, (b: any) => b.id);
		tacoBrands = tb;

		const r3 = await fetch(API_BASE + 'brands/search-by-tag?q=pizza').catch(() => null);
		const d3 = r3 ? await r3.json().catch(() => ({})) : {};
		const pb = d3.sections || (d3.brands || []).slice(0, 8);
		await enrichTypes(pb, (b: any) => b.id);
		pizzaBrands = pb;

		// "recently-visited-brands" requires an auth token; only fetch when logged in to avoid a 401.
		const hdrs = tokenManager.getHeaders();
		if (hdrs.Authorization) {
			const r4 = await fetch(API_BASE + 'users/recently-visited-brands', { headers: hdrs }).catch(
				() => null
			);
			const d4 = r4 ? await r4.json().catch(() => ({})) : {};
			const brands = (d4.brands || []).slice(0, 8);
			await enrichTypes(brands, (b: any) => b.brandId);
			recentlyViewed = brands.map((b: any) => ({
				id: b.brandId,
				name: b.brandName,
				image: b.logoUrl || '',
				rating: '4.5',
				reviews: '100+',
				eta: '20-35 min',
				deliveryFee: '$0 Delivery Fee',
				promoTag: b.tags?.[0] || '',
				brandType: b.brandType || b.type,
				type: b.brandType || b.type
			}));
		}
	});

	function toggleFilter(filter: string) {
		const next = new Set(activeFilters);
		if (next.has(filter)) next.delete(filter);
		else next.add(filter);
		activeFilters = next;
	}

	function categoryHref(name: string) {
		return '/category/' + name.toLowerCase().replace(/\s+/g, '-');
	}

	function sectionItems(section: any, si: number) {
		const isRecentlyViewed = recentlyViewed.length > 0 && section.id === 'recently-viewed';
		const isPizzaSection = pizzaBrands.length > 0 && section.title === 'Pizza for you';
		const isTacoSection = tacoBrands.length > 0 && section.title === 'Tasty tacos';
		if (isRecentlyViewed) return recentlyViewed;
		if (isPizzaSection)
			return pizzaBrands.slice(0, 8).map((b: any) => ({
				id: b.id,
				name: b.name,
				image: b.logoUrl || b.bannerUrl || '',
				rating: '4.5',
				reviews: '100+',
				eta: '20-35 min',
				deliveryFee: '$0 Delivery Fee',
				promoTag: b.tags?.[0] || '',
				brandType: b.brandType || b.type,
				type: b.brandType || b.type
			}));
		if (isTacoSection)
			return tacoBrands.slice(0, 8).map((b: any) => ({
				id: b.id,
				name: b.name,
				image: b.logoUrl || b.bannerUrl || '',
				rating: '4.5',
				reviews: '100+',
				eta: '20-35 min',
				deliveryFee: '$0 Delivery Fee',
				promoTag: b.tags?.[0] || '',
				brandType: b.brandType || b.type,
				type: b.brandType || b.type
			}));
		if (realBrands.length > 0 && si === 0)
			return realBrands.map((b: any) => ({
				id: b.id,
				name: b.name,
				image: b.logoUrl || '',
				rating: '4.5',
				reviews: '100+',
				eta: '20-35 min',
				deliveryFee: '$0 Delivery Fee',
				promoTag: b.tags?.slice(0, 2).join(' & ') || '',
				brandType: b.brandType || b.type,
				type: b.brandType || b.type
			}));
		return section.items;
	}
</script>

<svelte:head><title>Home</title></svelte:head>

<div class="pb-16">
	<!-- 1. Category Slider -->
	<div
		class="-mx-3 [scrollbar-width:none] overflow-x-auto px-3 whitespace-nowrap [-ms-overflow-style:none] sm:-mx-6 sm:px-6 [&::-webkit-scrollbar]:hidden"
	>
		<div class="flex min-w-max gap-3 py-2">
			{#each homeCategories as cat}
				{@const isActive = activeCat === cat.id}
				<a
					href={categoryHref(cat.name)}
					class="group flex w-[76px] flex-shrink-0 flex-col items-center gap-1.5 transition-transform active:scale-95"
				>
					<div
						class={`flex h-14 w-14 items-center justify-center rounded-2xl border transition-all duration-200 ${isActive ? 'border-orange-500 bg-white text-orange-600 shadow-soft' : 'border-[#e5e5e5] bg-white text-gray-500 group-hover:scale-105 group-hover:border-orange-500/60 group-hover:text-orange-600'}`}
					>
						<CategoryIcon name={cat.name} />
					</div>
					<span
						class={`w-full truncate text-center text-[11px] font-medium transition ${isActive ? 'border-b-2 border-orange-500 pb-0.5 font-bold text-orange-600' : 'text-gray-500 group-hover:text-gray-900'}`}
						>{cat.name}</span
					>
				</a>
			{/each}
		</div>
	</div>

	<!-- 2. Filter chips + Filters button -->
	<div
		class="-mx-3 mt-3 flex [scrollbar-width:none] items-center gap-2 overflow-x-auto border-b border-[#e5e5e5] px-3 py-3 whitespace-nowrap [-ms-overflow-style:none] sm:-mx-6 sm:px-6 [&::-webkit-scrollbar]:hidden"
	>
		<button
			onclick={() => (filtersOpen = true)}
			class="inline-flex min-h-[40px] flex-shrink-0 items-center gap-1.5 rounded-full border border-[#e5e5e5] bg-white px-4 py-2 text-sm font-semibold text-gray-900 shadow-[0_1px_3px_rgba(0,0,0,0.08)] transition hover:border-orange-500 hover:text-orange-600"
		>
			<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"
				><path stroke-linecap="round" stroke-linejoin="round" d="M3 6h18M6 12h12M10 18h4" /></svg
			>
			Filters
		</button>
		{#each homeFilters as filter}
			{@const isActive = activeFilters.has(filter)}
			<button
				onclick={() => toggleFilter(filter)}
				class={`min-h-[40px] flex-shrink-0 rounded-full border px-4 py-2 text-sm font-medium transition ${isActive ? 'border-orange-500 bg-orange-500 text-white shadow-soft' : 'border-[#e5e5e5] bg-white text-gray-500 hover:border-orange-500 hover:text-gray-900'}`}
				>{filter}</button
			>
		{/each}
	</div>

	<!-- 3. Hero Banner -->
	<div class="relative mt-5 animate-[riseIn_0.5s_ease-out] overflow-hidden rounded-3xl shadow-lift">
		<img
			src="/img/food/sushi.jpg"
			alt=""
			class="absolute inset-0 h-full w-full object-cover"
			loading="eager"
		/>
		<div
			class="absolute inset-0 bg-gradient-to-br from-black/80 via-black/55 to-orange-950/50"
		></div>
		<div class="relative flex flex-col items-start justify-center p-6 sm:p-10 md:min-h-[340px]">
			<span
				class="mb-4 inline-flex w-fit items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold text-white backdrop-blur-sm"
			>
				<svg class="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 20 20"
					><path
						d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"
					/></svg
				>
				Ordered 2,400+ times this week
			</span>
			<h1
				class="max-w-2xl [font-family:var(--font-display)] text-5xl leading-[1.02] font-extrabold tracking-tight text-white sm:text-6xl"
			>
				{homeHero.headline.title}
			</h1>
			<p class="mt-3 max-w-md text-base text-white/85">{homeHero.headline.subtitle}</p>
			<div class="mt-6 flex items-center gap-3">
				<a
					href="#sections"
					class="inline-flex items-center gap-2 rounded-full bg-white px-7 py-3.5 font-semibold text-orange-600 shadow-lift transition hover:-translate-y-0.5 hover:bg-orange-50 hover:shadow-xl active:scale-[0.98]"
				>
					Explore near you
					<svg
						class="h-4 w-4"
						fill="none"
						stroke="currentColor"
						viewBox="0 0 24 24"
						stroke-width="2"
						><path
							stroke-linecap="round"
							stroke-linejoin="round"
							d="M17 8l4 4m0 0l-4 4m4-4H3"
						/></svg
					>
				</a>
				<a
					href="#"
					class="text-sm text-white/80 underline decoration-dotted underline-offset-4 transition hover:text-white"
					>Fees apply. Learn more</a
				>
			</div>
		</div>
	</div>

	<!-- Promo cards row (below hero, informational) -->
	<div class="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
		{#each homeHero.cards as card}
			<div
				class="relative flex flex-col justify-between overflow-hidden rounded-xl border border-[#e5e5e5] bg-white p-6 shadow-[0_1px_3px_rgba(0,0,0,0.08)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lift"
			>
				<div class="absolute top-0 right-0 left-0 h-1 bg-orange-500"></div>
				<div class="flex-1">
					<div
						class="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-orange-500 text-base font-bold text-white"
					>
						{card.icon || '★'}
					</div>
					<h3 class="text-lg leading-tight font-bold text-gray-900">{card.title}</h3>
					{#if card.subtitle}
						<p class="mt-1.5 text-xs leading-relaxed text-gray-500">{card.subtitle}</p>
					{/if}
				</div>
				<div class="mt-4">
					<button
						class="inline-flex items-center rounded-full bg-orange-500 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-orange-600 hover:shadow-md active:scale-[0.98]"
						>{card.cta}</button
					>
				</div>
			</div>
		{/each}
	</div>

	{#if filtersOpen}
		<div class="fixed inset-0 z-[100] flex items-end justify-center sm:items-center">
			<div
				class="absolute inset-0 bg-black/40 backdrop-blur-sm"
				onclick={() => (filtersOpen = false)}
			></div>
			<div
				class="relative max-h-[85vh] w-full animate-[riseIn_0.2s_ease-out] overflow-y-auto rounded-t-3xl bg-white p-6 pb-8 shadow-2xl sm:max-w-lg sm:rounded-3xl"
			>
				<div class="mb-5 flex items-center justify-between">
					<h3 class="text-xl font-bold text-gray-900">Filters</h3>
					<button
						onclick={() => (filtersOpen = false)}
						class="flex h-9 w-9 items-center justify-center rounded-full bg-gray-100 text-gray-900 transition hover:bg-gray-200"
					>
						<svg
							class="h-5 w-5"
							fill="none"
							stroke="currentColor"
							viewBox="0 0 24 24"
							stroke-width="2"
							><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" /></svg
						>
					</button>
				</div>

				<div class="space-y-6">
					<div>
						<p class="mb-2 text-sm font-semibold text-gray-900">Offers & benefits</p>
						<div class="flex flex-wrap gap-2">
							{#each homeFilters as filter}
								{@const isActive = activeFilters.has(filter)}
								<button
									onclick={() => toggleFilter(filter)}
									class={`rounded-full border px-4 py-2 text-sm font-medium transition ${isActive ? 'border-orange-500 bg-orange-500 text-white' : 'border-[#e5e5e5] bg-white text-gray-500 hover:border-orange-500'}`}
									>{filter}</button
								>
							{/each}
						</div>
					</div>

					<div>
						<p class="mb-2 text-sm font-semibold text-gray-900">Price</p>
						<div class="flex gap-2">
							{#each ['$', '$$', '$$$'] as price}
								<button
									onclick={() => toggleFilter(price)}
									class={`rounded-lg border px-4 py-2 text-sm font-semibold transition ${activeFilters.has(price) ? 'border-orange-500 bg-orange-500 text-white' : 'border-[#e5e5e5] bg-white text-gray-500 hover:border-orange-500'}`}
									>{price}</button
								>
							{/each}
						</div>
					</div>

					<div>
						<p class="mb-2 text-sm font-semibold text-gray-900">Dietary</p>
						<div class="flex flex-wrap gap-2">
							{#each ['Vegetarian', 'Vegan', 'Gluten-free', 'Halal'] as diet}
								<button
									onclick={() => toggleFilter(diet)}
									class={`rounded-full border px-4 py-2 text-sm font-medium transition ${activeFilters.has(diet) ? 'border-orange-500 bg-orange-500 text-white' : 'border-[#e5e5e5] bg-white text-gray-500 hover:border-orange-500'}`}
									>{diet}</button
								>
							{/each}
						</div>
					</div>

					<div>
						<p class="mb-2 text-sm font-semibold text-gray-900">Minimum rating</p>
						<div class="flex gap-2">
							{#each ['3+', '4+'] as r}
								<button
									onclick={() => toggleFilter(r)}
									class={`rounded-lg border px-4 py-2 text-sm font-semibold transition ${activeFilters.has(r) ? 'border-orange-500 bg-orange-500 text-white' : 'border-[#e5e5e5] bg-white text-gray-500 hover:border-orange-500'}`}
									>{r} ★</button
								>
							{/each}
						</div>
					</div>
				</div>

				<div class="mt-8 flex gap-3">
					<button
						onclick={() => {
							activeFilters = new Set();
						}}
						class="flex-1 rounded-full border border-[#e5e5e5] py-3 text-sm font-semibold text-gray-500 transition hover:bg-gray-50"
						>Clear all</button
					>
					<button
						onclick={() => (filtersOpen = false)}
						class="flex-[2] rounded-full bg-orange-500 py-3 text-sm font-semibold text-white transition hover:bg-orange-600"
						>Apply filters</button
					>
				</div>
			</div>
		</div>
	{/if}

	<LoginPromptModal open={loginPrompt} onClose={() => (loginPrompt = false)} />
</div>

<!-- Sections -->
<div id="sections" class="scroll-mt-24">
	{#each homeSections as section, si}
		{@const items = sectionItems(section, si)}
		<div class="mb-16 animate-[riseIn_0.4s_ease-out] scroll-mt-24">
			<div class="mb-5 flex items-center justify-between">
				<h2
					class="[font-family:var(--font-display)] text-2xl font-bold tracking-tight text-gray-900 sm:text-[28px]"
				>
					{section.title}
				</h2>
				{#if items.length > 0}
					<a
						href={`/see-all/${section.id}`}
						class="group inline-flex items-center gap-1 text-sm font-semibold text-orange-600 transition hover:text-orange-700"
						>See All
						<svg
							class="h-4 w-4 transition-transform group-hover:translate-x-0.5"
							fill="none"
							stroke="currentColor"
							viewBox="0 0 24 24"
							stroke-width="2.5"
							><path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7" /></svg
						></a
					>
				{/if}
			</div>

			{#if items.length === 0}
				<div class="py-10 text-center text-gray-500">
					<div class="mb-3 text-4xl">🕐</div>
					<p class="text-sm font-medium">No recently viewed items</p>
					<p class="mt-1 text-xs">Browse stores and your recently viewed items will appear here</p>
				</div>
			{:else}
				<div
					use:snapReset
					class="-mx-3 snap-x snap-proximity [scrollbar-width:none] overflow-x-auto px-3 [-ms-overflow-style:none] sm:-mx-6 sm:px-6 [&::-webkit-scrollbar]:hidden"
				>
					<div class="flex gap-4 pb-3">
						{#each items as item}
							{@const bId = item.id || item.name}
							<a
								href={storePath(item)}
								class="group w-64 flex-shrink-0 snap-start overflow-hidden rounded-xl border border-[#e5e5e5] bg-white shadow-[0_1px_3px_rgba(0,0,0,0.08)] transition-all duration-300 hover:-translate-y-1 hover:scale-[1.02] hover:shadow-lift active:scale-[0.98]"
							>
								<div class="relative aspect-[4/3] overflow-hidden bg-gray-100">
									{#if item.image}
										<img
											src={item.image}
											alt={item.name}
											loading="lazy"
											class="h-full w-full object-cover object-center transition-transform duration-300 group-hover:scale-105"
										/>
									{:else}
										<div
											class="flex h-full w-full items-center justify-center bg-gray-100 text-3xl text-gray-400"
										>
											🍽️
										</div>
									{/if}
									<div
										class="pointer-events-none absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-black/25 to-transparent"
									></div>
									<button
										onclick={(e) => toggleLike(bId, e)}
										class={`absolute top-2 right-2 flex h-8 w-8 items-center justify-center rounded-full bg-white/90 shadow-soft transition hover:bg-white active:scale-90 ${liked.has(bId) ? 'text-orange-500' : 'text-gray-400'}`}
										title={liked.has(bId) ? 'Remove from favorites' : 'Save to favorites'}
									>
										<svg
											class="h-4 w-4"
											fill={liked.has(bId) ? 'currentColor' : 'none'}
											stroke="currentColor"
											viewBox="0 0 24 24"
											stroke-width="2"
											><path
												stroke-linecap="round"
												stroke-linejoin="round"
												d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
											/></svg
										>
									</button>
									{#if item.promoTag}
										<span
											class="absolute top-2 left-2 rounded-full bg-orange-500 px-2.5 py-1 text-[10px] font-bold text-white shadow-sm"
											>{item.promoTag}</span
										>
									{/if}
								</div>
								<div class="p-3.5">
									<h3 class="truncate text-sm font-bold text-gray-900">{item.name}</h3>
									<div class="mt-1 flex items-center gap-2 text-xs text-gray-500">
										<span class="flex items-center gap-0.5 font-semibold text-gray-900">
											<svg
												class="h-3.5 w-3.5 text-orange-500"
												fill="currentColor"
												viewBox="0 0 20 20"
												><path
													d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"
												/></svg
											>
											<span class="text-orange-600">{item.rating}</span>
										</span>
										<span>({item.reviews})</span>
										<span class="text-[#e5e5e5]">•</span>
										<span>{item.eta}</span>
									</div>
									<div class="mt-2 flex items-center justify-between text-xs">
										<span
											class={`inline-flex items-center gap-1 font-medium ${item.deliveryFee?.includes('$0') ? 'text-orange-600' : 'text-gray-500'}`}
										>
											<svg
												class="h-3.5 w-3.5"
												fill="none"
												stroke="currentColor"
												viewBox="0 0 24 24"
												stroke-width="2"
												><path
													stroke-linecap="round"
													stroke-linejoin="round"
													d="M9 17l-2-2 2-2 2 2 4-4 2 2-6 6zM3 11a9 9 0 1118 0 9 9 0 01-18 0z"
												/></svg
											>
											{item.deliveryFee}
										</span>
										{#if item.badge}<span
												class="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 font-semibold text-gray-700"
												>{item.badge}</span
											>{/if}
									</div>
								</div>
							</a>
						{/each}
					</div>
				</div>
			{/if}
		</div>
	{/each}
</div>
