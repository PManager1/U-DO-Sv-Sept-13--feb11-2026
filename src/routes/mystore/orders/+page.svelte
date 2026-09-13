<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { getOrders, updateOrderStatus } from '$lib/mystore/api';

	const STATUS_CONFIG: Record<string, { label: string; color: string; dot: string; next: string[] }> = {
		pending: { label: 'Pending', color: 'bg-yellow-100 text-yellow-800', dot: 'bg-yellow-500', next: ['confirmed', 'cancelled'] },
		confirmed: { label: 'Confirmed', color: 'bg-blue-100 text-blue-800', dot: 'bg-blue-500', next: ['preparing', 'cancelled'] },
		preparing: { label: 'Preparing', color: 'bg-orange-100 text-orange-800', dot: 'bg-orange-500', next: ['ready', 'cancelled'] },
		ready: { label: 'Ready', color: 'bg-green-100 text-green-800', dot: 'bg-green-500', next: ['picked_up'] },
		picked_up: { label: 'Picked Up', color: 'bg-purple-100 text-purple-800', dot: 'bg-purple-500', next: ['delivered'] },
		delivered: { label: 'Delivered', color: 'bg-gray-100 text-gray-800', dot: 'bg-gray-500', next: [] },
		cancelled: { label: 'Cancelled', color: 'bg-red-100 text-red-800', dot: 'bg-red-500', next: [] }
	};
	const PROGRESS_STAGES = ['pending', 'confirmed', 'preparing', 'ready', 'picked_up', 'delivered'];
	const PRIMARY_ACTION_LABELS: Record<string, { text: string; icon: string }> = {
		confirmed: { text: '✓ Confirm', icon: '✓' },
		preparing: { text: '🔥 Start Preparing', icon: '🔥' },
		ready: { text: '✅ Mark Ready', icon: '✅' },
		picked_up: { text: '🚗 Picked Up', icon: '🚗' },
		delivered: { text: '📦 Delivered', icon: '📦' }
	};
	const FILTER_TABS = ['all', 'pending', 'confirmed', 'preparing', 'ready', 'picked_up', 'delivered', 'cancelled'];
	const MOCK_DRIVERS = [
		{ driverName: 'Marcus J.', driverPhone: '202-555-1234', driverDistance: 1.2, driverEta: 4 },
		{ driverName: 'Sarah K.', driverPhone: '301-555-6789', driverDistance: 0.8, driverEta: 3 },
		{ driverName: 'David L.', driverPhone: '703-555-4567', driverDistance: 2.1, driverEta: 7 }
	];

	let orders = $state<any[]>([]);
	let loading = $state(true);
	let error = $state('');
	let activeFilter = $state('all');
	let expandedOrder = $state<string | null>(null);
	let updating = $state<Record<string, boolean>>({});
	let timer: ReturnType<typeof setInterval> | null = null;

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

	function injectMockDriverData(list: any[]) {
		let driverIdx = 0;
		return list.map((order) => {
			if ((order.status === 'ready' || order.status === 'picked_up') && !order.driverName) {
				return { ...order, ...MOCK_DRIVERS[driverIdx++ % MOCK_DRIVERS.length], _driverDemo: true };
			}
			return order;
		});
	}

	async function fetchOrders() {
		try {
			const data = await getOrders();
			orders = injectMockDriverData(data);
			error = '';
		} catch (err: any) {
			error = err.message || 'Failed to load orders';
		} finally {
			loading = false;
		}
	}

	onMount(() => {
		fetchOrders();
		timer = setInterval(fetchOrders, 30000);
		return () => { if (timer) clearInterval(timer); };
	});

	const expandId = $derived(page.url.searchParams.get('expand'));
	$effect(() => {
		if (expandId && !loading) {
			expandedOrder = expandId;
			goto('/mystore/orders', { replaceState: true, keepFocus: true });
		}
	});

	async function handleStatusUpdate(orderId: string, newStatus: string) {
		updating = { ...updating, [orderId]: true };
		try {
			const updated = await updateOrderStatus(orderId, newStatus);
			orders = orders.map((o) => (o.id === orderId || o._id === orderId ? { ...o, ...updated } : o));
			error = '';
		} catch (err: any) {
			error = err.message || 'Failed to update order';
		} finally {
			updating = { ...updating, [orderId]: false };
		}
	}

	const filteredOrders = $derived(activeFilter === 'all' ? orders : orders.filter((o) => o.status === activeFilter));
	const statusCounts = $derived.by(() => {
		const counts: Record<string, number> = { all: orders.length };
		for (const o of orders) counts[o.status] = (counts[o.status] || 0) + 1;
		return counts;
	});
</script>

{#snippet progressBar(status: string, isUpdating: boolean, onStatusClick: (s: string) => void)}
	{@const isCancelled = status === 'cancelled'}
	{@const currentIdx = PROGRESS_STAGES.indexOf(status)}
	{#if isCancelled}
		<div class="flex items-center justify-between gap-1 px-4 py-3 bg-red-50/50 border-t border-red-100">
			<div class="h-1.5 flex-1 rounded-full bg-red-200 overflow-hidden"><div class="h-full w-full bg-red-500 rounded-full"></div></div>
			<span class="text-[10px] font-bold text-red-500 uppercase tracking-wide">Cancelled</span>
			<button disabled={isUpdating} onclick={() => onStatusClick('pending')} class="ml-2 text-xs font-semibold text-red-500 hover:text-red-700 underline disabled:opacity-50">Reopen</button>
		</div>
	{:else if currentIdx !== -1}
		{@const progress = (currentIdx / (PROGRESS_STAGES.length - 1)) * 100}
		<div class="px-4 py-3 border-t border-gray-100 bg-gray-50/30">
			<div class="flex items-center justify-between mb-1">
				{#each PROGRESS_STAGES as stage, idx}
					{@const stageCfg = STATUS_CONFIG[stage]}
					{@const isComplete = idx <= currentIdx}
					{@const isCurrent = idx === currentIdx}
					{@const isClickable = stage !== status}
					<button disabled={isUpdating || !isClickable} onclick={() => onStatusClick(stage)} class="flex flex-col items-center group disabled:cursor-default" style="flex:1" title={isClickable ? `Move to ${stageCfg.label}` : undefined}>
						<div class={`w-3 h-3 rounded-full transition-all ${isComplete ? stageCfg.dot : 'bg-gray-200'} ${isCurrent ? 'ring-2 ring-offset-1 ring-orange-400 scale-125' : ''} ${isClickable && !isUpdating ? 'group-hover:scale-125 group-hover:ring-2 group-hover:ring-offset-1 group-hover:ring-orange-300 cursor-pointer' : ''}`}></div>
						<span class={`text-[9px] mt-1 font-medium transition-colors ${isCurrent ? 'text-orange-600 font-bold' : isClickable && !isUpdating ? 'text-gray-400 group-hover:text-orange-500' : isComplete ? 'text-gray-500' : 'text-gray-300'}`}>{stageCfg.label}</span>
					</button>
				{/each}
			</div>
			<div class="h-1 bg-gray-200 rounded-full overflow-hidden -mt-4 mx-1">
				<div class="h-full bg-gradient-to-r from-yellow-400 via-orange-400 to-green-500 rounded-full transition-all duration-500" style={`width:${progress}%`}></div>
			</div>
		</div>
	{/if}
{/snippet}

<div class="min-h-screen bg-[#f9f7f5]">
	<header class="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-200 shadow-sm">
		<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center gap-4">
			<button onclick={() => goto('/mystore')} class="p-2 text-gray-500 hover:text-orange-500 hover:bg-gray-100 rounded-lg transition">
				<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" /></svg>
			</button>
			<h1 class="text-2xl font-bold text-gray-900">📋 Orders</h1>
			<div class="ml-auto flex items-center gap-2">
				<span class="text-sm text-gray-400 hidden sm:inline">{orders.length} total</span>
				<button onclick={() => goto('/mystore/orders/search')} class="p-2 text-gray-400 hover:text-orange-500 hover:bg-gray-100 rounded-lg transition" title="Search orders">
					<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
				</button>
				<button onclick={fetchOrders} class="p-2 text-gray-400 hover:text-orange-500 hover:bg-gray-100 rounded-lg transition" title="Refresh">
					<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
				</button>
			</div>
		</div>
		<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-3 flex gap-2 overflow-x-auto scrollbar-hide">
			{#each FILTER_TABS as tab}
				{@const count = statusCounts[tab] || 0}
				{@const isActive = activeFilter === tab}
				<button onclick={() => (activeFilter = tab)} class={`flex-shrink-0 px-3 py-1.5 rounded-full text-sm font-medium transition ${isActive ? 'bg-orange-500 text-white shadow-sm' : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'}`}>
					{tab === 'all' ? 'All' : STATUS_CONFIG[tab]?.label || tab}
					{#if count > 0}<span class={`ml-1.5 text-xs ${isActive ? 'text-white/80' : 'text-gray-400'}`}>{count}</span>{/if}
				</button>
			{/each}
		</div>
	</header>

	<div class="max-w-4xl mx-auto px-4 sm:px-6 py-6">
		{#if error}
			<div class="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm flex items-center justify-between">
				<span>{error}</span>
				<button onclick={() => (error = '')} class="text-red-400 hover:text-red-600">✕</button>
			</div>
		{/if}

		{#if loading}
			<div class="flex flex-col items-center justify-center py-20">
				<div class="animate-spin rounded-full h-10 w-10 border-4 border-orange-500 border-t-transparent mb-4"></div>
				<p class="text-gray-500">Loading orders...</p>
			</div>
		{:else if filteredOrders.length === 0}
			<div class="text-center py-20">
				<div class="text-6xl mb-4">📦</div>
				<p class="text-xl font-semibold text-gray-700">No orders yet</p>
				<p class="text-gray-400 mt-1">{activeFilter === 'all' ? 'Orders from your customers will appear here' : `No ${STATUS_CONFIG[activeFilter]?.label || activeFilter} orders`}</p>
			</div>
		{:else}
			<div class="space-y-3">
				{#each filteredOrders as order}
					{@const orderId = order.id || order._id}
					{@const cfg = STATUS_CONFIG[order.status] || STATUS_CONFIG.pending}
					{@const isExpanded = expandedOrder === orderId}
					{@const isUpdating = updating[orderId]}
					{@const nextPrimary = cfg.next.find((s) => s !== 'cancelled')}
					{@const nextPrimaryCfg = nextPrimary ? PRIMARY_ACTION_LABELS[nextPrimary] : null}
					{@const canAdvance = cfg.next.length > 0 && order.status !== 'cancelled' && order.status !== 'delivered'}
					<div class={`bg-white rounded-2xl border shadow-sm transition-all overflow-hidden ${order.status === 'pending' ? 'border-yellow-300 shadow-yellow-50' : order.status === 'cancelled' ? 'border-red-200 opacity-75' : 'border-gray-200 hover:shadow-md'}`}>
						<div class="px-4 py-3 cursor-pointer" onclick={() => (expandedOrder = isExpanded ? null : orderId)}>
							<div class="flex items-center gap-3">
								<div class={`w-3 h-3 rounded-full ${cfg.dot} flex-shrink-0 animate-pulse`}></div>
								<div class="flex-1 min-w-0">
									<div class="flex items-center gap-2">
										<span class="font-bold text-gray-900">{order.orderNumber || '—'}</span>
										<span class={`text-xs px-2 py-0.5 rounded-full font-medium ${cfg.color}`}>{cfg.label}</span>
									</div>
									<p class="text-sm text-gray-500 mt-0.5 truncate">{order.customerName || 'Customer'} • {order.items?.length || 0} item{(order.items?.length || 0) !== 1 ? 's' : ''}</p>
								</div>
								<div class="text-right flex-shrink-0">
									<p class="font-bold text-gray-900">${order.total?.toFixed(2) || '0.00'}</p>
									<p class="text-xs text-gray-400">{formatTime(order.createdAt)}</p>
									<span class="text-xs text-gray-300 mt-0.5 inline-block">{isExpanded ? '▲' : '▼'}</span>
								</div>
							</div>
							{#if order.status === 'ready' || order.status === 'picked_up'}
								<div class="mt-2" onclick={(e) => e.stopPropagation()}>
									{#if order.driverName}
										<div class="flex items-center gap-2 text-xs bg-blue-50 text-blue-700 rounded-lg px-3 py-1.5">
											<span class="text-base">🚗</span>
											<span class="font-semibold">{order.driverName}</span>
											{#if order.driverDistance != null}<span class="text-blue-300">·</span><span>{order.driverDistance} mi away</span>{/if}
											{#if order.driverEta != null}<span class="text-blue-300">·</span><span>ETA {order.driverEta} min</span>{/if}
										</div>
									{:else}
										<div class="flex items-center gap-2 text-xs bg-gray-50 text-gray-400 rounded-lg px-3 py-1.5">
											<span class="text-base">⏳</span>
											<span>Awaiting driver assignment…</span>
										</div>
									{/if}
								</div>
							{/if}
							{#if canAdvance && nextPrimary}
								<div class="mt-3 flex items-center gap-2" onclick={(e) => e.stopPropagation()}>
									<button disabled={isUpdating} onclick={() => handleStatusUpdate(orderId, nextPrimary)} class="flex-1 py-2.5 rounded-xl text-sm font-bold transition bg-orange-500 text-white hover:bg-orange-600 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed">
										{#if isUpdating}
											<span class="inline-flex items-center gap-1">
												<svg class="animate-spin h-4 w-4" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" fill="none"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path></svg>
												Updating...
											</span>
										{:else}{nextPrimaryCfg?.text || `→ ${STATUS_CONFIG[nextPrimary]?.label}`}{/if}
									</button>
								</div>
							{/if}
						</div>

						{#if isExpanded}
							<div class="border-t border-gray-100 px-4 py-4 bg-gray-50/50">
								{#if order.status === 'ready' || order.status === 'picked_up'}
									<div class="mb-4 bg-white rounded-xl border border-blue-100 overflow-hidden">
										<div class="px-3 pt-3 pb-2 flex items-center gap-2">
											<span class="text-lg">🚗</span>
											<p class="text-xs text-blue-400 font-medium uppercase tracking-wide">Driver</p>
											{#if order._driverDemo}<span class="text-[10px] bg-yellow-100 text-yellow-600 px-1.5 py-0.5 rounded-full font-medium ml-auto">🧪 Demo</span>{/if}
										</div>
										{#if order.driverName}
											<div class="px-3 pb-3">
												<div class="flex items-center gap-3">
													<div class="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-lg">{String(order.driverName).charAt(0).toUpperCase()}</div>
													<div class="flex-1">
														<p class="font-semibold text-gray-900">{order.driverName}</p>
														{#if order.driverPhone}<p class="text-sm text-gray-500">{order.driverPhone}</p>{/if}
													</div>
													{#if order.driverPhone}
														<a href={`tel:${order.driverPhone}`} class="p-2 bg-green-50 text-green-600 rounded-lg hover:bg-green-100 transition" title="Call driver">
															<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
														</a>
													{/if}
												</div>
												{#if order.driverDistance != null || order.driverEta != null}
													<div class="mt-2 flex items-center gap-4 text-sm">
														{#if order.driverDistance != null}<div class="flex items-center gap-1 text-gray-600"><span class="font-medium">{order.driverDistance} mi away</span></div>{/if}
														{#if order.driverEta != null}<div class="flex items-center gap-1 text-gray-600"><span class="font-medium">ETA {order.driverEta} min</span></div>{/if}
													</div>
												{/if}
											</div>
										{:else}
											<div class="px-3 pb-3">
												<div class="flex items-center gap-2 text-gray-400 text-sm">
													<div class="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
														<svg class="w-5 h-5 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
													</div>
													<div><p class="font-medium text-gray-500">No driver assigned yet</p><p class="text-xs text-gray-400">A driver will be assigned shortly</p></div>
												</div>
											</div>
										{/if}
									</div>
								{/if}

								<div class="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
									<div class="bg-white rounded-xl p-3 border border-gray-100">
										<p class="text-xs text-gray-400 font-medium mb-1">CUSTOMER</p>
										<p class="font-semibold text-gray-900">{order.customerName || '—'}</p>
										{#if order.customerPhone}<p class="text-sm text-gray-500">{order.customerPhone}</p>{/if}
									</div>
									<div class="bg-white rounded-xl p-3 border border-gray-100">
										<p class="text-xs text-gray-400 font-medium mb-1">DELIVERY</p>
										{#if order.deliveryAddress}<p class="text-sm text-gray-700">{order.deliveryAddress.street}{order.deliveryAddress.city && `, ${order.deliveryAddress.city}`}</p>{:else}<p class="text-sm text-gray-400">No address</p>{/if}
										{#if order.leaveAtDoor}<span class="text-xs text-orange-600 font-medium">🚪 Leave at door</span>{/if}
									</div>
								</div>

								<div class="bg-white rounded-xl border border-gray-100 mb-4 overflow-hidden">
									<p class="text-xs text-gray-400 font-medium px-3 pt-3 pb-1">ITEMS</p>
									<div class="divide-y divide-gray-50">
										{#each (order.items || []) as item, idx}
											<div class="px-3 py-2 flex justify-between">
												<div>
													<span class="font-medium text-gray-900">{item.quantity}× {item.itemName || item.name}</span>
													{#if item.selectedOptions?.length > 0}<p class="text-xs text-gray-400">{item.selectedOptions.join(' • ')}</p>{/if}
													{#if item.specialInstructions}<p class="text-xs text-orange-500 italic">📝 {item.specialInstructions}</p>{/if}
												</div>
												<span class="text-gray-700 font-medium">${(item.price * item.quantity).toFixed(2)}</span>
											</div>
										{/each}
									</div>
								</div>

								<div class="bg-white rounded-xl border border-gray-100 p-3 mb-4 text-sm space-y-1">
									<div class="flex justify-between text-gray-500"><span>Subtotal</span><span>${order.subtotal?.toFixed(2) || '0.00'}</span></div>
									<div class="flex justify-between text-gray-500"><span>Delivery Fee</span><span>${order.deliveryFee?.toFixed(2) || '0.00'}</span></div>
									<div class="flex justify-between text-gray-500"><span>Service Fee</span><span>${order.serviceFee?.toFixed(2) || '0.00'}</span></div>
									<div class="flex justify-between text-gray-500"><span>Tax</span><span>${order.tax?.toFixed(2) || '0.00'}</span></div>
									{#if order.tip > 0}<div class="flex justify-between text-gray-500"><span>Tip</span><span>${order.tip?.toFixed(2) || '0.00'}</span></div>{/if}
									<div class="flex justify-between font-bold text-gray-900 pt-1 border-t border-gray-100"><span>Total</span><span>${order.total?.toFixed(2) || '0.00'}</span></div>
								</div>

								{#if order.status !== 'cancelled' && order.status !== 'delivered'}
									<button disabled={isUpdating} onclick={() => handleStatusUpdate(orderId, 'cancelled')} class="text-sm font-semibold text-red-500 hover:text-red-700 disabled:opacity-50">❌ Cancel Order</button>
								{/if}
							</div>
						{/if}

						{@render progressBar(order.status, isUpdating, (s) => handleStatusUpdate(orderId, s))}
					</div>
				{/each}
			</div>
		{/if}
	</div>
</div>
