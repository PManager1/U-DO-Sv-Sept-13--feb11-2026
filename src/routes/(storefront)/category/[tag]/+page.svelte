<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/state';
	import { storePath } from '$lib/storePath';
	import API_BASE from '$lib/api';
	import tokenManager from '$lib/tokenManager';
	import LoginPromptModal from '$lib/LoginPromptModal.svelte';

	const tag = $derived(page.params.tag || '');
	let results = $state<any[]>([]);
	let loading = $state(true);
	let liked = $state<Set<string>>(new Set());
	let loginPrompt = $state(false);
	let sortBy = $state<'recommended' | 'rating' | 'time' | 'price'>('recommended');
	let filters = $state<Set<string>>(new Set());

	const num = (v: any) => parseFloat(String(v ?? '').replace(/[^0-9.]/g, ''));

	function toggleFilter(f: string) {
		const next = new Set(filters);
		if (next.has(f)) next.delete(f);
		else next.add(f);
		filters = next;
	}

	const displayed = $derived.by(() => {
		let list = results.slice();
		if (filters.has('free-delivery')) list = list.filter((b) => {
			const fee = b.deliveryFeeText || b.deliveryFee || '';
			if (fee == null || fee === '') return true;
			return String(fee).includes('$0');
		});
		if (filters.has('under-30')) list = list.filter((b) => {
			const eta = b.estimatedTimeMin || b.eta || b.deliveryTime;
			if (eta == null || eta === '') return true;
			return num(eta) < 30;
		});
		if (filters.has('rating-45')) list = list.filter((b) => {
			const r = b.rating || b.avgRating;
			if (r == null) return true;
			return num(r) >= 4.5;
		});
		if (filters.has('deals')) list = list.filter((b) => {
			const hasBadge = (Array.isArray(b.badges) && b.badges.length > 0) || (Array.isArray(b.tags) && b.tags.length > 0);
			const fee = b.deliveryFeeText || b.deliveryFee || '';
			return hasBadge || String(fee).includes('$0');
		});
		if (sortBy === 'rating') list = list.sort((a, b) => (num(b.rating || b.avgRating) || -Infinity) - (num(a.rating || a.avgRating) || -Infinity));
		else if (sortBy === 'time') list = list.sort((a, b) => (num(a.estimatedTimeMin || a.eta || a.deliveryTime) || Infinity) - (num(b.estimatedTimeMin || b.eta || b.deliveryTime) || Infinity));
		else if (sortBy === 'price') list = list.sort((a, b) => (num(a.deliveryFeeText || a.deliveryFee) || Infinity) - (num(b.deliveryFeeText || b.deliveryFee) || Infinity));
		return list;
	});

	onMount(async () => {
		const headers = tokenManager.getHeaders();
		if (!headers.Authorization) return;
		try {
			const res = await fetch(API_BASE + 'favorites', { headers });
			if (res.ok) {
				const data = await res.json();
				if (Array.isArray(data)) liked = new Set(data.map((f: any) => f.brandId).filter(Boolean));
			}
		} catch (e) {
			console.error('Failed to load favorites:', e);
		}
	});

	function toggleLike(id: string, e: Event) {
		e.preventDefault();
		e.stopPropagation();
		if (!tokenManager.hasValidToken()) {
			loginPrompt = true;
			return;
		}
		const wasLiked = liked.has(id);
		const next = new Set(liked);
		if (wasLiked) next.delete(id);
		else next.add(id);
		liked = next;
		const headers = tokenManager.getHeaders();
		const revert = () => {
			const cur = new Set(liked);
			if (wasLiked) cur.add(id);
			else cur.delete(id);
			liked = cur;
		};
		fetch(API_BASE + 'favorites' + (wasLiked ? '?brandId=' + encodeURIComponent(id) : ''), {
			method: wasLiked ? 'DELETE' : 'POST',
			headers,
			...(wasLiked ? {} : { body: JSON.stringify({ brandId: id }) })
		})
			.then((r) => {
				if (!r.ok) revert();
			})
			.catch(revert);
	}

	function singularize(t: string) {
		return t && t.endsWith('s') && t.length > 1 ? t.slice(0, -1) : t;
	}

	$effect(() => {
		const t = tag;
		if (!t) { loading = false; results = []; return; }
		loading = true;
		const fetchFor = async (q: string) => {
			const r = await fetch(API_BASE + 'brands/search-by-tag?q=' + encodeURIComponent(q));
			const d = await r.json().catch(() => ({}));
			return (d.brands || []).slice();
		};
		(async () => {
			let list = await fetchFor(t);
			if (list.length === 0) {
				const alt = singularize(t);
				if (alt !== t) list = await fetchFor(alt);
			}
			results = list;
			loading = false;
		})().catch(() => (loading = false));
	});

	const title = tag ? tag.charAt(0).toUpperCase() + tag.slice(1) : '';
</script>

<svelte:head><title>{title}</title></svelte:head>

<div class="pb-16 px-3 sm:px-6 max-w-7xl mx-auto">
	<a href="/" class="inline-flex items-center gap-1 text-sm text-ink-soft hover:text-coral transition mb-4 mt-4">
		<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" /></svg>
		Back
	</a>

	<h1 class="text-3xl sm:text-4xl font-extrabold text-ink tracking-tight mb-10 sm:mb-14">{title}</h1>

	{#if !loading && results.length > 0}
		<div class="sticky top-16 z-20 bg-cream/90 backdrop-blur border-b border-line py-3 mb-8 -mx-3 sm:-mx-6 px-3 sm:px-6 flex items-center gap-4 overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
			<div class="flex items-center gap-1 flex-shrink-0 bg-white border border-line rounded-full p-0.5 shadow-soft">
				{#each ['recommended', 'rating', 'time', 'price'] as key}
					{@const labels: Record<string, string> = { recommended: 'Recommended', rating: 'Rating', time: 'Delivery time', price: 'Price' }}
					<button onclick={() => (sortBy = key as any)} class={`px-3 py-1.5 text-xs font-semibold rounded-full whitespace-nowrap transition ${sortBy === key ? 'bg-coral text-white' : 'text-ink-soft hover:text-ink'}`}>{labels[key]}</button>
				{/each}
			</div>
			<span class="w-px h-6 bg-line flex-shrink-0"></span>
			<div class="flex items-center gap-2 flex-shrink-0">
				{#each [{ key: 'free-delivery', label: 'Free delivery' }, { key: 'under-30', label: 'Under 30 min' }, { key: 'rating-45', label: '4.5+' }, { key: 'deals', label: 'Deals' }] as f}
					<button onclick={() => toggleFilter(f.key)} class={`px-3 py-1.5 text-xs font-semibold rounded-full border whitespace-nowrap transition ${filters.has(f.key) ? 'bg-coral text-white border-coral' : 'bg-white text-ink-soft border-line hover:border-coral hover:text-ink'}`}>{f.label}</button>
				{/each}
			</div>
		</div>
	{/if}

	{#if loading}
		<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 sm:gap-6">
			{#each Array(8) as _, i}
				<div class="relative overflow-hidden rounded-2xl bg-white border border-line">
					<div class="aspect-[16/10] w-full relative overflow-hidden bg-cream">
						<div class="absolute inset-0 animate-[shimmer_1.5s_infinite] bg-gradient-to-r from-cream via-white/70 to-cream"></div>
					</div>
					<div class="pt-3 pb-4 px-3.5 space-y-2">
						<div class="h-4 bg-cream rounded w-3/4"></div>
						<div class="h-3 bg-cream rounded w-1/2"></div>
						<div class="h-3 bg-cream rounded w-1/4"></div>
						<div class="flex gap-1.5 mt-2">
							<div class="h-5 bg-cream rounded-full w-16"></div>
							<div class="h-5 bg-cream rounded-full w-20"></div>
						</div>
					</div>
				</div>
			{/each}
		</div>
	{:else if results.length === 0}
		<div class="text-center py-20">
			<div class="w-20 h-20 mx-auto rounded-full bg-peach/20 text-coral flex items-center justify-center mb-5">
				<svg class="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
			</div>
			<p class="text-xl font-bold text-ink">No results found</p>
			<p class="text-sm text-ink-soft mt-2">We couldn't find anything for "{title}"</p>
			<a href="/" class="inline-flex items-center gap-2 mt-6 bg-coral hover:bg-coral-dark text-white font-semibold px-6 py-3 rounded-full transition active:scale-[0.98]">Browse categories</a>
		</div>
	{:else}
		<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 sm:gap-6">
			{#each displayed as brand, i}
				{@const bId = brand.id || brand._id || brand.name}
				{@const imageUrl = brand.bannerUrl || brand.logoUrl || brand.image || ''}
				{@const rating = brand.rating || brand.avgRating}
				{@const reviewCount = brand.reviewCount || brand.review_count}
				{@const distance = brand.distance || ''}
				{@const eta = brand.estimatedTimeMin || brand.eta || brand.deliveryTime || ''}
				{@const deliveryFee = brand.deliveryFeeText || brand.deliveryFee || ''}
				{@const rawBadges = brand.badges && Array.isArray(brand.badges) ? brand.badges : (brand.tags && Array.isArray(brand.tags) ? brand.tags.slice(0, 3).map((t: any) => ({ label: t })) : [])}
				<a href={storePath(brand)} class="group block rounded-2xl overflow-hidden bg-white hover:shadow-lift hover:-translate-y-1 active:scale-[0.99] transition-all duration-300 border border-line w-full animate-[riseIn_0.3s_ease-out]" style={`animation-delay:${Math.min(i, 8) * 40}ms`}>
					<div class="relative aspect-[16/10] w-full overflow-hidden bg-cream">
						{#if imageUrl}
							<img src={imageUrl} alt={brand.name} loading="lazy" class="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-300" />
						{:else}
							<div class="w-full h-full flex items-center justify-center text-4xl bg-gradient-to-br from-peach/20 to-cream">🍕</div>
						{/if}
						<div class="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/50 to-transparent pointer-events-none"></div>
						{#if rating}
							<span class="absolute top-2 left-2 inline-flex items-center gap-1 bg-black/40 backdrop-blur-md text-white text-xs font-semibold px-2 py-1 rounded-full">
								<svg class="w-3 h-3 text-amber-300" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>
								{rating}
							</span>
						{/if}
						<button
							onclick={(e) => toggleLike(bId, e)}
							class={`absolute top-2 right-2 w-8 h-8 rounded-full bg-white/25 backdrop-blur-md border border-white/40 flex items-center justify-center shadow-sm transition active:scale-90 ${liked.has(bId) ? 'text-coral' : 'text-white'}`}
							title={liked.has(bId) ? 'Remove from favorites' : 'Save to favorites'}
						>
							<svg class="w-4 h-4" fill={liked.has(bId) ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" /></svg>
						</button>
						{#if deliveryFee}
							<span class="absolute bottom-2 left-2 bg-coral text-white text-[11px] font-bold px-2 py-1 rounded-full shadow-sm">{deliveryFee}</span>
						{/if}
					</div>
					<div class="p-3.5">
						<h3 class="font-bold text-base text-ink truncate">{brand.name}</h3>
						<div class="flex items-center text-sm text-ink-soft mt-1 flex-wrap gap-x-1">
							{#if rating}<span class="font-semibold text-ink whitespace-nowrap flex items-center gap-0.5"><svg class="w-3.5 h-3.5 text-coral" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>{rating}</span>{/if}
							{#if reviewCount != null}<span class="whitespace-nowrap">({reviewCount})</span>{/if}
							{#if distance}
								<span class="text-line mx-0.5">•</span>
								<span class="whitespace-nowrap">{distance}</span>
							{/if}
							{#if eta}
								<span class="text-line mx-0.5">•</span>
								<span class="whitespace-nowrap">{eta} min</span>
							{/if}
						</div>
						{#if rawBadges.length > 0}
							<div class="flex flex-wrap gap-1.5 mt-2">
								{#each rawBadges as badge, idx}
									{@const label = typeof badge === 'string' ? badge : badge.label || ''}
									{#if label}
										<span class="text-xs font-semibold px-2.5 py-1 rounded-full bg-coral/10 text-coral">{label}</span>
									{/if}
								{/each}
							</div>
						{/if}
					</div>
				</a>
			{/each}
		</div>
	{/if}
</div>

<LoginPromptModal open={loginPrompt} onClose={() => (loginPrompt = false)} />
