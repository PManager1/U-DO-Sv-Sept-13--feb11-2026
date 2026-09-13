<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/state';
	import API_BASE from '$lib/api';
	import tokenManager from '$lib/tokenManager';
	import { homeSections } from '$lib/homeMockData';
	import { buildSectionItems } from '$lib/seeAllMockData';
	import { storePath } from '$lib/storePath';

	const sectionId = $derived(page.params.sectionId as string);
	const section = $derived(homeSections.find((s) => s.id === sectionId));

	let items = $state<any[]>([]);
	let loading = $state(true);

	function toCard(b: any, id: string) {
		return {
			id,
			name: b.name,
			image: b.logoUrl || b.bannerUrl || b.image || '',
			rating: b.rating ?? '4.5',
			reviews: b.reviews ?? '100+',
			eta: b.eta ?? '20-35 min',
			deliveryFee: b.deliveryFee ?? '$0 Delivery Fee',
			promoTag: b.promoTag || b.tags?.[0] || '',
			brandType: b.brandType || b.type,
			type: b.brandType || b.type
		};
	}

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
				} catch {}
			})
		);
	}

	onMount(async () => {
		if (!section) {
			loading = false;
			return;
		}

		let real: any[] = [];
		// Best-effort real data for dynamic sections; mock is the guaranteed fallback.
		try {
			if (section.id === 'featured' || section.id === 'comfort') {
				const r = await fetch(API_BASE + 'brands/search-by-tag?q=pizza').catch(() => null);
				const d = r ? await r.json().catch(() => ({})) : {};
				const list = Array.isArray(d) ? d : d.brands || [];
				await enrichTypes(list, (b: any) => b.id);
				real = list.slice(0, 16);
			} else if (section.id === 'tacos') {
				const r = await fetch(API_BASE + 'brands/search-by-tag?q=tacos').catch(() => null);
				const d = r ? await r.json().catch(() => ({})) : {};
				real = (d.brands || []).slice(0, 16);
				await enrichTypes(real, (b: any) => b.id);
			} else if (section.id === 'recently-viewed') {
				const hdrs = tokenManager.getHeaders();
				if (hdrs.Authorization) {
					const r = await fetch(API_BASE + 'users/recently-visited-brands', {
						headers: hdrs
					}).catch(() => null);
					const d = r ? await r.json().catch(() => ({})) : {};
					const brands = (d.brands || []).slice(0, 16);
					await enrichTypes(brands, (b: any) => b.brandId);
					real = brands.map((b: any) => ({
						id: b.brandId,
						name: b.brandName,
						logoUrl: b.logoUrl || '',
						brandType: b.brandType || b.type,
						type: b.brandType || b.type
					}));
				}
			}
		} catch {}

		const mock = buildSectionItems(section.items || [], 16);
		const merged = [...real.map((b) => toCard(b, b.id || b.brandId)), ...mock];
		const seen = new Set<string>();
		items = merged.filter((it) => {
			if (seen.has(it.name)) return false;
			seen.add(it.name);
			return true;
		});
		loading = false;
	});

	const title = $derived(section?.title || 'Section');
</script>

<svelte:head><title>{title} · U-DO</title></svelte:head>

<div class="min-h-screen" style="background-color:#f9f7f5">
	<div class="mx-auto max-w-6xl px-4 py-6 sm:px-6">
		<div class="mb-6 flex items-center gap-3">
			<a
				href="/"
				class="flex items-center gap-1.5 text-sm font-semibold text-orange-600 transition hover:text-orange-700"
			>
				<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"
					><path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M15 19l-7-7 7-7"
					/></svg
				>
				Home
			</a>
		</div>

		{#if !section}
			<div class="py-20 text-center">
				<p class="mb-3 text-4xl">🤷</p>
				<p class="text-lg font-semibold text-gray-700">Section not found</p>
				<p class="mt-1 text-sm text-gray-400">The section you're looking for doesn't exist.</p>
				<a href="/" class="mt-4 inline-block text-sm font-semibold text-orange-600 hover:underline"
					>Back to Home</a
				>
			</div>
		{:else}
			<div class="mb-6">
				<h1 class="text-2xl font-extrabold tracking-tight text-gray-900 sm:text-3xl">{title}</h1>
				<p class="mt-1 text-sm text-gray-500">
					{#if loading}Loading...{:else}{items.length} store{items.length !== 1 ? 's' : ''}{/if}
				</p>
			</div>

			{#if loading}
				<div class="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
					{#each Array(8) as _, i}
						<div class="animate-pulse overflow-hidden rounded-2xl border border-gray-100 bg-white">
							<div class="h-32 bg-gray-200"></div>
							<div class="space-y-2 p-4">
								<div class="h-3 w-2/3 rounded bg-gray-200"></div>
								<div class="h-3 w-1/2 rounded bg-gray-100"></div>
							</div>
						</div>
					{/each}
				</div>
			{:else}
				<div class="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
					{#each items as item}
						<a
							href={storePath(item)}
							class="group block overflow-hidden rounded-2xl border border-gray-100 bg-white transition-all duration-200 hover:-translate-y-1 hover:shadow-lift"
						>
							<div class="relative h-32 overflow-hidden bg-gray-100">
								{#if item.image}
									<img
										src={item.image}
										alt={item.name}
										class="h-full w-full object-cover object-center transition-transform duration-300 group-hover:scale-105"
									/>
								{:else}
									<div
										class="flex h-full w-full items-center justify-center bg-gray-100 text-3xl text-gray-300"
									>
										🍽️
									</div>
								{/if}
								{#if item.promoTag}
									<span
										class="absolute bottom-2 left-2 rounded-full bg-black/60 px-2 py-0.5 text-[11px] font-bold text-white backdrop-blur"
										>{item.promoTag}</span
									>
								{/if}
							</div>
							<div class="p-3">
								<div class="flex items-start justify-between gap-2">
									<h3 class="line-clamp-2 text-sm font-bold text-gray-900">{item.name}</h3>
									<div
										class="flex flex-shrink-0 items-center gap-0.5 text-xs font-semibold text-gray-800"
									>
										<svg class="h-3.5 w-3.5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20"
											><path
												d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"
											/></svg
										>
										{item.rating}
									</div>
								</div>
								<p class="mt-0.5 text-xs text-gray-400">({item.reviews || '100+'})</p>
								<p class="mt-1.5 text-xs text-gray-500">{item.eta}</p>
								<p class="mt-0.5 text-[11px] font-semibold text-gray-700">{item.deliveryFee}</p>
							</div>
						</a>
					{/each}
				</div>
			{/if}
		{/if}
	</div>
</div>
