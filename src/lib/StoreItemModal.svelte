<script lang="ts">
	import { onMount } from 'svelte';
	import { cart, addToCart, updateQuantity, removeItem } from './cart.svelte';
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
		if (scrollContainer) {
			isScrolled = scrollContainer.scrollTop > 80;
		}
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

	const fullImage = $derived(
		(item?.images || []).find((img: any) => img.size === '1000')?.url ||
		(item?.images && item.images.length > 0 ? item.images[0].url : '') ||
		item?.raw_image_url || ''
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
		addToCart(store, { id: pid, name: it.name, price: Number(it.price) || 0, image: it.img || '' });
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

	function innerFind(arr: any[], key: string) {
		if (!Array.isArray(arr)) return undefined;
		return arr.find((v: any) => v.Key === key)?.Value;
	}

	function buildGroups() {
		if (!item?.modifier_data) return [];
		const allGroups = Array.isArray(item.modifier_data) ? item.modifier_data : item.modifier_data?.groups || [];
		const groupsArray = allGroups.find?.((g: any) => g.Key === 'groups')?.Value || allGroups;
		return Array.isArray(groupsArray) ? groupsArray : [];
	}
	function groupName(group: any) {
		const isKV = Array.isArray(group) && group.length > 0 && group[0].Key;
		return isKV ? innerFind(group, 'name') : group.Key ? innerFind(group.Value?.[0], 'name') : group.name;
	}
	function groupMax(group: any) {
		const isKV = Array.isArray(group) && group.length > 0 && group[0].Key;
		return isKV ? innerFind(group, 'max') : group.Key ? innerFind(group.Value?.[0], 'max') : group.max || 0;
	}
	function groupOptions(group: any) {
		const isKV = Array.isArray(group) && group.length > 0 && group[0].Key;
		const raw = isKV ? innerFind(group, 'options') : group.Key ? innerFind(group.Value?.[0], 'options') : group.options || [];
		const opts: { name: string; price: number }[] = [];
		if (!Array.isArray(raw)) return opts;
		for (const o of raw) {
			const arr = Array.isArray(o) ? o : [];
			const n = isKV ? arr.find((v: any) => v.Key === 'name')?.Value : group.Key ? arr.find((v: any) => v.Key === 'name')?.Value : o.name;
			const p = isKV ? arr.find((v: any) => v.Key === 'price')?.Value : group.Key ? arr.find((v: any) => v.Key === 'price')?.Value : o.price || 0;
			if (n) opts.push({ name: n, price: Number(p) || 0 });
		}
		return opts;
	}

	let selectedMods = $state<Record<number, number[]>>({});
	function toggleMod(gi: number, oi: number, gMax: number) {
		const current = selectedMods[gi] || [];
		let next: number[];
		if (gMax === 1) next = [oi];
		else next = current.includes(oi) ? current.filter((x) => x !== oi) : [...current, oi];
		selectedMods = { ...selectedMods, [gi]: next };
	}
	function selectedTotal() {
		let total = 0;
		buildGroups().forEach((group: any, gi: number) => {
			groupOptions(group).forEach((o, oi) => {
				if (selectedMods[gi]?.includes(oi)) total += Number(o.price || 0);
			});
		});
		return total;
	}

	const groups = $derived(buildGroups());
	const totalPrice = $derived(Number(item?.price || 0) + selectedTotal());

	function handleAdd() {
		if (!item || !store) return;
		const id = item.id || slugify(item.name.toLowerCase().replace(/\s+/g, '-'));
		addToCart(store, { id, name: item.name, price: totalPrice * qty, image: item.raw_image_url || '' });
		added = true;
		setTimeout(() => onClose?.(), 600);
	}
</script>

{#if item}
	<div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-2 sm:p-4" onclick={onClose}>
		<div 
			class="relative bg-white w-full max-w-4xl max-h-[90vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-[modalIn_0.2s_ease-out]"
			onclick={(e) => e.stopPropagation()}
		>
			<!-- Sticky Top Header -->
			<div class={`sticky top-0 z-20 flex items-center justify-between px-4 py-3 min-h-[52px] transition-colors duration-200 ${isScrolled ? 'bg-white/95 backdrop-blur-md border-b border-gray-100' : 'bg-transparent border-b border-transparent'}`}>
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
			<div 
				bind:this={scrollContainer}
				onscroll={handleScroll}
				class="flex-1 overflow-y-auto px-6 py-4 space-y-8"
			>
				<!-- Main Product View -->
				<div class="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
					<!-- Left: Image Container -->
					<div class="bg-gray-50 rounded-2xl p-6 flex items-center justify-center min-h-[300px] md:min-h-[360px]">
						{#if fullImage}
							<img src={fullImage} alt={item.name} class="max-h-[300px] w-auto object-contain mix-blend-multiply" />
						{:else}
							<div class="text-6xl text-gray-300">🫐</div>
						{/if}
					</div>

					<!-- Right: Product Details -->
					<div class="space-y-4">
						{#if item.inStock ?? true}
							<span class="inline-block px-2.5 py-1 text-xs font-medium text-emerald-800 bg-emerald-50 rounded-md">
								Usually Available
							</span>
						{/if}

						<h1 class="text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight">{item.name}</h1>
						<p class="text-xl font-bold text-gray-900">${totalPrice.toFixed(2)}</p>

						{#if item.isEbt || true}
							<span class="inline-block px-2 py-0.5 text-[11px] font-semibold text-gray-500 border border-gray-200 rounded">
								SNAP
							</span>
						{/if}

						{#if groups.length > 0}
							{#each groups as group, gi}
								{@const gName = groupName(group)}
								{@const gMax = Number(groupMax(group)) || 0}
								{@const opts = groupOptions(group)}
								{#if gName && opts.length > 0}
									<div class="border-t border-gray-100 pt-3">
										<p class="font-bold text-base text-gray-900 mb-2">{gName}{#if gMax}<span class="text-gray-500 font-normal"> (max {gMax})</span>{/if}</p>
										<div class="space-y-2">
											{#each opts as opt, oi}
												{@const isSelected = selectedMods[gi]?.includes(oi) || false}
												<label class={`flex items-center justify-between px-4 py-2.5 rounded-xl border-2 cursor-pointer transition-all duration-150 ${isSelected ? 'border-orange-500 bg-orange-50/60' : 'border-gray-100 hover:border-gray-300'}`}>
													<div class="flex items-center gap-3">
														<input type={gMax === 1 ? 'radio' : 'checkbox'} name={`mod_${gi}`} checked={isSelected} onchange={() => toggleMod(gi, oi, gMax)} class="h-4 w-4 text-orange-500 border-gray-300 focus:ring-orange-500" />
														<span class="text-sm text-gray-900 font-medium">{opt.name}</span>
													</div>
													{#if Number(opt.price) > 0}<span class="text-sm text-gray-900 font-semibold">+${Number(opt.price).toFixed(2)}</span>{/if}
												</label>
											{/each}
										</div>
									</div>
								{/if}
							{/each}
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
									{#each [1, 2, 3, 4, 5] as n}
										<option value={n}>{n}</option>
									{/each}
									<option value="custom">Custom…</option>
								</select>
								<svg class="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7"/></svg>
							</div>
							{#if customMode}
								<input
									type="number"
									min="1"
									value={customValue}
									oninput={(e) => { customValue = e.currentTarget.value; qty = parseInt(customValue, 10) || 1; }}
									class="w-24 bg-gray-100 border-none rounded-full px-4 py-2 font-medium text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-black"
									placeholder="Qty"
								/>
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

				<!-- Carousel 1: Similar Items -->
				<div class="space-y-3 pt-4">
					<div class="flex items-center justify-between">
						<h3 class="text-base font-bold text-gray-900">Often bought with</h3>
						<div class="flex gap-1">
							<button onclick={() => scrollCarousel('similar', -1)} aria-label="Scroll left" class="p-1.5 rounded-full bg-gray-100 hover:bg-gray-200"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/></svg></button>
							<button onclick={() => scrollCarousel('similar', 1)} aria-label="Scroll right" class="p-1.5 rounded-full bg-gray-100 hover:bg-gray-200"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/></svg></button>
						</div>
					</div>
					<div bind:this={carouselRefs['similar']} class="flex gap-3 overflow-x-auto pb-2 scrollbar-none">
						{#each recommended as sim}
							{@const simImg = (sim.images || []).find((i: any) => i.size === '400')?.url || (sim.images || [])[0]?.url || sim.raw_image_url || ''}
							{@const simQty = carouselQty(sim)}
							<div onclick={() => onOpenItem(sim)} class="w-36 flex-shrink-0 bg-gray-50 rounded-xl p-2.5 relative flex flex-col justify-between cursor-pointer">
								<div class="h-24 flex items-center justify-center my-2 overflow-hidden">
									{#if simImg}
										<img src={simImg} alt={sim.name} class="w-full h-full object-cover rounded-lg" />
									{:else}
										<div class="text-3xl">🫐</div>
									{/if}
								</div>
								<div>
									<p class="text-xs font-bold text-gray-900">${Number(sim.price).toFixed(2)}</p>
									<p class="text-[11px] text-gray-700 line-clamp-2 mt-0.5">{sim.name}</p>
								</div>
								{#if simQty === 0}
									<button onclick={() => addCarousel(sim)} class="absolute top-2 right-2 w-7 h-7 rounded-full bg-orange-500 hover:bg-orange-600 text-white shadow flex items-center justify-center font-bold cursor-pointer">+</button>
								{:else}
									<div class="absolute top-2 right-2 flex items-center bg-orange-500 text-white rounded-full shadow-md">
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
				<div class="space-y-3">
					<div class="flex items-center justify-between">
						<h3 class="text-base font-bold text-gray-900">Frequently bought together</h3>
						<div class="flex gap-1">
							<button onclick={() => scrollCarousel('frequent', -1)} aria-label="Scroll left" class="p-1.5 rounded-full bg-gray-100 hover:bg-gray-200"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/></svg></button>
							<button onclick={() => scrollCarousel('frequent', 1)} aria-label="Scroll right" class="p-1.5 rounded-full bg-gray-100 hover:bg-gray-200"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/></svg></button>
						</div>
					</div>
					<div bind:this={carouselRefs['frequent']} class="flex gap-3 overflow-x-auto pb-2 scrollbar-none">
						{#each frequentlyBought as freq}
							{@const freqQty = carouselQty(freq)}
							<div class="w-36 flex-shrink-0 bg-gray-50 rounded-xl p-2.5 relative flex flex-col justify-between">
								{#if freq.discount}
									<span class="absolute top-2 left-2 bg-red-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded">
										{freq.discount}
									</span>
								{/if}
								<div class="h-24 flex items-center justify-center my-2">
									<div class="text-3xl">🍉</div>
								</div>
								<div>
									<p class="text-xs font-bold text-gray-900">${freq.price} {#if freq.origPrice}<span class="line-through text-gray-400 font-normal">${freq.origPrice}</span>{/if}</p>
									<p class="text-[11px] text-gray-700 line-clamp-2 mt-0.5">{freq.name}</p>
									<p class="text-[10px] text-gray-400 mt-0.5">{freq.unit}</p>
								</div>
								{#if freqQty === 0}
									<button onclick={() => addCarousel(freq)} class="absolute bottom-2 right-2 w-7 h-7 rounded-full bg-orange-500 hover:bg-orange-600 text-white shadow flex items-center justify-center font-bold cursor-pointer">+</button>
								{:else}
									<div class="absolute bottom-2 right-2 flex items-center bg-orange-500 text-white rounded-full shadow-md">
										<button onclick={() => decCarousel(freq)} class="w-7 h-7 flex items-center justify-center hover:bg-orange-600 rounded-l-full cursor-pointer">−</button>
										<span class="min-w-[52px] text-center text-sm font-bold">{freqQty} ct</span>
										<button onclick={() => addCarousel(freq)} class="w-7 h-7 flex items-center justify-center hover:bg-orange-600 rounded-r-full cursor-pointer">+</button>
									</div>
								{/if}
							</div>
						{/each}
					</div>
				</div>

				<!-- Carousel 3: More to Explore -->
				<div class="space-y-3">
					<div class="flex items-center justify-between">
						<h3 class="text-base font-bold text-gray-900">Explore More</h3>
						<div class="flex gap-1">
							<button onclick={() => scrollCarousel('explore', -1)} aria-label="Scroll left" class="p-1.5 rounded-full bg-gray-100 hover:bg-gray-200"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/></svg></button>
							<button onclick={() => scrollCarousel('explore', 1)} aria-label="Scroll right" class="p-1.5 rounded-full bg-gray-100 hover:bg-gray-200"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/></svg></button>
						</div>
					</div>
					<div bind:this={carouselRefs['explore']} class="flex gap-3 overflow-x-auto pb-2 scrollbar-none">
						{#each moreExplore as ex}
							{@const exQty = carouselQty(ex)}
							<div class="w-36 flex-shrink-0 bg-gray-50 rounded-xl p-2.5 relative flex flex-col justify-between">
								{#if ex.discount}
									<span class="absolute top-2 left-2 bg-red-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded">
										{ex.discount}
									</span>
								{/if}
								<div class="h-24 flex items-center justify-center my-2">
									<div class="text-3xl">🫐</div>
								</div>
								<div>
									<p class="text-xs font-bold text-gray-900">${ex.price} {#if ex.origPrice}<span class="line-through text-gray-400 font-normal">${ex.origPrice}</span>{/if}</p>
									<p class="text-[11px] text-gray-700 line-clamp-2 mt-0.5">{ex.name}</p>
									<p class="text-[10px] text-gray-400 mt-0.5">{ex.unit}</p>
								</div>
								{#if exQty === 0}
									<button onclick={() => addCarousel(ex)} class="absolute bottom-2 right-2 w-7 h-7 rounded-full bg-orange-500 hover:bg-orange-600 text-white shadow flex items-center justify-center font-bold cursor-pointer">+</button>
								{:else}
									<div class="absolute bottom-2 right-2 flex items-center bg-orange-500 text-white rounded-full shadow-md">
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

			<!-- Fixed Black Bottom Button -->
			<div class="p-4 bg-white border-t border-gray-100">
				<button 
					onclick={handleAdd}
					disabled={added}
					class="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-3.5 px-4 rounded-xl transition duration-150 flex items-center justify-center text-[15px] cursor-pointer"
				>
					{#if added}
						Added to Order!
					{:else}
						Add {qty} to cart • ${(totalPrice * qty).toFixed(2)}
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
	.scrollbar-none::-webkit-scrollbar {
		display: none;
	}
	.scrollbar-none {
		-ms-overflow-style: none;
		scrollbar-width: none;
	}
</style>