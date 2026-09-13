<script lang="ts">
	import { cart, addToCart, updateQuantity, removeItem } from './cart.svelte';
	import { historyItems, pastOrders, favorites as favoriteSeed, popularEssentials, frequentlyBought, demoZeroOrders } from './reorderMockData';
	import tokenManager from './tokenManager';
	import LoginPromptModal from './LoginPromptModal.svelte';

	let { storeId }: { storeId: string } = $props();

	const store = { id: storeId, name: 'Grocery' };

	let tab = $state('all');
	let search = $state('');
	let favs = $state<Set<string>>(new Set(favoriteSeed));
	let loginPrompt = $state(false);

	const TABS = [
		{ key: 'all', label: 'All Items' },
		{ key: 'aisles', label: 'Your Aisles' },
		{ key: 'orders', label: 'Past Orders' },
		{ key: 'favorites', label: 'Favorites' }
	];

	function toggleFav(id: string) {
		if (!tokenManager.hasValidToken()) {
			loginPrompt = true;
			return;
		}
		const next = new Set(favs);
		if (next.has(id)) next.delete(id);
		else next.add(id);
		favs = next;
	}

	const sorted = $derived([...historyItems].sort((a, b) => b.boughtCount - a.boughtCount || a.lastOrderedDaysAgo - b.lastOrderedDaysAgo));

	const filtered = $derived.by(() => {
		const q = search.trim().toLowerCase();
		return q ? sorted.filter((i) => i.name.toLowerCase().includes(q)) : sorted;
	});

	const favItems = $derived(historyItems.filter((i) => favs.has(i.id)));
	const favFiltered = $derived.by(() => {
		const q = search.trim().toLowerCase();
		return q ? favItems.filter((i) => i.name.toLowerCase().includes(q)) : favItems;
	});

	const grouped = $derived.by(() => {
		const map: Record<string, any[]> = {};
		filtered.forEach((i: any) => { (map[i.category] = map[i.category] || []).push(i); });
		return map;
	});

	const orderItems = $derived(pastOrders.filter((o) => {
		const q = search.trim().toLowerCase();
		return !q || o.title.toLowerCase().includes(q) || o.items.some((it) => it.name.toLowerCase().includes(q));
	}));

	function cartFor(id: string) {
		return cart.items.find((i) => i.productId === id)?.quantity || 0;
	}
	function reorderBasket(order: any) {
		order.items.forEach((it: any) => {
			const cur = cartFor(it.id);
			addToCart(store, { id: it.id, name: it.name, price: it.price, image: '' });
			updateQuantity(it.id, cur + it.qty);
		});
	}
</script>

{#snippet placeholderImg()}
	<div class="w-full h-28 bg-gray-100 flex items-center justify-center text-4xl text-gray-300 rounded-t-xl">🛒</div>
{/snippet}

{#snippet stepper(item: any)}
	{@const productId = item.id}
	{@const qty = cart.items.find((i) => i.productId === productId)?.quantity || 0}
	{#if qty === 0}
		<button
			onclick={() => { addToCart(store, { id: productId, name: item.name, price: item.price, image: item.image || '' }); updateQuantity(productId, qty + 1); }}
			class="w-9 h-9 rounded-full bg-orange-500 hover:bg-orange-600 text-white flex items-center justify-center shadow transition active:scale-90"
		>
			<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" /></svg>
		</button>
	{:else}
		<div class="flex items-center bg-orange-500 text-white rounded-full shadow">
			<button onclick={() => (qty === 1 ? removeItem(productId) : updateQuantity(productId, qty - 1))} class="w-9 h-9 flex items-center justify-center hover:bg-orange-600 rounded-l-full cursor-pointer">−</button>
			<span class="min-w-[52px] text-center text-sm font-bold">{qty} ct</span>
			<button onclick={() => { addToCart(store, { id: productId, name: item.name, price: item.price, image: item.image || '' }); updateQuantity(productId, qty + 1); }} class="w-9 h-9 flex items-center justify-center hover:bg-orange-600 rounded-r-full cursor-pointer">+</button>
		</div>
	{/if}
{/snippet}

{#snippet productCard(item: any)}
	{@const isAvailable = item.available !== false}
	{@const lastLabel = item.lastOrderedDaysAgo === 0 ? 'today' : `${item.lastOrderedDaysAgo}d ago`}
	<div class={`bg-white rounded-xl overflow-hidden border border-gray-100 transition ${isAvailable ? '' : 'opacity-60'}`}>
		<div class="relative">
			{#if item.image}
				<img src={item.image} alt={item.name} class="w-full h-28 object-contain bg-gray-50" />
			{:else}
				{@render placeholderImg()}
			{/if}
			<button
				onclick={() => toggleFav(item.id)}
				class={`absolute top-2 right-2 w-8 h-8 rounded-full bg-white/90 hover:bg-white flex items-center justify-center shadow transition active:scale-90 ${favs.has(item.id) ? 'text-red-500' : 'text-gray-300'}`}
				title={favs.has(item.id) ? 'Remove from favorites' : 'Save to favorites'}
			>
				<svg class="w-4 h-4" fill={favs.has(item.id) ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" /></svg>
			</button>
		</div>
		<div class="p-2.5">
			<p class="text-sm font-semibold text-gray-900 leading-tight line-clamp-2">{item.name}</p>
			<p class="text-sm font-bold text-gray-900 mt-0.5">${Number(item.price).toFixed(2)}</p>
			{#if typeof item.boughtCount === 'number'}
				<p class="text-[11px] text-gray-500 mt-1">🏷️ Bought {item.boughtCount}x • Last ordered {lastLabel}</p>
			{/if}
			<div class="mt-2 flex items-center justify-between">
				{#if isAvailable}
					{@render stepper(item)}
				{:else}
					<button class="px-3 py-1.5 rounded-full text-xs font-medium bg-gray-100 text-gray-500">View Alternative</button>
				{/if}
			</div>
		</div>
	</div>
{/snippet}

<div>
	<div class="relative mb-4">
		<svg class="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-4.35-4.35M17 11a6 6 0 11-12 0 6 6 0 0112 0z" /></svg>
		<input
			value={search}
			oninput={(e) => (search = (e.currentTarget as HTMLInputElement).value)}
			placeholder="Search your past purchases (e.g. coffee)"
			class="w-full border border-gray-200 rounded-xl pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
		/>
	</div>

	<div class="flex gap-2 overflow-x-auto pb-3 mb-4">
		{#each TABS as t}
			<button
				onclick={() => (tab = t.key)}
				class={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition ${tab === t.key ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
			>{t.label}</button>
		{/each}
	</div>

	{#if demoZeroOrders && tab !== 'orders'}
		<section>
			<h2 class="text-lg font-bold text-gray-900 mb-1">Popular Essentials in Your Area</h2>
			<p class="text-sm text-gray-500 mb-4">You haven't ordered yet — these are the staples your neighbors love.</p>
			<div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
				{#each popularEssentials as it}{@render productCard(it)}{/each}
			</div>
		</section>
	{/if}

	{#if !demoZeroOrders && historyItems.length > 0 && historyItems.length <= 5 && tab === 'all'}
		<section class="mb-8">
			<h2 class="text-lg font-bold text-gray-900 mb-3">Buy It Again</h2>
			<div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
				{#each filtered as it}{@render productCard(it)}{/each}
			</div>
		</section>
		<section>
			<h2 class="text-lg font-bold text-gray-900 mb-3">Frequently Bought Together</h2>
			<div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
				{#each frequentlyBought as it}{@render productCard({ ...it, boughtCount: 1, lastOrderedDaysAgo: 7, available: true })}{/each}
			</div>
		</section>
	{/if}

	{#if !demoZeroOrders && (historyItems.length === 0 || historyItems.length > 5) && tab === 'all'}
		<section>
			<div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
				{#each filtered as it}{@render productCard(it)}{/each}
			</div>
		</section>
	{/if}

	{#if !demoZeroOrders && tab === 'aisles'}
		<section class="space-y-6">
			{#if Object.keys(grouped).length === 0}<p class="text-gray-500">No matches found.</p>{/if}
			{#each Object.entries(grouped) as [cat, list]}
				<div>
					<h3 class="text-base font-bold text-gray-900 mb-3 border-b border-gray-100 pb-2">{cat}</h3>
					<div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
						{#each list as it}{@render productCard(it)}{/each}
					</div>
				</div>
			{/each}
		</section>
	{/if}

	{#if tab === 'orders'}
		<section class="space-y-4">
			{#if orderItems.length === 0}<p class="text-gray-500">No orders found.</p>{/if}
			{#each orderItems as order}
				<div class="bg-white rounded-2xl border border-gray-200 p-4">
					<div class="flex items-center justify-between gap-2 mb-3">
						<div>
							<h3 class="font-semibold text-gray-900">{order.title}</h3>
							<p class="text-xs text-gray-500">{order.date}</p>
						</div>
						<button onclick={() => reorderBasket(order)} class="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg text-sm font-semibold transition">Reorder Entire Basket</button>
					</div>
					<ul class="space-y-1 text-sm text-gray-700">
						{#each order.items as it}
							<li class="flex justify-between gap-2">
								<span>{it.qty} × {it.name}</span>
								<span class="font-medium">${(it.qty * it.price).toFixed(2)}</span>
							</li>
						{/each}
					</ul>
				</div>
			{/each}
		</section>
	{/if}

	{#if !demoZeroOrders && tab === 'favorites'}
		<section>
			{#if favFiltered.length === 0}
				<p class="text-gray-500">No saved items yet. Tap the ♥ on an item to save it.</p>
			{:else}
				<div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
					{#each favFiltered as it}{@render productCard(it)}{/each}
				</div>
			{/if}
		</section>
	{/if}
	<section class="mt-8">
		<h2 class="text-lg font-bold text-gray-900 mb-3">Popular items</h2>
		<div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
			{#each popularEssentials as it}{@render productCard(it)}{/each}
		</div>
	</section>
</div>

<LoginPromptModal open={loginPrompt} onClose={() => (loginPrompt = false)} />
