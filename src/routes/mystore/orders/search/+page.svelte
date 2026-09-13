<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { getOrders } from '$lib/mystore/api';

	const STATUS_CONFIG: Record<string, { label: string; color: string; dot: string }> = {
		pending: { label: 'Pending', color: 'bg-yellow-100 text-yellow-800', dot: 'bg-yellow-500' },
		confirmed: { label: 'Confirmed', color: 'bg-blue-100 text-blue-800', dot: 'bg-blue-500' },
		preparing: { label: 'Preparing', color: 'bg-orange-100 text-orange-800', dot: 'bg-orange-500' },
		ready: { label: 'Ready', color: 'bg-green-100 text-green-800', dot: 'bg-green-500' },
		picked_up: { label: 'Picked Up', color: 'bg-purple-100 text-purple-800', dot: 'bg-purple-500' },
		delivered: { label: 'Delivered', color: 'bg-gray-100 text-gray-800', dot: 'bg-gray-500' },
		cancelled: { label: 'Cancelled', color: 'bg-red-100 text-red-800', dot: 'bg-red-500' }
	};

	function loadRecent() {
		try { return JSON.parse(localStorage.getItem('udo-order-searches') || '[]'); } catch { return []; }
	}

	let orders = $state<any[]>([]);
	let loading = $state(true);
	let query = $state('');
	let recentSearches = $state<string[]>(loadRecent());
	let input: HTMLInputElement;

	onMount(() => {
		getOrders().then((data) => (orders = data)).catch(() => {}).finally(() => (loading = false));
		input?.focus();
	});

	function formatTime(dateStr: string) {
		if (!dateStr) return '';
		const d = new Date(dateStr);
		const now = new Date();
		const diffMin = Math.floor((now.getTime() - d.getTime()) / 60000);
		if (diffMin < 1) return 'Just now';
		if (diffMin < 60) return `${diffMin}m ago`;
		const diffHr = Math.floor(diffMin / 60);
		if (diffHr < 24) return `${diffHr}h ago`;
		return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
	}

	function fuzzyMatch(value: any, query: string) {
		if (!value) return false;
		return String(value).toLowerCase().includes(query.toLowerCase());
	}

	function saveRecent(q: string) {
		if (!q.trim()) return;
		const next = [q, ...recentSearches.filter((s) => s !== q)].slice(0, 5);
		localStorage.setItem('udo-order-searches', JSON.stringify(next));
		recentSearches = next;
	}

	const results = $derived.by(() => {
		const q = query.trim();
		if (!q) return [];
		return orders.filter((o) => fuzzyMatch(o.orderNumber, q) || fuzzyMatch(o.customerName, q) || fuzzyMatch(o.customerPhone, q) || fuzzyMatch(o.customerEmail, q) || (o.items || []).some((i: any) => fuzzyMatch(i.itemName || i.name, q)) || fuzzyMatch(o.id, q) || fuzzyMatch(o._id, q));
	});

	function handleSelect(orderId: string) {
		saveRecent(query.trim());
		goto(`/mystore/orders?expand=${orderId}`);
	}

	function heroItems(items: any[]) {
		if (!items?.length) return '';
		const first2 = items.slice(0, 2).map((i) => `${i.quantity}× ${i.itemName || i.name}`).join(', ');
		const extra = items.length > 2 ? `… +${items.length - 2} more` : '';
		return first2 + extra;
	}

	function highlight(text: any, q: string) {
		const str = String(text || '');
		if (!q) return { before: str, match: '', after: '' };
		const idx = str.toLowerCase().indexOf(q.toLowerCase());
		if (idx === -1) return { before: str, match: '', after: '' };
		return { before: str.slice(0, idx), match: str.slice(idx, idx + q.length), after: str.slice(idx + q.length) };
	}

	const q = $derived(query.trim());
</script>

<div class="min-h-screen bg-white">
	<div class="sticky top-0 z-50 bg-white border-b border-gray-200 shadow-sm">
		<div class="flex items-center gap-2 px-4 py-3">
			<button onclick={() => goto('/mystore/orders')} class="p-2 text-gray-500 hover:text-orange-500 hover:bg-gray-100 rounded-lg transition">
				<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" /></svg>
			</button>
			<div class="flex-1 relative">
				<input bind:this={input} type="search" inputmode="search" placeholder="Order #, name, phone, or item…" value={query} oninput={(e) => (query = (e.currentTarget as HTMLInputElement).value)} onkeydown={(e) => { if (e.key === 'Enter') saveRecent(query); }} class="w-full pl-4 pr-10 py-2.5 bg-gray-100 rounded-xl text-base focus:outline-none focus:ring-2 focus:ring-orange-400/50 focus:bg-white transition" />
				{#if query}
					<button onclick={() => { query = ''; input?.focus(); }} class="absolute right-3 top-1/2 -translate-y-1/2 w-6 h-6 bg-gray-300 text-white rounded-full flex items-center justify-center text-xs hover:bg-gray-400 transition">✕</button>
				{/if}
			</div>
		</div>
		{#if q}
			<div class="px-4 pb-2">
				<span class="text-xs text-gray-500">{loading ? 'Searching…' : `${results.length} result${results.length !== 1 ? 's' : ''} for "${q}"`}</span>
			</div>
		{/if}
	</div>

	<div class="max-w-2xl mx-auto">
		{#if !q && recentSearches.length > 0}
			<div class="px-4 py-4">
				<div class="flex items-center justify-between mb-2">
					<p class="text-xs text-gray-400 font-medium">Recent Searches</p>
					<button onclick={() => { recentSearches = []; localStorage.removeItem('udo-order-searches'); }} class="text-xs text-gray-400 hover:text-red-500 transition">Clear</button>
				</div>
				<div class="flex flex-wrap gap-2">
					{#each recentSearches as s, i}
						<button onclick={() => (query = s)} class="px-3 py-1.5 bg-gray-100 text-gray-700 rounded-full text-sm hover:bg-orange-50 hover:text-orange-600 transition">{s}</button>
					{/each}
				</div>
			</div>
		{/if}

		{#if !q && recentSearches.length === 0}
			<div class="text-center py-20">
				<div class="text-5xl mb-3">🔍</div>
				<p class="text-gray-500">Search by order number, customer name,<br />phone number, or item name</p>
			</div>
		{/if}

		{#if q && !loading && results.length === 0}
			<div class="text-center py-20">
				<div class="text-5xl mb-3">🤷</div>
				<p class="text-lg font-semibold text-gray-700">No orders match "{q}"</p>
				<p class="text-gray-400 mt-1 text-sm">Try searching by name, order #, phone, or item</p>
				<button onclick={() => (query = '')} class="mt-4 px-4 py-2 bg-orange-500 text-white rounded-lg text-sm font-medium hover:bg-orange-600 transition">Clear Search</button>
			</div>
		{/if}

		{#if q && results.length > 0}
			<div class="divide-y divide-gray-100">
				{#each results as order}
					{@const orderId = order.id || order._id}
					{@const cfg = STATUS_CONFIG[order.status] || STATUS_CONFIG.pending}
					{@const hero = heroItems(order.items)}
					{@const orderNum = highlight(order.orderNumber || '—', q)}
					{@const custName = highlight(order.customerName || 'Customer', q)}
					{@const custPhone = order.customerPhone ? highlight(order.customerPhone, q) : null}
					<button onclick={() => handleSelect(orderId)} class="w-full text-left px-4 py-3 hover:bg-orange-50/50 transition flex items-start gap-3">
						<div class={`w-2.5 h-2.5 rounded-full mt-2 flex-shrink-0 ${cfg.dot}`}></div>
						<div class="flex-1 min-w-0">
							<div class="flex items-center gap-2">
								<span class="font-bold text-gray-900 text-sm">{orderNum.before}<mark class="bg-yellow-200 text-yellow-900 rounded px-0.5">{orderNum.match}</mark>{orderNum.after}</span>
								<span class={`text-[11px] px-2 py-0.5 rounded-full font-medium ${cfg.color}`}>{cfg.label}</span>
							</div>
							<p class="text-sm text-gray-500 mt-0.5 truncate">
								{custName.before}<mark class="bg-yellow-200 text-yellow-900 rounded px-0.5">{custName.match}</mark>{custName.after}
								{#if custPhone}<span class="text-gray-400"> · {custPhone.before}<mark class="bg-yellow-200 text-yellow-900 rounded px-0.5">{custPhone.match}</mark>{custPhone.after}</span>{/if}
							</p>
							{#if hero}<p class="text-xs text-gray-400 mt-0.5 truncate">{hero}</p>{/if}
						</div>
						<div class="text-right flex-shrink-0">
							<p class="font-bold text-gray-900 text-sm">${order.total?.toFixed(2) || '0.00'}</p>
							<p class="text-xs text-gray-400">{formatTime(order.createdAt)}</p>
						</div>
					</button>
				{/each}
			</div>
		{/if}
	</div>
</div>
