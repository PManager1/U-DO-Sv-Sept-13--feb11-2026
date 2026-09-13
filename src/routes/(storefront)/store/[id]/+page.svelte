<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/state';
	import { recordBrandVisit } from '$lib/storefront';
	import StoreItemModal from '$lib/StoreItemModal.svelte';
	import { slugify } from '$lib/slug';
	import { cart, addToCart, totalItems, totalPrice } from '$lib/cart.svelte';
	import { admin, ensureAdminLoaded } from '$lib/admin.svelte';

	let { data } = $props();

	let store = $derived(data.store);
	let menu = $derived(data.menu || []);
	let storeId = $derived(data.storeId as string);

	let loading = $state(false);
	let activeCatIndex = $state(0);
	let modifierItem = $state<any>(null);
	let showHours = $state(false);
	let showAllHours = $state(false);
	let bannerRatio = $state<string | null>(null);

	$effect(() => {
		if (!showHours) return;
		const onKey = (e: KeyboardEvent) => {
			if (e.key === 'Escape') showHours = false;
		};
		window.addEventListener('keydown', onKey);
		return () => window.removeEventListener('keydown', onKey);
	});

	let sectionRefs: (HTMLElement | null)[] = $state([]);
	let isScrolling = false;

	function catSection(node: HTMLElement, i: number) {
		sectionRefs[i] = node;
		return { destroy() { sectionRefs[i] = null; } };
	}

	onMount(() => {
		ensureAdminLoaded();
		if (store) recordBrandVisit(store);
	});

	$effect(() => {
		const b = store?.banner;
		if (!b) return;
		const img = new Image();
		img.onload = () => {
			if (img.naturalWidth && img.naturalHeight) bannerRatio = `${img.naturalWidth} / ${img.naturalHeight}`;
		};
		img.src = b;
	});

	$effect(() => {
		if (!menu.length) return;
		const observer = new IntersectionObserver(
			(entries) => {
				if (isScrolling) return;
				for (const entry of entries) {
					if (entry.isIntersecting) {
						const idx = Number((entry.target as HTMLElement).dataset.catIndex);
						if (!isNaN(idx)) activeCatIndex = idx;
						break;
					}
				}
			},
			{ rootMargin: '-120px 0px -60% 0px', threshold: 0 }
		);
		for (const ref of sectionRefs) if (ref) observer.observe(ref);
		return () => observer.disconnect();
	});

	function scrollToCategory(index: number) {
		const el = sectionRefs[index];
		if (!el) return;
		isScrolling = true;
		el.scrollIntoView({ behavior: 'smooth', block: 'start' });
		activeCatIndex = index;
		setTimeout(() => (isScrolling = false), 800);
	}

	$effect(() => {
		const itemParam = page.url.searchParams.get('item');
		if (!itemParam || !menu.length) return;
		const wanted = itemParam.toLowerCase();
		for (const section of menu) {
			for (const item of section.items || []) {
				const itemId = (item.id || slugify(item.name) || '').toLowerCase();
				if (itemId === wanted) {
					modifierItem = item;
					return;
				}
			}
		}
	});

	function handleAddItem(item: any) {
		if (item.modifier_data) {
			modifierItem = item;
			return;
		}
		const id = item.id || slugify(item.name);
		addToCart(store, { id, name: item.name, price: item.price, image: item.raw_image_url || '' });
	}

	function to12h(time24: string) {
		if (!time24) return '';
		const [h, m] = time24.split(':').map(Number);
		const ampm = h >= 12 ? 'PM' : 'AM';
		const h12 = h % 12 || 12;
		return `${h12}:${String(m).padStart(2, '0')} ${ampm}`;
	}

	const isJsonStore = storeId === 'store_0';
	const bannerImage = $derived(store?.banner || '');
	const logoImage = $derived(store?.logo || '');

	const crop = $derived(store?.bannerCrop && store.bannerCrop.width && store.bannerCrop.height ? store.bannerCrop : null);
	const bannerStyle = $derived.by(() => {
		const style: Record<string, string> = {};
		if (bannerImage) {
			style['background-image'] = `url('${bannerImage}')`;
			if (crop) {
				const { x, y, width, height } = crop;
				style['background-size'] = `${(100 / width) * 100}% ${(100 / height) * 100}%`;
				style['background-position'] = `${width >= 100 ? 50 : (x / (100 - width)) * 100}% ${height >= 100 ? 50 : (y / (100 - height)) * 100}%`;
				style['aspect-ratio'] = `${width / height}`;
			} else {
				style['background-size'] = 'cover';
				style['background-position'] = 'center';
				style['aspect-ratio'] = bannerRatio || '16 / 4';
			}
			style['background-repeat'] = 'no-repeat';
		} else {
			style['background-color'] = '#f3f4f6';
			style['aspect-ratio'] = bannerRatio || '16 / 4';
		}
		return style;
	});

	const bannerStyleStr = $derived(
		Object.entries(bannerStyle)
			.map(([k, v]) => `${k}:${v};`)
			.join('') + 'max-height:240px'
	);

	const todayName = new Date().toLocaleDateString('en-US', { weekday: 'long' });
</script>

<svelte:head><title>{store?.name || 'Store'}</title></svelte:head>

{#if !store}
	<div class="text-center py-16">
		<p class="text-gray-900">Store not found</p>
		<a href="/" class="text-orange-500 font-semibold text-sm mt-2 inline-block">Back to home</a>
	</div>
{:else}
	<!-- Hero banner -->
	<div class="relative w-full rounded-2xl overflow-hidden mb-4" style={bannerStyleStr}>
		{#if !bannerImage}
			<div class="w-full h-[200px] flex items-center justify-center text-4xl text-gray-300">🍽️</div>
		{/if}
		{#if logoImage}
			<div class="absolute top-12 left-4">
				<img src={logoImage} alt={store.name} class="w-20 h-20 rounded-full border-4 border-white shadow-md object-cover bg-white" />
			</div>
		{/if}
		{#if admin.isAdmin}
			<a
				href={`/admin/brands/${page.params.id}`}
				target="_blank"
				rel="noopener noreferrer"
				title="Edit in Admin"
				class="absolute top-16 right-3 z-10 w-9 h-9 rounded-full bg-white/90 backdrop-blur border border-gray-200 shadow-md flex items-center justify-center text-gray-700 hover:text-coral hover:border-coral transition active:scale-90"
			>
				<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H6a2 2 0 00-2 2v12a2 2 0 002 2h12a2 2 0 002-2v-5M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
			</a>
		{/if}
	</div>

	<!-- Restaurant name -->
	<div class={logoImage ? 'ml-24 mb-4 mt-10' : 'mb-4 mt-10'}>
		<h1 class="text-2xl font-bold text-gray-900">{store.name}</h1>
		<div class="flex items-center gap-2 text-sm text-gray-900 mt-1">
			<span class="flex items-center gap-0.5 text-yellow-500">
				<svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>
				{store.rating}
			</span>
			<span>({store.reviewCount})</span>
			<span>•</span>
			<span>{store.eta}</span>
			<span>•</span>
			<span>{store.deliveryFee} delivery</span>
		</div>
		{#if store.hours && store.hours.length > 0}
			<button onclick={() => { showHours = true; showAllHours = false; }} class="mt-1 text-xs text-orange-600 hover:text-orange-700 font-medium flex items-center gap-1">
				<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
				Store Hours
			</button>
		{/if}
	</div>

	<!-- Two-column body -->
	<div class="flex gap-6">
		<!-- Desktop category nav -->
		<nav class="hidden md:block w-48 flex-shrink-0 sticky top-24 self-start max-h-[calc(100vh-8rem)] overflow-y-auto">
			<div class="space-y-1">
				{#each menu as section, i}
					<button onclick={() => scrollToCategory(i)} class={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition ${activeCatIndex === i ? 'bg-orange-50 text-orange-600' : 'text-gray-900 hover:bg-gray-50'}`}>{section.category}</button>
				{/each}
			</div>
		</nav>

		<!-- Menu sections -->
		<div class="flex-1 min-w-0">
			{#if cart.items.length > 0}
				<div class="mb-3 bg-orange-50 border border-orange-200 rounded-lg px-4 py-2 text-xs text-orange-700 flex items-center justify-between">
					<span>🛒 {totalItems()} item{totalItems() !== 1 ? 's' : ''} in cart</span>
					<span class="font-semibold">${totalPrice().toFixed(2)}</span>
				</div>
			{/if}

			<div class="md:hidden flex overflow-x-auto whitespace-nowrap sticky top-16 bg-white z-20 pb-2 mb-2 border-b border-gray-100 scrollbar-none gap-1.5">
				{#each menu as section, i}
					<button onclick={() => scrollToCategory(i)} class={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition ${activeCatIndex === i ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-900 hover:bg-gray-200'}`}>{section.category}</button>
				{/each}
			</div>

			{#each menu as section, i}
				<div use:catSection={i} data-cat-index={i} id={`cat-${i}`} class="mb-8 scroll-mt-24">
					<h2 class="sticky top-16 md:top-16 bg-white/95 backdrop-blur z-10 text-xl font-bold text-gray-900 py-3 border-b border-gray-100 mb-4">{section.category}</h2>

					{#if !Array.isArray(section.items) || section.items.length === 0}
						<p class="text-sm text-gray-700 py-4">No items in this section</p>
					{/if}

					<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
						{#each (section.items || []) as item, j}
							{@const itemId = item.id || slugify(item.name)}
							{@const isAvailable = item.available !== false}
							<div onclick={() => { if (isAvailable) modifierItem = item; }} class={`bg-white rounded-xl border border-gray-100 overflow-hidden transition cursor-pointer ${isAvailable ? 'hover:shadow-md hover:-translate-y-0.5' : 'opacity-50 pointer-events-none'}`}>
								<div class="relative aspect-[4/3] bg-white overflow-hidden">
									{#if item.raw_image_url}
										<img src={item.raw_image_url} alt={item.name} class="w-full h-full object-contain object-center bg-white" loading="lazy" />
									{:else}
										<div class="w-full h-full flex items-center justify-center text-2xl text-gray-300">🥟</div>
									{/if}
									{#if !isAvailable}
										<div class="absolute inset-0 bg-black/40 flex items-center justify-center"><span class="bg-gray-900 text-white text-xs font-bold px-3 py-1 rounded-full">Out of Stock</span></div>
									{/if}
									{#if isAvailable}
										<button onclick={(e) => { e.stopPropagation(); handleAddItem(item); }} class="absolute bottom-2 right-2 w-8 h-8 bg-orange-500 hover:bg-orange-600 text-white rounded-full shadow-lg flex items-center justify-center transition active:scale-90 cursor-pointer">
											<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" /></svg>
										</button>
									{/if}
								</div>
								<div class="p-3">
									<p class="text-sm font-bold text-gray-900">${Number(item.price).toFixed(2)}</p>
									<p class="text-sm text-gray-900 font-semibold leading-tight mt-0.5 line-clamp-2">{item.name}</p>
									{#if item.description && item.description.length > 0}
										<p class="text-xs text-gray-900 mt-1 line-clamp-2">{item.description}</p>
									{/if}
								</div>
							</div>
						{/each}
					</div>
				</div>
			{/each}

			{#if menu.length === 0}
				<div class="text-center py-12 text-gray-700">No menu available yet</div>
			{/if}

			<div class="h-16" />
		</div>
	</div>

	<!-- Hours Modal -->
	{#if showHours}
		<div class="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm" onclick={() => (showHours = false)}>
			<div class="mx-auto mt-2.5 sm:mt-[10vh] w-full sm:max-w-md bg-white rounded-2xl max-h-[85vh] overflow-hidden flex flex-col shadow-2xl" onclick={(e) => e.stopPropagation()}>
				<div class="relative h-44 sm:h-52 bg-gray-200 flex-shrink-0 overflow-hidden">
					<iframe title="Store location" src={`https://www.google.com/maps?q=${encodeURIComponent(store.address || store.name)}&output=embed`} class="w-full h-full border-0" loading="lazy" allowfullscreen referrerpolicy="no-referrer-when-downgrade"></iframe>
					<div class="absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-white to-transparent"></div>
					<button onclick={() => (showHours = false)} class="absolute top-3 right-3 w-8 h-8 rounded-full bg-white/90 hover:bg-white flex items-center justify-center text-gray-700 shadow-lg transition active:scale-90">&times;</button>
					<div class="absolute top-3 left-3 bg-white/90 rounded-lg px-3 py-1.5 shadow-sm"><p class="text-sm font-semibold text-gray-900">{store.name}</p></div>
				</div>
				<hr class="border-t border-gray-200" />
				<div class="flex-1 overflow-y-auto px-5 py-3">
					<div class="flex items-center gap-2 mb-3">
						<svg class="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
						<span class="text-sm font-semibold text-gray-900">Store Hours</span>
					</div>
					<div class="space-y-1">
						{#each (showAllHours ? store.hours : store.hours.filter((h: any) => h.day === todayName)) as h, i}
							{@const isToday = h.day === todayName}
							<div class={`flex items-center justify-between text-sm py-2.5 px-3 rounded-xl ${isToday ? 'bg-orange-50 border border-orange-200 -mx-1 px-4' : ''}`}>
								<div class="flex items-center gap-2">
									<span class={`font-semibold w-24 ${isToday ? 'text-orange-700' : 'text-gray-900'}`}>{h.day}</span>
									{#if isToday}<span class="text-[10px] font-bold bg-orange-500 text-white px-2 py-0.5 rounded-full">Today</span>{/if}
								</div>
								{#if h.isClosed}
									<span class="text-red-600 font-medium bg-red-50 px-2.5 py-0.5 rounded-full text-xs">Closed</span>
								{:else}
									<span class={`font-medium ${isToday ? 'text-orange-700' : 'text-gray-900'}`}>{to12h(h.open)} – {to12h(h.close)}</span>
								{/if}
							</div>
						{/each}
						{#if store.hours.length > 1}
							<button onclick={() => (showAllHours = !showAllHours)} class="w-full text-center text-xs font-medium text-orange-600 hover:text-orange-700 py-2 mt-1 transition">
								{showAllHours ? '▲ Show less' : `▼ Show full week (${store.hours.length} days)`}
							</button>
						{/if}
					</div>
					{#if store.address}
						<p class="text-xs text-gray-500 mt-4 text-center">{store.address}</p>
					{/if}
				</div>
			</div>
		</div>
	{/if}

	{#if modifierItem}
		<StoreItemModal item={modifierItem} {store} onClose={() => (modifierItem = null)} />
	{/if}
{/if}
