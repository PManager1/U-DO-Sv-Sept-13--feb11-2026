<script lang="ts">
	import { onMount } from 'svelte';
	import API_BASE from '$lib/api';

	let providers = $state<any[]>([]);
	let loading = $state(true);
	let error = $state<string | null>(null);
	let search = $state('');
	let hasMore = $state(false);
	let totalCount = $state(0);
	let page = $state(1);

	async function loadProviders(reset = false) {
		if (reset) {
			page = 1;
			providers = [];
		}
		loading = true;
		try {
			const res = await fetch(API_BASE + `providers?page=${page}&limit=24`);
			const data = await res.json();
			const list = data.providers || [];
			providers = reset ? list : [...providers, ...list];
			hasMore = !!data.pagination?.hasMore;
			totalCount = data.pagination?.totalCount ?? providers.length;
		} catch (err) {
			error = (err as Error).message;
		} finally {
			loading = false;
		}
	}

	onMount(() => {
		loadProviders(true);
	});

	const filtered = $derived(
		search.trim()
			? providers.filter((p) => {
					const q = search.toLowerCase();
					const name = (p.name || '').toLowerCase();
					const service = (p.service || '').toLowerCase();
					return name.includes(q) || service.includes(q);
				})
			: providers
	);

	const services = $derived([...new Set(providers.map((p) => p.service).filter(Boolean))]);

	function initials(p: any) {
		return (p.name || '?').trim().charAt(0).toUpperCase() || '?';
	}

	function badgeValue(b: any) {
		return b?.Value || b?.value || b?.Name || b?.name || '';
	}

	function badgeColor(b: any) {
		return b?.Color || b?.color || '#4CAF50';
	}

	function currency(v: any) {
		if (v == null || v === '' || isNaN(Number(v))) return null;
		return '$' + Number(v).toFixed(2);
	}
</script>

<svelte:head><title>Profiles · Find someone to do it for you</title></svelte:head>

<div class="min-h-screen" style="background-color:#f9f7f5">
	<div class="max-w-6xl mx-auto px-3 sm:px-6 py-6">
		<div class="mb-6">
			<h1 class="text-2xl sm:text-3xl font-extrabold tracking-tight text-gray-900">Find a Pro</h1>
			<p class="text-sm text-gray-500 mt-1">Let somebody else do it for you — browse trusted service providers{totalCount ? ` · ${totalCount} available` : ''}</p>
		</div>

		<div class="mb-6">
			<div class="relative">
				<svg class="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
				<input type="text" value={search} oninput={(e) => (search = (e.currentTarget as HTMLInputElement).value)} placeholder="Search by name or service..." class="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 bg-white placeholder-gray-400" />
			</div>
		</div>

		{#if loading && providers.length === 0}
			<div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
				{#each Array(8) as _, i}
					<div class="animate-pulse bg-white rounded-2xl border border-gray-100 p-4">
						<div class="w-16 h-16 bg-gray-200 rounded-full mx-auto mb-3"></div>
						<div class="h-3 bg-gray-200 rounded w-2/3 mx-auto"></div>
						<div class="h-3 bg-gray-100 rounded w-1/2 mx-auto mt-2"></div>
					</div>
				{/each}
			</div>
		{/if}

		{#if error && providers.length === 0}
			<div class="text-center py-16 text-gray-400">
				<p class="text-4xl mb-3">⚠️</p>
				<p class="font-semibold text-gray-700">Failed to load providers</p>
				<p class="text-sm mt-1">{error}</p>
				<button onclick={() => loadProviders(true)} class="mt-4 bg-orange-500 hover:bg-orange-600 text-white px-6 py-2 rounded-lg text-sm font-medium transition">Try Again</button>
			</div>
		{/if}

		{#if !loading && !error && filtered.length === 0}
			<div class="text-center py-16 text-gray-400">
				<p class="text-4xl mb-3">🔍</p>
				<p class="font-semibold text-gray-700">No providers found</p>
				<p class="text-sm mt-1">{search ? 'Try a different search.' : 'No providers yet.'}</p>
			</div>
		{/if}

		<div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
			{#each filtered as p}
				<div class="bg-white rounded-2xl border border-gray-100 p-4 hover:shadow-md hover:-translate-y-0.5 transition flex flex-col">
					<div class="relative mb-3 mx-auto">
						{#if p.profileImageUrl}
							<img src={p.profileImageUrl} alt={p.name} class="w-16 h-16 rounded-full object-cover ring-2 ring-orange-100" onerror={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; (e.currentTarget as HTMLImageElement).nextElementSibling?.classList.remove('hidden'); }} />
							<div class="hidden w-16 h-16 rounded-full bg-orange-100 text-orange-600 text-xl font-bold items-center justify-center">{initials(p)}</div>
						{:else}
							<div class="w-16 h-16 rounded-full bg-orange-100 text-orange-600 text-xl font-bold flex items-center justify-center">{initials(p)}</div>
						{/if}
					</div>
					<div class="text-center mb-2">
						<p class="font-semibold text-gray-900 text-sm leading-tight line-clamp-2">{p.name}</p>
						<p class="text-xs text-gray-500 mt-0.5">{p.service || 'General services'}</p>
					</div>
					<div class="flex items-center justify-center gap-1 text-xs text-gray-600 mb-2">
						<span class="text-yellow-400">★</span>
						<span class="font-bold text-gray-900">{p.rating ? p.rating.toFixed(1) : '—'}</span>
						<span class="text-gray-400">({p.reviews || 0})</span>
					</div>
					{#if p.badges && p.badges.length > 0}
						<div class="flex flex-wrap justify-center gap-1 mb-2">
							{#each p.badges as badge}
								<span class="text-[10px] font-semibold px-2 py-0.5 rounded-full text-white" style={`background-color:${badgeColor(badge)}`}>{badgeValue(badge)}</span>
							{/each}
						</div>
					{/if}
					<div class="mt-auto text-center">
						{#if currency(p.hourlyRate)}
							<p class="text-xs text-gray-600"><span class="font-bold text-gray-900">{currency(p.hourlyRate)}</span>/hr</p>
						{:else if currency(p.flatFee)}
							<p class="text-xs text-gray-600"><span class="font-bold text-gray-900">{currency(p.flatFee)}</span></p>
						{/if}
						<button onclick={() => (window.location.href = `/profiles-list?q=${encodeURIComponent(p.name)}`)} class="mt-2 w-full bg-orange-500 hover:bg-orange-600 text-white text-xs font-semibold py-2 rounded-lg transition">View Profile</button>
					</div>
				</div>
			{/each}
		</div>

		{#if hasMore && !loading}
			<div class="text-center mt-8">
				<button onclick={() => { page += 1; loadProviders(false); }} class="bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 px-6 py-2 rounded-lg text-sm font-medium transition">Load More</button>
			</div>
		{/if}

		{#if loading && providers.length > 0}
			<div class="text-center py-8 text-gray-400 text-sm">Loading more...</div>
		{/if}
	</div>
</div>
