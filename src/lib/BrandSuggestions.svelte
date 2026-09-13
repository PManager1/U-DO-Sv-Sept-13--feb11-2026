<script lang="ts">
	import { onMount } from 'svelte';
	import API_BASE from '$lib/api';
	import tokenManager from '$lib/tokenManager';
	import { storePath } from '$lib/storePath';

	let { query, focused = false, onPick }: { query: string; focused?: boolean; onPick: (brand: any) => void } = $props();

	let suggestions = $state<any[]>([]);
	let recent = $state<any[]>([]);
	let activeIndex = $state(-1);
	let timer: number | undefined;

	async function enrichTypes(list: any[]) {
		await Promise.all(
			list.map(async (b: any) => {
				if (!b?.id || b.brandType || b.type) return;
				try {
					const res = await fetch(API_BASE + 'brands/' + b.id);
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
		const hdrs = tokenManager.getHeaders();
		if (!hdrs.Authorization) return;
		try {
			const res = await fetch(API_BASE + 'users/recently-visited-brands', { headers: hdrs });
			if (!res.ok) return;
			const data = await res.json();
			const list = (data.brands || [])
				.slice(0, 6)
				.map((b: any) => ({
					id: b.brandId,
					name: b.brandName,
					logoUrl: b.logoUrl || '',
					brandType: b.brandType || b.type || ''
				}));
			await enrichTypes(list);
			recent = list;
		} catch {
			/* ignore */
		}
	});

	$effect(() => {
		const q = query.trim();
		clearTimeout(timer);
		if (q.length < 2) {
			suggestions = [];
			activeIndex = -1;
			return;
		}
		timer = window.setTimeout(async () => {
			try {
				const res = await fetch(API_BASE + 'brands/search-by-tag?q=' + encodeURIComponent(q));
				if (!res.ok) {
					suggestions = [];
					activeIndex = -1;
					return;
				}
				const data = await res.json();
				const list = (data.brands || []).slice(0, 6);
				await enrichTypes(list);
				suggestions = list;
				activeIndex = -1;
			} catch {
				suggestions = [];
				activeIndex = -1;
			}
		}, 300);
	});

	// Returns true if the key was handled (prevents the parent from also handling it).
	export function handleKeydown(e: KeyboardEvent): boolean {
		const list = query.trim().length >= 2 ? suggestions : recent;
		if (list.length === 0) return false;
		if (e.key === 'ArrowDown') {
			e.preventDefault();
			activeIndex = (activeIndex + 1) % list.length;
			return true;
		}
		if (e.key === 'ArrowUp') {
			e.preventDefault();
			activeIndex = (activeIndex - 1 + list.length) % list.length;
			return true;
		}
		if (e.key === 'Enter') {
			if (activeIndex >= 0 && list[activeIndex]) {
				e.preventDefault();
				onPick(list[activeIndex]);
				return true;
			}
			return false;
		}
		if (e.key === 'Escape') {
			e.preventDefault();
			suggestions = [];
			recent = [];
			activeIndex = -1;
			return true;
		}
		return false;
	}

	const showTyped = $derived(query.trim().length >= 2 && suggestions.length > 0);
	const showRecent = $derived(focused && query.trim().length < 2 && recent.length > 0);
	const displayList = $derived(showTyped ? suggestions : showRecent ? recent : []);
	const shown = $derived(showTyped || showRecent);
</script>

{#if shown}
	<div class="absolute z-50 left-0 right-0 top-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg max-h-72 overflow-y-auto">
		{#if showRecent}
			<p class="px-4 pt-3 pb-1 text-[11px] font-semibold text-gray-400 uppercase tracking-wide">Recently Viewed</p>
		{/if}
		{#each displayList as brand, i}
			{@const src = brand.logoUrl || brand.bannerUrl || ''}
			<a
				href={storePath(brand)}
				onclick={(e) => { e.preventDefault(); onPick(brand); }}
				onmouseenter={() => (activeIndex = i)}
				class={`flex items-center gap-3 px-4 py-3 text-sm border-b border-gray-100 last:border-0 ${activeIndex === i ? 'bg-gray-100' : 'hover:bg-gray-50'}`}
			>
				<span class="w-8 h-8 rounded-lg bg-gray-100 flex-shrink-0 flex items-center justify-center overflow-hidden">
					{#if src}
						<img src={src} alt={brand.name} class="w-full h-full object-cover" />
					{:else}
						<span class="text-base">🍽️</span>
					{/if}
				</span>
				<span class="truncate text-gray-800">{brand.name}</span>
			</a>
		{/each}
		{#if showTyped}
			<a href={'/search?q=' + encodeURIComponent(query.trim())} class="flex items-center gap-2 px-4 py-3 hover:bg-gray-50 text-sm text-orange-600 font-medium border-t border-gray-100">
				<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
				Search for "{query.trim()}"
			</a>
		{/if}
	</div>
{/if}
