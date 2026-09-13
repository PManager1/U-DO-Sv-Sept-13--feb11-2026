<script lang="ts">
	import { onMount } from 'svelte';
	import API_BASE from '$lib/api';

	let orders = $state<any[]>([]);
	let loading = $state(true);
	let error = $state<string | null>(null);
	let statusFilter = $state('');
	let typeFilter = $state('');
	let expandedId = $state<string | null>(null);
	let sendTextMsg = $state(false);
	let prefsLoaded = false;
	let savingPref = $state(false);

	async function toggleSendText() {
		sendTextMsg = !sendTextMsg;
		savingPref = true;
		try {
			const res = await fetch(API_BASE + 'admin/personalize', {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ adminOrders: { sendTextMsg } })
			});
			if (!res.ok) throw new Error('Failed to save preference');
		} catch (e) {
			console.error('Failed to save send text msg preference:', e);
			sendTextMsg = !sendTextMsg; // revert on failure
		} finally {
			savingPref = false;
		}
	}

	function formatTime(iso: string) {
		if (!iso) return '—';
		try {
			const d = new Date(iso);
			return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
		} catch {
			return iso;
		}
	}

	onMount(() => {
		fetchOrders();
		fetchPrefs();
	});

	async function fetchPrefs() {
		try {
			const res = await fetch(API_BASE + 'admin/personalize');
			if (res.ok) {
				const data = await res.json();
				if (data?.adminOrders) sendTextMsg = !!data.adminOrders.sendTextMsg;
			}
		} catch (e) {
			console.error('Failed to load admin orders prefs:', e);
		} finally {
			prefsLoaded = true;
		}
	}

	async function fetchOrders() {
		try {
			loading = true;
			error = null;
			const res = await fetch(API_BASE + 'admin/brand-orders');
			const data = await res.json();
			orders = Array.isArray(data) ? data : [];
		} catch (err) {
			console.error('Failed to fetch orders:', err);
			error = (err as Error).message;
		} finally {
			loading = false;
		}
	}

	function toggleExpand(id: string) {
		expandedId = expandedId === id ? null : id;
	}

	async function deleteOrder(id: string) {
		if (!id) return;
		if (!confirm(`Delete order ${id}? This will remove it permanently.`)) return;
		try {
			const res = await fetch(API_BASE + `admin/brand-orders/${id}`, { method: 'DELETE' });
			if (!res.ok) throw new Error(await res.text());
			orders = orders.filter((o) => (o.id || o._id) !== id);
		} catch (err) {
			alert('Failed to delete order: ' + (err as Error).message);
		}
	}

	function statusColor(status: string) {
		const colors: Record<string, string> = {
			pending: 'bg-yellow-100 text-yellow-800',
			confirmed: 'bg-blue-100 text-blue-800',
			preparing: 'bg-orange-100 text-orange-800',
			ready: 'bg-green-100 text-green-800',
			out_for_delivery: 'bg-cyan-100 text-cyan-800',
			delivered: 'bg-green-100 text-green-800',
			cancelled: 'bg-red-100 text-red-800'
		};
		return colors[status] || 'bg-gray-100 text-gray-800';
	}

	function typeIcon(type: string) {
		switch (type) {
			case 'grocery': return '🛒';
			case 'restaurant': return '🍽️';
			case 'cafe': return '☕';
			case 'pharmacy': return '💊';
			case 'convenience': return '🏪';
			case 'retail': return '🏬';
			default: return '📦';
		}
	}

	const filteredOrders = $derived(
		orders.filter((o) => {
			if (statusFilter && o.status !== statusFilter) return false;
			if (typeFilter && o.brandType !== typeFilter) return false;
			return true;
		})
	);
	const statuses = $derived([...new Set(orders.map((o) => o.status))]);
	const types = $derived([...new Set(orders.map((o) => o.brandType))]);
</script>

<div class="min-h-screen bg-gray-50">
	<header class="bg-white border-b border-gray-200">
		<div class="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
			<div class="flex items-center gap-4">
				<a href="/admin/" class="text-gray-400 hover:text-gray-600 transition">
					<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" /></svg>
				</a>
				<div>
					<h1 class="text-xl font-bold text-gray-900">Brand Orders</h1>
					<p class="text-sm text-gray-500">All grocery, restaurant & pharmacy brand orders</p>
				</div>
			</div>
			<label class="flex items-center gap-2 text-sm text-gray-600 cursor-pointer select-none mr-2" title="Text all drivers when a new order arrives">
				<span>Send text msg</span>
				<button type="button" role="switch" aria-checked={sendTextMsg} aria-label="Send text msg" onclick={toggleSendText} disabled={savingPref}
					class={`relative inline-flex items-center h-5 w-9 rounded-full transition-colors ${sendTextMsg ? 'bg-orange-500' : 'bg-gray-300'} ${savingPref ? 'opacity-50 cursor-wait' : 'cursor-pointer'}`}>
					<span class={`inline-block w-3.5 h-3.5 transform bg-white rounded-full transition-transform ${sendTextMsg ? 'translate-x-4.5' : 'translate-x-0.5'}`}></span>
				</button>
			</label>
			<button onclick={fetchOrders} class="text-sm text-orange-600 hover:text-orange-700 font-medium flex items-center gap-1">
				<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
				Refresh
			</button>
		</div>
	</header>

	<main class="max-w-6xl mx-auto px-6 py-6">
		<div class="flex flex-wrap gap-3 mb-6">
			<select value={statusFilter} onchange={(e) => (statusFilter = (e.currentTarget as HTMLSelectElement).value)} class="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-orange-400">
				<option value="">All Statuses</option>
				{#each statuses as s}<option value={s}>{s.replace(/_/g, ' ')}</option>{/each}
			</select>
			<select value={typeFilter} onchange={(e) => (typeFilter = (e.currentTarget as HTMLSelectElement).value)} class="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-orange-400">
				<option value="">All Types</option>
				{#each types as t}<option value={t}>{t}</option>{/each}
			</select>
			<span class="text-sm text-gray-400 self-center ml-auto">{filteredOrders.length} order{filteredOrders.length !== 1 ? 's' : ''}</span>
		</div>

		{#if loading}
			<div class="flex items-center justify-center py-20">
				<svg class="animate-spin w-8 h-8 text-orange-500" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
			</div>
		{/if}

		{#if error && !loading}
			<div class="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 text-sm">{error}</div>
		{/if}

		{#if !loading && !error && filteredOrders.length === 0}
			<div class="text-center py-20 text-gray-400">
				<svg class="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
				<p class="text-lg font-medium">No orders found</p>
				<p class="text-sm mt-1">Try adjusting your filters.</p>
			</div>
		{/if}

		{#if !loading && !error && filteredOrders.length > 0}
			<div class="space-y-3">
				{#each filteredOrders as order}
					{@const oid = order.id || order._id}
					{@const isExpanded = expandedId === oid}
					{@const addr = order.deliveryAddress || {}}
					<div>
						<div onclick={() => toggleExpand(oid)} class={`bg-white border rounded-xl p-4 transition cursor-pointer ${isExpanded ? 'border-orange-500 shadow-md' : 'border-gray-200 hover:border-orange-300'}`}>
						<div class="flex items-start justify-between">
							<div class="flex items-start gap-3 min-w-0 flex-1">
								{#if order.brandLogo}
									<img src={order.brandLogo} alt={order.brandName} class="w-10 h-10 rounded-full object-cover bg-gray-100 flex-shrink-0" onerror={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} />
								{:else}
									<div class="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0 text-lg">{typeIcon(order.brandType)}</div>
								{/if}
								<div class="min-w-0">
									<div class="flex items-center gap-2 flex-wrap">
										<h3 class="font-semibold text-gray-900 text-sm">{order.brandName || 'Unknown Brand'}</h3>
										<span class="text-xs text-gray-400">{typeIcon(order.brandType)} {order.brandType}</span>
									</div>
									<div class="flex items-center gap-3 mt-1 text-xs text-gray-500">
										<span>#{order.id ? order.id.slice(-8) : '—'}</span>
										<span>{order.items?.length || 0} item{(order.items?.length || 0) !== 1 ? 's' : ''}</span>
										<span>${(order.total || 0).toFixed(2)}</span>
										<span class="uppercase text-[10px]">{order.orderType || '—'}</span>
									</div>
									<div class="mt-1 text-xs text-gray-400">{formatTime(order.createdAt)}</div>
								</div>
							</div>
							<div class="flex items-center gap-2 flex-shrink-0">
								<button onclick={(e) => { e.stopPropagation(); deleteOrder(oid); }} aria-label="Delete order" title="Delete order" class="w-7 h-7 rounded-full flex items-center justify-center text-red-500 hover:bg-red-50 hover:text-red-600 transition">
									<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
								</button>
								<span class={`text-[10px] font-bold px-2.5 py-1 rounded-full ${statusColor(order.status)}`}>{order.status?.replace(/_/g, ' ').toUpperCase() || 'UNKNOWN'}</span>
								<svg class={`w-4 h-4 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" /></svg>
							</div>
						</div>

						<div class={`overflow-hidden transition-all duration-300 ${isExpanded ? 'max-h-[3000px] opacity-100' : 'max-h-0 opacity-0'}`}>
							{#if isExpanded}
								<div class="border-t border-gray-100 mt-3 pt-3 space-y-4">
									<div>
										<h4 class="text-[10px] uppercase tracking-wider text-gray-400 font-bold mb-1.5">Customer</h4>
										<div class="bg-gray-50 rounded-lg p-3">
											<div class="flex items-start gap-2 py-1"><span class="text-xs text-gray-500 w-28 flex-shrink-0">Name</span><span class="text-xs text-gray-900 flex-1">{order.customerName || '—'}</span></div>
											<div class="flex items-start gap-2 py-1"><span class="text-xs text-gray-500 w-28 flex-shrink-0">Phone</span><span class="text-xs text-gray-900 flex-1">{order.customerPhone || '—'}</span></div>
											<div class="flex items-start gap-2 py-1"><span class="text-xs text-gray-500 w-28 flex-shrink-0">Address</span><span class="text-xs text-gray-900 flex-1">{addr.address || [addr.street, addr.city, addr.state, addr.zip].filter(Boolean).join(', ') || '—'}</span></div>
											<div class="flex items-start gap-2 py-1"><span class="text-xs text-gray-500 w-28 flex-shrink-0">ID</span><span class="text-xs text-gray-900 flex-1">{order.customerId || '—'}</span></div>
										</div>
									</div>
									<div>
										<h4 class="text-[10px] uppercase tracking-wider text-gray-400 font-bold mb-1.5">Store</h4>
										<div class="bg-gray-50 rounded-lg p-3">
											<div class="flex items-start gap-2 py-1"><span class="text-xs text-gray-500 w-28 flex-shrink-0">Name</span><span class="text-xs text-gray-900 flex-1">{order.storeName || order.brandName || '—'}</span></div>
											<div class="flex items-start gap-2 py-1"><span class="text-xs text-gray-500 w-28 flex-shrink-0">Address</span><span class="text-xs text-gray-900 flex-1">{order.storeAddress || '—'}</span></div>
											<div class="flex items-start gap-2 py-1"><span class="text-xs text-gray-500 w-28 flex-shrink-0">Type</span><span class="text-xs text-gray-900 flex-1">{order.brandType || '—'}</span></div>
											{#if order.locationId}<div class="flex items-start gap-2 py-1"><span class="text-xs text-gray-500 w-28 flex-shrink-0">Location ID</span><span class="text-xs text-gray-900 flex-1">{order.locationId}</span></div>{/if}
										</div>
									</div>
									{#if addr.street || order.leaveAtDoor}
										<div>
											<h4 class="text-[10px] uppercase tracking-wider text-gray-400 font-bold mb-1.5">Delivery</h4>
											<div class="bg-gray-50 rounded-lg p-3">
												{#if addr.street}
													<div class="flex items-start gap-2 py-1"><span class="text-xs text-gray-500 w-28 flex-shrink-0">Address</span><span class="text-xs text-gray-900 flex-1">{addr.street || '—'}</span></div>
													<div class="flex items-start gap-2 py-1"><span class="text-xs text-gray-500 w-28 flex-shrink-0">City</span><span class="text-xs text-gray-900 flex-1">{addr.city || '—'}</span></div>
													<div class="flex items-start gap-2 py-1"><span class="text-xs text-gray-500 w-28 flex-shrink-0">State</span><span class="text-xs text-gray-900 flex-1">{addr.state || '—'}</span></div>
													<div class="flex items-start gap-2 py-1"><span class="text-xs text-gray-500 w-28 flex-shrink-0">Zip</span><span class="text-xs text-gray-900 flex-1">{addr.zip || '—'}</span></div>
												{/if}
												{#if addr.instructions}<div class="flex items-start gap-2 py-1"><span class="text-xs text-gray-500 w-28 flex-shrink-0">Instructions</span><span class="text-xs text-gray-900 flex-1">{addr.instructions}</span></div>{/if}
												{#if order.leaveAtDoor}<div class="flex items-start gap-2 py-1"><span class="text-xs text-gray-500 w-28 flex-shrink-0">Leave at door</span><span class="text-xs text-gray-900 flex-1">Yes</span></div>{/if}
											</div>
										</div>
									{/if}
									<div>
										<h4 class="text-[10px] uppercase tracking-wider text-gray-400 font-bold mb-1.5">Items ({order.items?.length || 0})</h4>
										<div class="bg-gray-50 rounded-lg overflow-hidden">
											<table class="w-full text-xs">
												<thead><tr class="bg-gray-100 text-gray-500 uppercase text-[10px]"><th class="text-left px-3 py-1.5 font-semibold">Item</th><th class="text-center px-2 py-1.5 font-semibold">Qty</th><th class="text-right px-3 py-1.5 font-semibold">Price</th></tr></thead>
												<tbody>
													{#each (order.items || []) as item, ii}
														{@const name = item.nameSnapshot || item.itemName || item.name || 'Item'}
														{@const qty = item.quantity || 1}
														{@const price = item.pricePaid != null ? item.pricePaid : (item.totalPrice != null ? item.totalPrice : (item.price != null ? item.price : 0))}
														{@const img = item.image || item.imageURL || (Array.isArray(item.images) && item.images[0]) || ''}
														{@const imgs = (Array.isArray(item.images) && item.images.length ? item.images : img ? [img] : []).filter(Boolean).slice(0, 4)}
														{@const replacements = Array.isArray(item.replacements) ? item.replacements : []}
														<tr class="border-t border-gray-100">
															<td class="px-3 py-2">
																<div class="flex items-center gap-2">
																	{#if imgs.length}
																		<div class="flex -space-x-2 flex-shrink-0">
																			{#each imgs as simg, si}
																				<img src={simg} alt={name} class="w-10 h-10 rounded-lg object-cover bg-gray-100 ring-2 ring-white" style={si > 0 ? 'z-index:10' : ''} onerror={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} />
																			{/each}
																		</div>
																	{/if}
																	<div class="min-w-0">
																		<div class="font-medium text-gray-900">{name}</div>
																		{#if item.note}<div class="text-gray-400 italic mt-0.5">📝 {item.note}</div>{/if}
																		{#if item.specialNotes || item.specialInstructions}<div class="text-gray-400 italic mt-0.5">{item.specialNotes || item.specialInstructions}</div>{/if}
																	{#if replacements.length > 0}
																		<div class="text-gray-400 mt-0.5">
																			<span class="font-medium text-gray-500">Replacements:</span>
																			{#each replacements as r}<span class="mr-2">{r.name || r.id}</span>{/each}
																		</div>
																	{/if}
																	{#if item.modifiers?.length > 0}
																		<div class="text-gray-400 mt-0.5">{#each item.modifiers as m}<span class="mr-2">+{m.name}{m.price ? ` ($${m.price.toFixed(2)})` : ''}</span>{/each}</div>
																	{/if}
																	{#if item.selectedOptions?.length > 0}<div class="text-gray-400 mt-0.5">{item.selectedOptions.join(', ')}</div>{/if}
																	{#if item.aisle}<div class="text-gray-400 mt-0.5">Aisle: {item.aisle}</div>{/if}
																	</div>
																</div>
															</td>
															<td class="text-center px-2 py-2 text-gray-600">{qty}</td>
															<td class="text-right px-3 py-2 text-gray-900 font-medium">${(price).toFixed(2)}</td>
														</tr>
													{/each}
												</tbody>
											</table>
										</div>
									</div>
									<div>
										<h4 class="text-[10px] uppercase tracking-wider text-gray-400 font-bold mb-1.5">Pricing</h4>
										<div class="bg-gray-50 rounded-lg p-3">
											<div class="flex items-start gap-2 py-1"><span class="text-xs text-gray-500 w-28 flex-shrink-0">Subtotal</span><span class="text-xs text-gray-900 flex-1">${(order.subtotal || 0).toFixed(2)}</span></div>
											<div class="flex items-start gap-2 py-1"><span class="text-xs text-gray-500 w-28 flex-shrink-0">Delivery Fee</span><span class="text-xs text-gray-900 flex-1">${(order.deliveryFee || 0).toFixed(2)}</span></div>
											<div class="flex items-start gap-2 py-1"><span class="text-xs text-gray-500 w-28 flex-shrink-0">Service Fee</span><span class="text-xs text-gray-900 flex-1">${(order.serviceFee || 0).toFixed(2)}</span></div>
											<div class="flex items-start gap-2 py-1"><span class="text-xs text-gray-500 w-28 flex-shrink-0">Tax</span><span class="text-xs text-gray-900 flex-1">${(order.tax || 0).toFixed(2)}</span></div>
											{#if order.tip > 0}<div class="flex items-start gap-2 py-1"><span class="text-xs text-gray-500 w-28 flex-shrink-0">Tip</span><span class="text-xs text-gray-900 flex-1">${(order.tip || 0).toFixed(2)}</span></div>{/if}
											<div class="border-t border-gray-200 mt-1 pt-1 flex justify-between text-xs font-bold text-gray-900"><span>Total</span><span>${(order.total || 0).toFixed(2)}</span></div>
										</div>
									</div>
									<div>
										<h4 class="text-[10px] uppercase tracking-wider text-gray-400 font-bold mb-1.5">Order Info</h4>
										<div class="bg-gray-50 rounded-lg p-3">
											<div class="flex items-start gap-2 py-1"><span class="text-xs text-gray-500 w-28 flex-shrink-0">Order ID</span><span class="text-xs text-gray-900 flex-1">{order.id || '—'}</span></div>
											{#if order.orderNumber}<div class="flex items-start gap-2 py-1"><span class="text-xs text-gray-500 w-28 flex-shrink-0">Order #</span><span class="text-xs text-gray-900 flex-1">{order.orderNumber}</span></div>{/if}
											<div class="flex items-start gap-2 py-1"><span class="text-xs text-gray-500 w-28 flex-shrink-0">Type</span><span class="text-xs text-gray-900 flex-1">{order.orderType || '—'}</span></div>
											<div class="flex items-start gap-2 py-1"><span class="text-xs text-gray-500 w-28 flex-shrink-0">Source</span><span class="text-xs text-gray-900 flex-1">{order.source || '—'}</span></div>
											<div class="flex items-start gap-2 py-1"><span class="text-xs text-gray-500 w-28 flex-shrink-0">Status</span><span class="text-xs text-gray-900 flex-1">{order.status || '—'}</span></div>
											<div class="flex items-start gap-2 py-1"><span class="text-xs text-gray-500 w-28 flex-shrink-0">Placed at</span><span class="text-xs text-gray-900 flex-1">{formatTime(order.createdAt)}</span></div>
										</div>
									</div>
								</div>
							{/if}
						</div>
					</div>
					</div>
				{/each}
			</div>
		{/if}
	</main>

	<footer class="text-center text-xs text-gray-400 py-6 border-t border-gray-100 max-w-6xl mx-auto">UDO Admin · Brand Orders</footer>
</div>
