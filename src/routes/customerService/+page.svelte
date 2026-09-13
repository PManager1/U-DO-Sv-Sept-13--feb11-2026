<script lang="ts">
	import { onMount } from 'svelte';
	import API_BASE from '$lib/api';
	import { tickets as initialTickets, categoryDefs } from '$lib/customerServiceData';
	import TicketCard from '$lib/customerService/TicketCard.svelte';
	import ChatWindow from '$lib/customerService/ChatWindow.svelte';

	const categoryIconMap: Record<string, string> = {
		'Missing Items': '🍕',
		'Not Delivered': '🚗',
		'Restaurant Closed': '🏪',
		'Accident / Safety': '🚨',
		'Wrong Order': '🔄',
		Other: '❓'
	};
	const categorySlugMap: Record<string, string> = {
		'Missing Items': 'missing-items',
		'Not Delivered': 'not-delivered',
		'Restaurant Closed': 'restaurant-closed',
		'Accident / Safety': 'safety',
		'Wrong Order': 'wrong-order',
		Other: 'other'
	};

	let activeCategory = $state<string | null>(null);
	let chatOpen = $state<{ chatWith: any; ticket: any } | null>(null);
	let showClosed = $state(false);
	let showClosedOnly = $state(false);
	let ticketState = $state<Record<string, any>>({});
	let apiTickets = $state<any[]>([]);
	let loading = $state(true);
	let error = $state<string | null>(null);

	function mapApiIssueToTicket(issue: any) {
		const ctx = issue.context || {};
		const created = new Date(issue.createdAt);
		const minutesAgo = Math.max(1, Math.round((Date.now() - created.getTime()) / 60000));
		const categorySlug = categorySlugMap[issue.type] || 'other';

		let statusKey = issue.status || 'pending';
		let statusLabel = statusKey.replace(/-/g, ' ').toUpperCase();
		if (statusKey === 'critical') statusLabel = 'CRITICAL';
		else if (statusKey === 'urgent') statusLabel = 'URGENT';
		else if (statusKey === 'in-progress') statusLabel = 'IN PROGRESS';

		return {
			id: issue._id ? issue._id.slice(-6).toUpperCase() : issue.ticketId || '??',
			_id: issue._id,
			category: categorySlug,
			status: statusKey,
			statusLabel,
			minutesAgo,
			categoryIcon: categoryIconMap[issue.type] || '❓',
			issue: issue.description || issue.type,
			customer: { name: ctx.customerName || 'Unknown', rating: ctx.customerRating || 4.5, phone: ctx.customerPhone || '' },
			merchant: { name: ctx.merchantName || 'Unknown', tier: ctx.merchantTier || 'Standard', phone: ctx.merchantPhone || '' },
			driver: { name: ctx.driverName || 'Unknown', lang: ctx.driverLang || 'EN', phone: ctx.driverPhone || '' },
			stage: ctx.stage || 'ordered',
			lastSeen: ctx.lastSeen || `📍 Reported ${minutesAgo}m ago`,
			items: ctx.items || '—',
			totalValue: ctx.orderTotal || 0,
			udoSaved: ctx.udoSaved || 0,
			actions: [
				{ label: 'Call Customer', color: 'blue' },
				{ label: 'Call Driver', color: 'orange' },
				{ label: `Refund $${(ctx.orderTotal || 0).toFixed(2)}`, color: 'red' }
			],
			_source: 'api',
			_resolution: issue.resolution || null
		};
	}

	async function fetchIssues() {
		try {
			loading = true;
			const res = await fetch(API_BASE + 'issues');
			if (!res.ok) throw new Error(`API ${res.status}`);
			const data = await res.json();
			const mapped = (data.issues || data || []).map(mapApiIssueToTicket);
			apiTickets = mapped;
			error = null;
		} catch (err) {
			console.warn('Issue API fetch failed, using demo data:', (err as Error).message);
			error = (err as Error).message;
			apiTickets = [];
		} finally {
			loading = false;
		}
	}

	onMount(() => {
		fetchIssues();
	});

	const allTickets = $derived(apiTickets.length > 0 ? apiTickets : initialTickets);
	const enrichedTickets = $derived(
		allTickets.map((t) => ({ ...t, _resolution: t._resolution || ticketState[t.id] || null }))
	);

	function isClosed(id: string) {
		const t = enrichedTickets.find((x) => x.id === id);
		return !!(ticketState[id] || (t && t.status === 'closed'));
	}

	async function handleCloseTicket(ticketId: string, resolution: { reason: string; notes: string }) {
		const ticket = enrichedTickets.find((t) => t.id === ticketId);
		if (ticket?._id) {
			try {
				await fetch(API_BASE + `issues/${ticket._id}/status`, {
					method: 'PATCH',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ status: 'closed', resolution })
				});
			} catch (err) {
				console.warn('Failed to close ticket via API:', (err as Error).message);
			}
		}
		ticketState = { ...ticketState, [ticketId]: resolution };
	}

	let filtered = $derived.by(() => {
		let list = enrichedTickets;
		if (showClosedOnly) {
			list = list.filter((t) => isClosed(t.id));
		} else {
			if (activeCategory) list = list.filter((t) => t.category === activeCategory);
			if (!showClosed) list = list.filter((t) => !isClosed(t.id));
		}
		return list;
	});

	const openCount = $derived((catId: string) => enrichedTickets.filter((t) => t.category === catId && !isClosed(t.id)).length);
	const totalOpen = $derived(enrichedTickets.filter((t) => !isClosed(t.id)).length);
	const totalClosed = $derived(enrichedTickets.filter((t) => isClosed(t.id)).length);
</script>

<div class="min-h-screen bg-[#f9f7f5]">
	<header class="bg-white border-b border-gray-200">
		<div class="max-w-6xl mx-auto px-6 py-6">
			<div class="flex items-center justify-between">
				<div class="flex items-center gap-3">
					<div class="w-10 h-10 bg-green-500 rounded-xl flex items-center justify-center">
						<svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
					</div>
					<div>
						<h1 class="text-2xl font-bold text-gray-900">Customer Service</h1>
						<p class="text-sm text-gray-500">
							Ticket dashboard & support tools
							{#if apiTickets.length > 0}<span class="ml-2 text-green-600 font-semibold">● Live ({apiTickets.length})</span>{/if}
							{#if error}<span class="ml-2 text-yellow-600">● Demo Mode</span>{/if}
						</p>
					</div>
				</div>
				<div class="flex items-center gap-3">
					<button onclick={fetchIssues} class="text-sm font-medium text-gray-500 hover:text-gray-700 flex items-center gap-1" title="Refresh tickets">
						<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
					</button>
					<a href="/admin" class="text-sm font-medium text-gray-500 hover:text-gray-700 flex items-center gap-1">
						<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
						Admin
					</a>
				</div>
			</div>
		</div>
	</header>

	<main class="max-w-6xl mx-auto px-6 py-8">
		<h2 class="text-lg font-semibold text-gray-800 mb-1 flex items-center gap-2">
			<span class="w-2 h-2 bg-green-500 rounded-full inline-block"></span>
			Ticket Categories
		</h2>
		<p class="text-sm text-gray-500 mb-6">The "Food Delivery" basics — click to filter</p>

		<div class="grid grid-cols-2 md:grid-cols-5 gap-3 mb-8">
			{#each categoryDefs as cat}
				{@const isActive = activeCategory === cat.id && !showClosedOnly}
				<button onclick={() => { showClosedOnly = false; activeCategory = isActive ? null : cat.id; }} class={`text-left bg-white rounded-xl p-4 border-2 transition-all hover:shadow-md ${isActive ? cat.priorityBg + ' ' + cat.priorityColor + ' border-current' : 'border-gray-200'}`}>
					<div class="flex items-center gap-2 mb-1">
						<span class="text-xl">{cat.icon}</span>
						<span class="text-2xl font-bold">{openCount(cat.id)}</span>
					</div>
					<p class="text-xs font-semibold">{cat.title}</p>
					<p class={`text-[10px] font-bold mt-1 ${cat.priorityColor}`}>{cat.priority}</p>
				</button>
			{/each}
			<button onclick={() => { if (showClosedOnly) { showClosedOnly = false; } else { showClosedOnly = true; activeCategory = null; } }} class={`text-left rounded-xl p-4 border-2 transition-all hover:shadow-md ${showClosedOnly ? 'bg-gray-700 text-white border-gray-700' : 'bg-gray-50 border-gray-200 hover:bg-gray-100'}`}>
				<div class="flex items-center gap-2 mb-1">
					<span class="text-xl">✅</span>
					<span class={`text-2xl font-bold ${showClosedOnly ? 'text-white' : 'text-gray-400'}`}>{totalClosed}</span>
				</div>
				<p class={`text-xs font-semibold ${showClosedOnly ? 'text-white' : 'text-gray-600'}`}>Closed Tickets</p>
				<p class={`text-[10px] font-bold mt-1 ${showClosedOnly ? 'text-gray-300' : 'text-gray-400'}`}>RESOLVED</p>
			</button>
		</div>

		<div class="flex items-center justify-between mb-4">
			<div class="flex items-center gap-3">
				<h2 class="text-lg font-semibold text-gray-800">
					{showClosedOnly ? 'Closed Tickets' : activeCategory ? categoryDefs.find((c) => c.id === activeCategory)?.title + ' Tickets' : 'All Tickets'}
				</h2>
				<span class="text-sm text-gray-500">
					{filtered.length} ticket{filtered.length !== 1 ? 's' : ''}
					{#if totalClosed > 0} · {totalOpen} open · {totalClosed} closed{/if}
				</span>
				{#if loading}<span class="text-xs text-blue-500">Loading...</span>{/if}
			</div>
			{#if totalClosed > 0}
				<button onclick={() => (showClosed = !showClosed)} class={`text-xs font-semibold px-3 py-1.5 rounded-lg border transition ${showClosed ? 'bg-gray-800 text-white border-gray-800' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'}`}>
					{showClosed ? 'Hide Closed' : `Show Closed (${totalClosed})`}
				</button>
			{/if}
		</div>

		<div class="space-y-4">
			{#each filtered as ticket}
				<TicketCard ticket={ticket} isClosed={isClosed(ticket.id)} onClose={handleCloseTicket} onOpenChat={(chatWith, t) => (chatOpen = { chatWith, ticket: t })} />
			{/each}
		</div>

		{#if filtered.length === 0}
			<div class="text-center py-12 text-gray-400">
				<p class="text-lg">{showClosed ? 'No tickets in this view' : 'All tickets have been closed! 🎉'}</p>
				{#if !showClosed && totalClosed > 0}
					<button onclick={() => (showClosed = true)} class="mt-2 text-sm text-blue-500 hover:underline">Show closed tickets</button>
				{/if}
			</div>
		{/if}
	</main>

	{#if chatOpen}
		<ChatWindow chatWith={chatOpen.chatWith} ticket={chatOpen.ticket} onClose={() => (chatOpen = null)} />
	{/if}
</div>
