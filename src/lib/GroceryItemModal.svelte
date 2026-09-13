<script lang="ts">
	import { onMount } from 'svelte';
	import { cart, addToCart, updateQuantity, removeItem, extractImages } from './cart.svelte';
	import { slugify } from './slug';
	import ReplacementModal from './ReplacementModal.svelte';

	let { item, store, onClose, recommended = [], onOpenItem = () => {} }: { item: any; store: any; onClose: () => void; recommended?: any[]; onOpenItem?: (item: any) => void } = $props();

	let qty = $state(1);
	let customMode = $state(false);
	let customValue = $state('');
	let added = $state(false);
	let isScrolled = $state(false);
	let scrollContainer: HTMLDivElement | null = $state(null);
	let showReplacement = $state(false);

	onMount(() => {
		const onKey = (e: KeyboardEvent) => {
			if (e.key === 'Escape') onClose();
		};
		window.addEventListener('keydown', onKey);
		return () => window.removeEventListener('keydown', onKey);
	});

	function handleScroll() {
		if (scrollContainer) isScrolled = scrollContainer.scrollTop > 80;
	}

	function handleShare() {
		if (!item) return;
		const itemId = item.id || slugify(item.name);
		const shareUrl = `${window.location.origin}${window.location.pathname}?item=${encodeURIComponent(itemId)}`;
		const text = `${item.name} — $${Number(item.price).toFixed(2)}`;
		if (navigator.share) {
			navigator.share({ title: item.name, text, url: shareUrl }).catch(() => {});
		} else {
			navigator.clipboard.writeText(`${text}\n${shareUrl}`);
		}
	}

	const GALLERY_SIZE = '1000';

	const galleryImages = $derived.by(() => {
		const seen = new Set<string>();
		const out: { url: string; size?: string }[] = [];
		const push = (u?: string, s?: string) => {
			if (u && !seen.has(u)) { seen.add(u); out.push({ url: u, size: s }); }
		};

		const regular = (item?.images || []).filter((img: any) => img?.size === GALLERY_SIZE);
		const regularToUse = regular.length > 0 ? regular : item?.images || [];
		regularToUse.forEach((img: any) => push(img?.url, img?.size));

		const store = (item?.storeImages || []).filter(
			(img: any) => img?.size === 'store-' + GALLERY_SIZE || img?.size === GALLERY_SIZE
		);
		const storeToUse = store.length > 0 ? store : item?.storeImages || [];
		storeToUse.forEach((img: any) => push(img?.url, img?.size));

		if (item?.raw_image_url) push(item.raw_image_url);
		return out;
	});

	const fullImage = $derived(galleryImages[0]?.url || '');
	let activeIdx = $state(0);
	$effect(() => { item; activeIdx = 0; });

	const activeImage = $derived(
		galleryImages[Math.min(activeIdx, galleryImages.length - 1)]?.url || ''
	);

	// Mock groups matching screenshot categories
	const similarItems = [
		{ id: 'sim-1', name: 'Blueberries Prepacked - 18 oz', price: 7.99, origPrice: 8.99, discount: '11% off', unit: '18 oz', img: '/placeholder.jpg' },
		{ id: 'sim-2', name: 'Clamshell Blackberrys (6 oz)', price: 2.99, origPrice: 4.99, discount: '40% off', unit: '6 oz', img: '/placeholder.jpg' },
		{ id: 'sim-3', name: 'Clamshell Blackberrys (6 oz)', price: 2.99, origPrice: 4.99, discount: '40% off', unit: '6 oz', img: '/placeholder.jpg' },
		{ id: 'sim-4', name: 'Clamshell Blackberrys (6 oz)', price: 2.99, origPrice: 4.99, discount: '40% off', unit: '6 oz', img: '/placeholder.jpg' },
		{ id: 'sim-5', name: 'Clamshell Blackberrys (6 oz)', price: 2.99, origPrice: 4.99, discount: '40% off', unit: '6 oz', img: '/placeholder.jpg' },
		{ id: 'sim-6', name: 'Naturipe Fresh Blueberries (6 oz)', price: 1.99, origPrice: 3.99, discount: '50% off', unit: '6 oz', img: '/placeholder.jpg' },
		{ id: 'sim-7', name: 'O Organics Blueberries (6 oz)', price: 5.99, origPrice: null, discount: null, unit: '6 oz', img: '/placeholder.jpg' },
		{ id: 'sim-8', name: "Driscoll's Raspberries (6 oz)", price: 4.99, origPrice: null, discount: null, unit: '6 oz', img: '/placeholder.jpg' }
	];

	const frequentlyBought = [
		{ id: 'freq-1', name: 'Fresh Cut Watermelon Bowl (24 oz)', price: 5.99, origPrice: 6.49, discount: '8% off', unit: '24 oz' },
		{ id: 'freq-2', name: 'Organic Small Green Bell Pepper', price: 1.79, origPrice: null, discount: null, unit: 'each' },
		{ id: 'freq-3', name: 'Bolthouse Farms Baby Cut Carrots (1 lbs)', price: 1.49, origPrice: null, discount: null, unit: '1 lbs' },
		{ id: 'freq-4', name: 'Signature Cafe Traditional Whole ...', price: 8.59, origPrice: null, discount: null, unit: 'each' }
	];

	const moreExplore = [
		{ id: 'explore-1', name: 'Organic Strawberries (1 lb)', price: 4.29, origPrice: 5.49, discount: '22% off', unit: '1 lb' },
		{ id: 'explore-2', name: 'Blackberries Prepacked (18 oz)', price: 6.99, origPrice: null, discount: null, unit: '18 oz' },
		{ id: 'explore-3', name: 'Raspberries Prepacked (12 oz)', price: 3.99, origPrice: null, discount: null, unit: '12 oz' },
		{ id: 'explore-4', name: 'Mixed Berry Fruit Medley (16 oz)', price: 5.49, origPrice: 6.99, discount: '21% off', unit: '16 oz' }
	];

	let carouselRefs: Record<string, HTMLDivElement | null> = {};

	function scrollCarousel(key: string, dir: 1 | -1) {
		const el = carouselRefs[key];
		if (el) el.scrollBy({ left: dir * 220, behavior: 'smooth' });
	}

	function carouselId(it: any) {
		return it.id || slugify(it.name.toLowerCase().replace(/\s+/g, '-'));
	}
	function addCarousel(it: any) {
		if (!store) return;
		const pid = carouselId(it);
		addToCart(store, { id: pid, name: it.name, price: Number(it.price) || 0, images: extractImages(it), image: it.img || '' });
	}
	function decCarousel(it: any) {
		const pid = carouselId(it);
		const q = cart.items.find((i: any) => i.productId === pid)?.quantity || 0;
		if (q <= 1) removeItem(pid);
		else updateQuantity(pid, q - 1);
	}
	function carouselQty(it: any) {
		const pid = carouselId(it);
		return cart.items.find((i: any) => i.productId === pid)?.quantity || 0;
	}

	function handleAdd() {
		if (!item || !store) return;
		const id = item.id || slugify(item.name.toLowerCase().replace(/\s+/g, '-'));
		addToCart(store, { id, name: item.name, price: Number(item.price) * qty, images: extractImages(item), image: item.raw_image_url || '' });
		added = true;
		setTimeout(() => onClose?.(), 600);
	}
</script>

{#if item}
	<div class="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-0 sm:p-4" onclick={onClose}>
		<div
			class="relative bg-white w-full max-w-4xl max-h-[100dvh] landscape:max-h-[calc(100dvh-2rem)] sm:h-auto sm:max-h-[850px] sm:rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-[modalIn_0.2s_ease-out]"
			onclick={(e) => e.stopPropagation()}
		>
			<!-- Sticky Top Header -->
			<div class={`sticky top-0 z-20 flex items-center justify-between px-4 pt-6 pb-3 min-h-[56px] transition-colors duration-200 ${isScrolled ? 'bg-white/95 backdrop-blur-md border-b border-gray-100' : 'bg-transparent border-b border-transparent'}`}>
				<div class="w-5"></div>

				{#if isScrolled}
					<h3 class="text-sm font-semibold text-gray-900 truncate px-2 transition-opacity duration-200">{item.name}</h3>
				{/if}

				<div class="flex items-center gap-1">
					<button onclick={handleShare} aria-label="Share" class="p-1.5 rounded-full hover:bg-gray-100 text-gray-700 transition cursor-pointer">
						<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M7.217 10.907a2.25 2.25 0 100 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186l9.566-5.314m-9.566 7.5l9.566 5.314m0 0a2.25 2.25 0 103.935 2.186 2.25 2.25 0 00-3.935-2.186zm0-12.814a2.25 2.25 0 103.933-2.185 2.25 2.25 0 00-3.933 2.185z" /></svg>
					</button>
					<button onclick={onClose} aria-label="Close" class="p-1.5 rounded-full hover:bg-gray-100 text-gray-700 transition cursor-pointer">
						<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
					</button>
				</div>
			</div>

			<!-- Scrollable Content -->
			<div bind:this={scrollContainer} onscroll={handleScroll} class="flex-1 overflow-y-auto px-4 sm:px-6 py-3 sm:py-4 space-y-6 sm:space-y-10 pb-16 sm:pb-4">
				<!-- Main Product View -->
				<div class="grid grid-cols-1 landscape:grid-cols-2 md:grid-cols-2 gap-4 sm:gap-8 items-start">
					<!-- Left: Image Gallery -->
					<div>
						<div class="bg-gray-50 rounded-2xl p-4 sm:p-8 flex items-center justify-center min-h-[200px] landscape:min-h-[180px] sm:min-h-[300px] md:min-h-[360px]">
							{#if activeImage}
								<img src={activeImage} alt={item.name} class="max-h-[180px] landscape:max-h-[160px] sm:max-h-[300px] w-auto object-contain" />
							{:else}
								<div class="text-6xl text-gray-300">🫐</div>
							{/if}
						</div>

						{#if galleryImages.length > 1}
							<div class="flex justify-center gap-2 mt-3 overflow-x-auto max-w-full py-1 flex-nowrap">
								{#each galleryImages as img, i}
									<button type="button" onclick={() => (activeIdx = i)}
										aria-label="Image {i + 1}" aria-current={i === activeIdx ? 'true' : undefined}
										class={`w-14 h-14 rounded-lg border-2 overflow-hidden cursor-pointer p-0 flex-shrink-0 bg-white ${i === activeIdx ? 'border-orange-500' : 'border-gray-200 hover:border-gray-400'}`}>
										<img src={img.url} alt="" class="w-full h-full object-contain p-1" referrerpolicy="no-referrer" />
									</button>
								{/each}
							</div>
						{/if}
					</div>

					<!-- Right: Product Details -->
					<div class="space-y-4 sm:space-y-6">
						{#if item.inStock ?? true}
							<span class="inline-block px-2.5 py-1 text-xs font-medium text-emerald-800 bg-emerald-50 rounded-md">Usually Available</span>
						{/if}

						<h1 class="text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight">{item.name}</h1>
						<p class="text-xl font-bold text-gray-900">${Number(item.price).toFixed(2)}</p>

						{#if item.isEbt || true}
							<span class="inline-block px-2 py-0.5 text-[11px] font-semibold text-gray-500 border border-gray-200 rounded">SNAP</span>
						{/if}

						<!-- Quantity Select Button -->
						<div class="flex items-center gap-2">
							<div class="relative inline-block">
								<select
									value={customMode ? 'custom' : qty}
									onchange={(e) => {
										const v = e.currentTarget.value;
										if (v === 'custom') { customMode = true; customValue = ''; }
										else { customMode = false; qty = Number(v); }
									}}
									class="bg-gray-100 border-none rounded-full pl-4 pr-8 py-2 font-medium text-sm text-gray-800 appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-black"
								>
									{#each [1, 2, 3, 4, 5,6,7,8,9,10,11,12,13,14,15] as n}<option value={n}>{n}</option>{/each}
									<option value="custom">Custom…</option>
								</select>
								<svg class="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7"/></svg>
							</div>
							{#if customMode}
								<input type="number" min="1" value={customValue} oninput={(e) => { customValue = e.currentTarget.value; qty = parseInt(customValue, 10) || 1; }} class="w-24 bg-gray-100 border-none rounded-full px-4 py-2 font-medium text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-black" placeholder="Qty" />
							{/if}
						</div>

						<!-- Description -->
						<div class="pt-2 space-y-1.5">
							<h4 class="text-sm font-bold text-gray-900">Details</h4>
							<p class="text-xs text-gray-600 leading-relaxed">
								{item.description || 'Blueberries are naturally blue, offering a sweet taste and full of freshness. They are versatile for consumption, enjoyable by the handful or as an ingredient in baking.'}
							</p>
						</div>

						<!-- Replace/Note Action Option -->
						<button onclick={() => (showReplacement = true)} class="w-full flex items-center justify-between p-3 bg-gray-50 rounded-xl text-left hover:bg-gray-100 transition">
							<div class="flex items-start gap-3">
								<svg class="w-5 h-5 text-gray-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>
								<div>
									<p class="text-xs font-semibold text-gray-900">Add a note or provide replacement options</p>
									<p class="text-[11px] text-gray-500">Items can sell out before your order is picked. Set a backup so we know what you like!</p>
								</div>
							</div>
							<svg class="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/></svg>
						</button>
					</div>
				</div>

				<!-- Carousel 1: Often bought with -->
				<div class="space-y-3 pt-4">
					<div class="flex items-center justify-between">
						<h3 class="text-[17px] font-semibold text-gray-900">Often bought with</h3>
						<div class="flex gap-1">
							<button onclick={() => scrollCarousel('similar', -1)} aria-label="Scroll left" class="p-1.5 rounded-full bg-gray-100 hover:bg-gray-200 cursor-pointer"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/></svg></button>
							<button onclick={() => scrollCarousel('similar', 1)} aria-label="Scroll right" class="p-1.5 rounded-full bg-gray-100 hover:bg-gray-200 cursor-pointer"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/></svg></button>
						</div>
					</div>
					<div bind:this={carouselRefs['similar']} class="flex gap-4 overflow-x-auto pb-2 scrollbar-none">
						{#each recommended as sim}
							{@const simImg = (sim.images || []).find((i: any) => i.size === '400')?.url || (sim.images || [])[0]?.url || sim.raw_image_url || ''}
							{@const simQty = carouselQty(sim)}
							<div onclick={() => onOpenItem(sim)} class="w-40 flex-shrink-0 bg-gray-50 rounded-xl p-2.5 relative flex flex-col justify-between cursor-pointer">
								<div class="h-28 flex items-center justify-center my-2 overflow-hidden">
									{#if simImg}
										<img src={simImg} alt={sim.name} class="w-full h-full object-cover rounded-lg" />
									{:else}
										<div class="text-3xl">🫐</div>
									{/if}
								</div>
								<div>
									<p class="text-xs font-bold text-gray-900">${Number(sim.price).toFixed(2)}</p>
									<p class="text-[11px] text-gray-700 line-clamp-2 mt-0.5">{sim.name}</p>
									{#if sim.description}
										<p class="text-[10px] text-gray-500 line-clamp-2 mt-0.5">{sim.description}</p>
									{/if}
								</div>
								{#if simQty === 0}
									<button onclick={(e) => { e.stopPropagation(); addCarousel(sim); }} class="absolute top-2 right-2 w-7 h-7 rounded-full bg-orange-500 hover:bg-orange-600 text-white shadow flex items-center justify-center font-bold cursor-pointer">+</button>
								{:else}
									<div onclick={(e) => e.stopPropagation()} class="absolute top-2 right-2 flex items-center bg-orange-500 text-white rounded-full shadow-md">
										<button onclick={() => decCarousel(sim)} class="w-7 h-7 flex items-center justify-center hover:bg-orange-600 rounded-l-full cursor-pointer">−</button>
										<span class="min-w-[52px] text-center text-sm font-bold">{simQty} ct</span>
										<button onclick={() => addCarousel(sim)} class="w-7 h-7 flex items-center justify-center hover:bg-orange-600 rounded-r-full cursor-pointer">+</button>
									</div>
								{/if}
							</div>
						{/each}
					</div>
				</div>

				<!-- Carousel 2: Frequently Bought Together -->
				<div class="space-y-3 pt-4">
					<div class="flex items-center justify-between">
						<h3 class="text-[17px] font-semibold text-gray-900">Frequently bought together</h3>
						<div class="flex gap-1">
							<button onclick={() => scrollCarousel('frequent', -1)} aria-label="Scroll left" class="p-1.5 rounded-full bg-gray-100 hover:bg-gray-200 cursor-pointer"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/></svg></button>
							<button onclick={() => scrollCarousel('frequent', 1)} aria-label="Scroll right" class="p-1.5 rounded-full bg-gray-100 hover:bg-gray-200 cursor-pointer"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/></svg></button>
						</div>
					</div>
					<div bind:this={carouselRefs['frequent']} class="flex gap-4 overflow-x-auto pb-2 scrollbar-none">
						{#each frequentlyBought as freq}
							{@const freqQty = carouselQty(freq)}
							<div class="w-40 flex-shrink-0 bg-gray-50 rounded-xl p-2.5 relative flex flex-col justify-between">
								{#if freq.discount}
									<span class="absolute top-2 left-2 bg-red-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded">{freq.discount}</span>
								{/if}
								<div class="h-28 flex items-center justify-center my-2"><div class="text-3xl">🍉</div></div>
								<div>
									<p class="text-xs font-bold text-gray-900">${freq.price} {#if freq.origPrice}<span class="line-through text-gray-400 font-normal">${freq.origPrice}</span>{/if}</p>
									<p class="text-[11px] text-gray-700 line-clamp-2 mt-0.5">{freq.name}</p>
									<p class="text-[10px] text-gray-400 mt-0.5">{freq.unit}</p>
								</div>
								{#if freqQty === 0}
									<button onclick={() => addCarousel(freq)} class="absolute top-2 right-2 w-7 h-7 rounded-full bg-orange-500 hover:bg-orange-600 text-white shadow flex items-center justify-center font-bold cursor-pointer">+</button>
								{:else}
									<div class="absolute top-2 right-2 flex items-center bg-orange-500 text-white rounded-full shadow-md">
										<button onclick={() => decCarousel(freq)} class="w-7 h-7 flex items-center justify-center hover:bg-orange-600 rounded-l-full cursor-pointer">−</button>
										<span class="min-w-[52px] text-center text-sm font-bold">{freqQty} ct</span>
										<button onclick={() => addCarousel(freq)} class="w-7 h-7 flex items-center justify-center hover:bg-orange-600 rounded-r-full cursor-pointer">+</button>
									</div>
								{/if}
							</div>
						{/each}
					</div>
				</div>

				<!-- Carousel 3: Explore More -->
				<div class="space-y-3 pt-4">
					<div class="flex items-center justify-between">
						<h3 class="text-[17px] font-semibold text-gray-900">Explore More</h3>
						<div class="flex gap-1">
							<button onclick={() => scrollCarousel('explore', -1)} aria-label="Scroll left" class="p-1.5 rounded-full bg-gray-100 hover:bg-gray-200 cursor-pointer"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/></svg></button>
							<button onclick={() => scrollCarousel('explore', 1)} aria-label="Scroll right" class="p-1.5 rounded-full bg-gray-100 hover:bg-gray-200 cursor-pointer"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/></svg></button>
						</div>
					</div>
					<div bind:this={carouselRefs['explore']} class="flex gap-4 overflow-x-auto pb-2 scrollbar-none">
						{#each moreExplore as ex}
							{@const exQty = carouselQty(ex)}
							<div class="w-40 flex-shrink-0 bg-gray-50 rounded-xl p-2.5 relative flex flex-col justify-between">
								{#if ex.discount}
									<span class="absolute top-2 left-2 bg-red-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded">{ex.discount}</span>
								{/if}
								<div class="h-28 flex items-center justify-center my-2"><div class="text-3xl">🫐</div></div>
								<div>
									<p class="text-xs font-bold text-gray-900">${ex.price} {#if ex.origPrice}<span class="line-through text-gray-400 font-normal">${ex.origPrice}</span>{/if}</p>
									<p class="text-[11px] text-gray-700 line-clamp-2 mt-0.5">{ex.name}</p>
									<p class="text-[10px] text-gray-400 mt-0.5">{ex.unit}</p>
								</div>
								{#if exQty === 0}
									<button onclick={() => addCarousel(ex)} class="absolute top-2 right-2 w-7 h-7 rounded-full bg-orange-500 hover:bg-orange-600 text-white shadow flex items-center justify-center font-bold cursor-pointer">+</button>
								{:else}
									<div class="absolute top-2 right-2 flex items-center bg-orange-500 text-white rounded-full shadow-md">
										<button onclick={() => decCarousel(ex)} class="w-7 h-7 flex items-center justify-center hover:bg-orange-600 rounded-l-full cursor-pointer">−</button>
										<span class="min-w-[52px] text-center text-sm font-bold">{exQty} ct</span>
										<button onclick={() => addCarousel(ex)} class="w-7 h-7 flex items-center justify-center hover:bg-orange-600 rounded-r-full cursor-pointer">+</button>
									</div>
								{/if}
							</div>
						{/each}
					</div>
				</div>

				<!-- Disclaimer Footer -->
				<div class="pt-4 border-t border-gray-100 text-[11px] text-black space-y-1">
					<p>Please Note:</p>
					<p>Product details shown here may not be completely current or accurate. Always check the physical item packaging for the most up-to-date information, ingredient lists, and warnings.</p>
					<p>Catalog prices are set directly by the merchant and may differ from (or be higher than) in-store prices.</p>
				</div>
			</div>

			<!-- Fixed Orange Bottom Button -->
			<div class="px-4 pt-5 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:pb-[calc(1.0rem+env(safe-area-inset-bottom))] bg-white border-t border-gray-100">
				<button onclick={handleAdd} disabled={added} class="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-3.5 px-4 rounded-xl transition duration-150 flex items-center justify-center text-[15px] cursor-pointer">
					{#if added}
						Added to Order!
					{:else}
						Add {qty} to cart • ${(Number(item.price) * qty).toFixed(2)}
					{/if}
				</button>
			</div>
		</div>
	</div>

	{#if showReplacement}
		<ReplacementModal {item} {store} recommended={recommended} onBack={() => (showReplacement = false)} onClose={() => (showReplacement = false)} />
	{/if}
{/if}

<style>
	@keyframes modalIn {
		from { opacity: 0; transform: scale(0.98); }
		to { opacity: 1; transform: scale(1); }
	}
	.scrollbar-none::-webkit-scrollbar { display: none; }
	.scrollbar-none { -ms-overflow-style: none; scrollbar-width: none; }
</style>
