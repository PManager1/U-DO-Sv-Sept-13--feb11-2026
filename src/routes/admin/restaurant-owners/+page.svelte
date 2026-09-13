<script lang="ts">
	import { onMount } from 'svelte';
	import API_BASE from '$lib/api';

	let allRestaurants = $state<any[]>([]);
	let loading = $state(true);
	let error = $state<string | null>(null);
	let searchQuery = $state('');
	let expandedCard = $state<number | null>(null);

	onMount(() => {
		loadData();
	});

	async function loadData() {
		loading = true;
		error = null;
		try {
			const res = await fetch(API_BASE + 'admin/restaurants');
			if (!res.ok) throw new Error(`Server returned ${res.status}`);
			const data = await res.json();
			allRestaurants = data.restaurants || [];
		} catch (err) {
			error = (err as Error).message + ' — Make sure the server is running at ' + API_BASE;
		} finally {
			loading = false;
		}
	}

	function toggleCard(idx: number) {
		expandedCard = expandedCard === idx ? null : idx;
	}

	function enterStoreView(userId: string, storeName: string) {
		if (!window.confirm(`Enter store manager view for "${storeName}"?\n\nThis will open the store manager acting as this restaurant owner.`)) return;
		localStorage.setItem('adminMode', 'true');
		localStorage.setItem('adminTargetUserId', userId);
		window.open('/mystore', '_blank');
	}

	const stats = $derived(
		allRestaurants.reduce(
			(acc: any, r: any) => ({
				items: acc.items + (r.items || []).length,
				categories: acc.categories + (r.categories || []).length
			}),
			{ items: 0, categories: 0 }
		)
	);

	const filtered = $derived(
		searchQuery.trim()
			? allRestaurants.filter((r) => {
					const text = `${r.restaurantName || ''} ${r.storeAddress || ''} ${r.category || ''} ${r.storeType || ''} ${(r.items || []).map((i: any) => i.name || '').join(' ')}`.toLowerCase();
					return text.includes(searchQuery.toLowerCase());
				})
			: allRestaurants
	);

	const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
</script>

{#snippet itemRow(item: any)}
	{@const iname = item.name || 'Unnamed'}
	{@const price = item.basePrice || 0}
	{@const image = item.imageUrl || item.imageURL || ''}
	{@const available = item.isAvailable !== false}
	<div class="flex items-center gap-3 py-2 px-3 rounded-lg hover:bg-orange-50">
		{#if image}<img src={image} alt={iname} class="w-10 h-10 rounded-lg object-cover flex-shrink-0" onerror={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} />{/if}
		<div class="flex-1 min-w-0">
			<span class={`text-sm font-medium ${available ? 'text-gray-800' : 'line-through text-gray-400'}`}>{iname}</span>
			{#if !available}<span class="ml-2 text-xs text-red-500 font-medium">86'd</span>{/if}
		</div>
		<span class={`text-sm font-bold ${price > 0 ? 'text-green-600' : 'text-gray-400'}`}>${price.toFixed(2)}</span>
	</div>
{/snippet}

{#snippet itemList(items: any[], categories: any[])}
	{#if !items || items.length === 0}
		<p class="text-gray-400 text-sm text-center py-4">No menu items yet</p>
	{:else}
		{@const catMap = (categories || []).reduce((m: Record<string, string>, c: any) => { m[c._id] = c.name; return m; }, {})}
		{@const grouped = (() => {
			const byCat: Record<string, any[]> = {};
			const uncat: any[] = [];
			items.forEach((item) => {
				const catName = catMap[item.categoryId] || catMap[item.categoryId?.$oid] || null;
				if (catName) { if (!byCat[catName]) byCat[catName] = []; byCat[catName].push(item); }
				else uncat.push(item);
			});
			return { byCat, uncat };
		})()}
		{#each Object.entries(grouped.byCat) as [catName, catItems]}
			<div class="mb-4">
				<h5 class="text-sm font-bold text-gray-700 mb-2 flex items-center gap-1"><span class="w-2 h-2 bg-orange-400 rounded-full"></span>{catName} <span class="text-gray-400 font-normal">({catItems.length})</span></h5>
				<div class="space-y-1">{#each catItems as item}{@render itemRow(item)}{/each}</div>
			</div>
		{/each}
		{#if grouped.uncat.length > 0}
			<div class="mb-4">
				<h5 class="text-sm font-bold text-gray-700 mb-2 flex items-center gap-1"><span class="w-2 h-2 bg-gray-400 rounded-full"></span>Uncategorized <span class="text-gray-400 font-normal">({grouped.uncat.length})</span></h5>
				<div class="space-y-1">{#each grouped.uncat as item}{@render itemRow(item)}{/each}</div>
			</div>
		{/if}
	{/if}
{/snippet}

<header class="bg-white border-b border-gray-200">
	<div class="max-w-6xl mx-auto px-6 py-6">
		<a href="/admin/" class="flex items-center gap-3 group">
			<div class="w-10 h-10 bg-orange-500 rounded-xl flex items-center justify-center">
				<svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
			</div>
			<div>
				<h1 class="text-2xl font-bold text-gray-900">Restaurant Owners</h1>
				<p class="text-sm text-gray-500">View all restaurants, menus & manage stores</p>
			</div>
		</a>
	</div>
</header>

<main class="max-w-6xl mx-auto px-6 py-8">
	<div class="flex flex-wrap items-center gap-4 mb-6">
		<div class="bg-gray-50 border border-gray-200 rounded-full px-3 py-1 text-xs font-semibold">🏪 {allRestaurants.length} Restaurants</div>
		<div class="bg-gray-50 border border-gray-200 rounded-full px-3 py-1 text-xs font-semibold">🍔 {stats.items} Menu Items</div>
		<div class="bg-gray-50 border border-gray-200 rounded-full px-3 py-1 text-xs font-semibold">📂 {stats.categories} Categories</div>
		<div class="flex-1"></div>
		<div class="relative">
			<svg class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
			<input type="text" value={searchQuery} oninput={(e) => (searchQuery = (e.currentTarget as HTMLInputElement).value)} placeholder="Search restaurants, items..." class="pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm w-72 focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100" />
		</div>
		<button onclick={loadData} class="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition flex items-center gap-2">
			<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
			Refresh
		</button>
	</div>

	{#if loading}
		<div class="text-center py-16">
			<svg class="animate-spin w-10 h-10 text-orange-500 mx-auto mb-4" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path></svg>
			<p class="text-gray-500">Loading restaurants...</p>
		</div>
	{/if}

	{#if error}
		<div class="text-center py-16">
			<div class="text-5xl mb-4">⚠️</div>
			<p class="text-gray-700 font-semibold mb-2">Failed to load data</p>
			<p class="text-sm text-gray-500 mb-4">{error}</p>
			<button onclick={loadData} class="bg-orange-500 hover:bg-orange-600 text-white px-6 py-2 rounded-lg text-sm font-medium transition">Try Again</button>
		</div>
	{/if}

	{#if !loading && !error && filtered.length === 0}
		<div class="text-center py-16">
			<div class="text-5xl mb-4">🔍</div>
			<p class="text-gray-700 font-semibold mb-2">No results found</p>
			<p class="text-sm text-gray-500">Try adjusting your search query.</p>
		</div>
	{/if}

	<div class="space-y-4">
		{#each filtered as r, idx}
			{@const name = r.restaurantName || 'Unnamed Restaurant'}
			{@const isExpanded = expandedCard === idx}
			{@const items = r.items || []}
			{@const categories = r.categories || []}
			{@const isPaused = r.emergencyPause || false}
			{@const hours = r.storeHours || {}}
			<div onclick={() => toggleCard(idx)} class={`bg-white rounded-xl p-5 border cursor-pointer transition-all hover:shadow-md ${isExpanded ? 'border-orange-500 shadow-lg' : 'border-gray-200'}`}>
				<div class="flex items-center gap-4">
					<div class={`w-14 h-14 rounded-xl flex-shrink-0 flex items-center justify-center overflow-hidden ${r.logoURL ? '' : 'bg-orange-100'}`}>
						{#if r.logoURL}
							<img src={r.logoURL} alt={name} class="w-full h-full object-cover rounded-xl" />
						{:else}
							<svg class="w-7 h-7 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
						{/if}
					</div>
					<div class="flex-1 min-w-0">
						<div class="flex items-center gap-2 flex-wrap">
							<h3 class="font-semibold text-gray-900 truncate">{name}</h3>
							{#if isPaused}
								<span class="text-xs font-medium px-2 py-0.5 rounded-full bg-red-100 text-red-800">⏸ Paused</span>
							{:else if items.length > 0}
								<span class="text-xs font-medium px-2 py-0.5 rounded-full bg-green-100 text-green-800">● Live</span>
							{:else}
								<span class="text-xs font-medium px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">No items</span>
							{/if}
							{#if r.storeType}<span class="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full capitalize">{r.storeType}</span>{/if}
							{#if r.category}<span class="text-xs bg-purple-50 text-purple-600 px-2 py-0.5 rounded-full capitalize">{r.category.replace(/-/g, ' ')}</span>{/if}
						</div>
						<div class="flex items-center gap-4 mt-1 flex-wrap">
							{#if r.phoneNumber}<span class="text-sm text-green-700 font-medium">📱 {r.phoneNumber}</span>{/if}
							{#if r.storeAddress}<span class="text-sm text-gray-500 truncate max-w-xs">{r.storeAddress}</span>{/if}
							{#if r.rating > 0}<span class="text-xs text-gray-600">⭐ {r.rating.toFixed(1)} ({r.reviewCount || 0})</span>{/if}
							{#if r.deliveryTime > 0}<span class="text-xs text-gray-600">🕐 {r.deliveryTime} min</span>{/if}
							<span class="text-xs font-semibold text-gray-600">📂 {categories.length} categories</span>
							<span class="text-xs font-semibold text-gray-600">🍔 {items.length} items</span>
						</div>
					</div>
					{#if r.userId}
						<button onclick={(e) => { e.stopPropagation(); enterStoreView(r.userId, name); }} class="bg-gradient-to-br from-orange-500 to-orange-600 text-white font-semibold px-4 py-2 rounded-xl text-sm whitespace-nowrap flex items-center gap-2 hover:-translate-y-0.5 hover:shadow-lg transition-all">
							<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
							Store Manager
						</button>
					{/if}
					<svg class={`w-5 h-5 text-gray-400 flex-shrink-0 transition-transform ${isExpanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" /></svg>
				</div>

				{#if isExpanded}
					<div class="border-t border-gray-100 mt-4 pt-4 overflow-y-auto" style="max-height:70vh">
						<div class="mb-4">
							<p class="text-xs font-medium text-gray-500 mb-2">Store Hours</p>
							<div class="flex flex-wrap gap-1">
								{#each days as day}
									{@const time = hours[day]}
									<span class={`text-xs border rounded px-2 py-1 ${time ? 'bg-gray-50 border-gray-200' : 'bg-red-50 border-red-200'}`}>
										<span class={`font-medium capitalize ${time ? 'text-gray-700' : 'text-red-400'}`}>{day.slice(0, 3)}</span>
										<span class={`ml-1 ${time ? 'text-gray-500' : 'text-red-400'}`}>{time || 'Closed'}</span>
									</span>
								{/each}
							</div>
						</div>
						<div class="mb-2">
							<p class="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Menu Items</p>
							{@render itemList(items, categories)}
						</div>
					<div class="mt-3 pt-3 border-t border-gray-100">
						<p class="text-xs text-gray-400">User ID: <code class="bg-gray-50 px-1 rounded">{r.userId || ''}</code></p>
					</div>
				</div>
				{/if}
			</div>
		{/each}
	</div>
</main>

<div class="text-center text-xs text-gray-400 py-6 border-t border-gray-100 mt-8">
	UDO Admin · Restaurant Owners · Backend at <code class="bg-gray-100 px-1 rounded">localhost:3030</code>
</div>
