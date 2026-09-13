<script lang="ts">
	import { mockUsers } from '$lib/adminAppData';

	let search = $state('');
	let selectedUser = $state<any>(null);
	let sortKey = $state('name');
	let sortAsc = $state(true);

	function formatDate(d: string) {
		if (!d) return '—';
		const date = new Date(d);
		return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
	}

	function formatDateTime(d: string) {
		if (!d) return '—';
		const date = new Date(d);
		return date.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
	}

	function daysSince(d: string) {
		if (!d) return null;
		const diff = (Date.now() - new Date(d).getTime()) / 86400000;
		return Math.floor(diff);
	}

	function handleSort(key: string) {
		if (sortKey === key) {
			sortAsc = !sortAsc;
			return;
		}
		sortKey = key;
		sortAsc = true;
	}

	const filtered = $derived.by(() => {
		let list = [...mockUsers];
		if (search) {
			const q = search.toLowerCase();
			list = list.filter((u) => u.name.toLowerCase().includes(q) || u.phone.includes(q) || u.campus.toLowerCase().includes(q) || u.id.toLowerCase().includes(q));
		}
		list.sort((a, b) => {
			let va = (a as any)[sortKey];
			let vb = (b as any)[sortKey];
			if (typeof va === 'string') va = va.toLowerCase();
			if (typeof vb === 'string') vb = vb.toLowerCase();
			if (va == null) va = '';
			if (vb == null) vb = '';
			if (va < vb) return sortAsc ? -1 : 1;
			if (va > vb) return sortAsc ? 1 : -1;
			return 0;
		});
		return list;
	});

	function statusColor(status: string) {
		const colors: Record<string, string> = {
			'Active Customer': 'bg-emerald-100 text-emerald-700',
			'Churned': 'bg-gray-100 text-gray-500',
			'Lead': 'bg-blue-100 text-blue-700'
		};
		return colors[status] || 'bg-gray-100 text-gray-600';
	}

	function sortIcon(k: string) {
		if (sortKey !== k) return '↕';
		return sortAsc ? '↑' : '↓';
	}

	function avgTimeColor(min: number) {
		if (min > 6) return 'text-red-600';
		if (min > 4) return 'text-yellow-600';
		return 'text-green-600';
	}
</script>

<div class="min-h-screen bg-gray-50">
	<header class="bg-white border-b border-gray-200">
		<div class="max-w-7xl mx-auto px-6 py-5 flex items-center justify-between">
			<div>
				<a href="/admin/" class="text-orange-500 hover:text-orange-600 hover:underline text-sm">← Back to Admin Dashboard</a>
				<h1 class="text-2xl font-bold text-gray-900 mt-1">App Data</h1>
				<p class="text-sm text-gray-500">User analytics, referral tracking, and campus logistics</p>
			</div>
			<div class="flex items-center gap-3">
				<a href="/admin/rewards" class="text-sm font-medium text-orange-600 hover:text-orange-700 hover:underline">Open Rewards →</a>
				<span class="bg-yellow-200 text-yellow-800 text-[10px] font-bold px-2.5 py-1 rounded-full">Mock data</span>
			</div>
		</div>
	</header>

	<main class="max-w-7xl mx-auto px-6 py-6">
		<div class="mb-4">
			<input type="text" placeholder="Search by name, phone, campus, or user ID..." value={search} oninput={(e) => (search = (e.currentTarget as HTMLInputElement).value)} class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" />
		</div>

		<div class="flex gap-6">
			<div class={`flex-1 bg-white rounded-xl border border-gray-200 overflow-x-auto ${selectedUser ? 'hidden lg:block' : ''}`}>
				<table class="w-full text-sm">
					<thead class="bg-gray-50 border-b border-gray-100">
						<tr>
							<th class="px-3 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider cursor-pointer hover:text-orange-600 whitespace-nowrap" onclick={() => handleSort('name')}>Name {sortIcon('name')}</th>
							<th class="px-3 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider cursor-pointer hover:text-orange-600 whitespace-nowrap" onclick={() => handleSort('phone')}>Phone {sortIcon('phone')}</th>
							<th class="px-3 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider cursor-pointer hover:text-orange-600 whitespace-nowrap" onclick={() => handleSort('campus')}>Campus {sortIcon('campus')}</th>
							<th class="px-3 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider cursor-pointer hover:text-orange-600 whitespace-nowrap" onclick={() => handleSort('totalOrders')}>Orders {sortIcon('totalOrders')}</th>
							<th class="px-3 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider cursor-pointer hover:text-orange-600 whitespace-nowrap" onclick={() => handleSort('successfulConversions')}>Referrals {sortIcon('successfulConversions')}</th>
							<th class="px-3 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider cursor-pointer hover:text-orange-600 whitespace-nowrap" onclick={() => handleSort('conversionStatus')}>Status {sortIcon('conversionStatus')}</th>
							<th class="px-3 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Detail</th>
						</tr>
					</thead>
					<tbody class="divide-y divide-gray-50">
						{#each filtered as u}
							<tr onclick={() => (selectedUser = u)} class={`hover:bg-orange-50 cursor-pointer transition ${selectedUser?.id === u.id ? 'bg-orange-50' : ''}`}>
								<td class="px-3 py-3"><p class="font-semibold text-gray-900">{u.name}</p><p class="text-xs text-gray-400">{u.id}</p></td>
								<td class="px-3 py-3 text-gray-600">{u.phone}</td>
								<td class="px-3 py-3 text-gray-600">{u.campus}</td>
								<td class="px-3 py-3 font-semibold text-gray-900">{u.totalOrders}</td>
								<td class="px-3 py-3 font-semibold text-gray-900">{u.successfulConversions}</td>
								<td class="px-3 py-3"><span class={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColor(u.conversionStatus)}`}>{u.conversionStatus}</span></td>
								<td class="px-3 py-3 text-right"><span class="text-orange-500 text-xs font-medium">View →</span></td>
							</tr>
						{/each}
					</tbody>
				</table>
				{#if filtered.length === 0}<div class="text-center py-12 text-gray-400">No users found.</div>{/if}
			</div>

			{#if selectedUser}
				<div class="w-full lg:w-[420px] bg-white rounded-xl border border-gray-200 p-5 space-y-5 overflow-y-auto" style="max-height:calc(100vh - 200px)">
					<div class="flex items-center justify-between">
						<h2 class="font-bold text-gray-900">{selectedUser.name}</h2>
						<button onclick={() => (selectedUser = null)} class="text-gray-400 hover:text-gray-600 text-sm lg:hidden">✕ Close</button>
					</div>

					<div class="bg-gray-50 rounded-lg p-3 space-y-1.5">
						<p class="text-xs text-gray-400">ID: <span class="font-mono text-gray-700">{selectedUser.id}</span></p>
						<p class="text-xs text-gray-400">Phone: <span class="font-medium text-gray-700">{selectedUser.phone}</span></p>
						<p class="text-xs text-gray-400">Email: <span class="font-medium text-gray-700">{selectedUser.email}</span></p>
						<p class="text-xs text-gray-400">Campus: <span class="font-medium text-gray-700">{selectedUser.campus}</span></p>
						<p class="text-xs text-gray-400">Account Created: <span class="font-medium text-gray-700">{formatDate(selectedUser.accountCreated)}</span></p>
						<p class="text-xs text-gray-400">
							Last Active: <span class="font-medium text-gray-700">{formatDateTime(selectedUser.lastActive)}</span>
						</p>
						{#if selectedUser.lastActive}
							{@const ds = daysSince(selectedUser.lastActive)}
							{#if ds !== null}
								<p class="text-xs text-gray-400"><span class={`ml-1.5 ${ds > 7 ? 'text-red-500' : 'text-green-500'}`}>({ds}d ago)</span></p>
							{/if}
						{/if}
					</div>

					<div>
						<h3 class="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Device</h3>
						<div class="bg-gray-50 rounded-lg p-3 space-y-1.5">
							<p class="text-xs text-gray-400">Device ID: <code class="text-gray-700 bg-gray-100 px-1 rounded">{selectedUser.deviceId}</code></p>
							<p class="text-xs text-gray-400">OS: <span class="font-medium text-gray-700">{selectedUser.os}</span></p>
							<p class="text-xs text-gray-400">App Version: <span class="font-medium text-gray-700">{selectedUser.appVersion}</span></p>
							<p class="text-xs text-gray-400">Location: <span class="font-medium text-gray-700">{selectedUser.lat.toFixed(4)}, {selectedUser.lng.toFixed(4)}</span></p>
						</div>
					</div>

					<div>
						<h3 class="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Referral & Growth</h3>
						<div class="bg-gray-50 rounded-lg p-3 space-y-1.5">
							<p class="text-xs text-gray-400">Code: <code class="font-mono font-bold text-orange-600">{selectedUser.referralCode}</code></p>
							<p class="text-xs text-gray-400">Shares Triggered: <span class="font-medium text-gray-700">{selectedUser.sharesTriggered}</span></p>
							<p class="text-xs text-gray-400">Successful Conversions: <span class="font-medium text-green-600">{selectedUser.successfulConversions}</span></p>
							<p class="text-xs text-gray-400">Promo Credits Earned: <span class="font-medium text-gray-700">${selectedUser.promoCreditsEarned.toFixed(2)}</span></p>
							<p class="text-xs text-gray-400">Wallet Balance: <span class="font-medium text-emerald-600">${selectedUser.walletBalance.toFixed(2)}</span></p>
							<p class="text-xs text-gray-400">
								Referred By: {#if selectedUser.referredBy}
									<button onclick={() => (selectedUser = mockUsers.find((u) => u.id === selectedUser.referredBy.id))} class="font-medium text-orange-600 hover:underline">{selectedUser.referredBy.name}</button>
								{:else}<span class="text-gray-400">None</span>{/if}
							</p>
						</div>
						{#if selectedUser.referralHistory.length > 0}
							<div class="mt-2 space-y-1">
								{#each selectedUser.referralHistory as r, i}
									<div class="flex items-center justify-between bg-white rounded border border-gray-100 px-3 py-2 text-xs">
										<div><span class="font-mono text-gray-600">{r.code}</span><span class="text-gray-400 mx-1">via</span><span class="text-gray-600">{r.sharedVia}</span><span class="text-gray-400 ml-1">{formatDate(r.timestamp)}</span></div>
										<span class={`font-medium ${r.converted ? 'text-green-600' : 'text-gray-400'}`}>{r.converted ? `✓ ${r.newUser}` : '✗ No conversion'}</span>
									</div>
								{/each}
							</div>
						{/if}
					</div>

					<div>
						<h3 class="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Transactions</h3>
						<div class="bg-gray-50 rounded-lg p-3 space-y-1.5">
							<div class="flex justify-between text-xs"><span class="text-gray-400">Status</span><span><span class={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColor(selectedUser.conversionStatus)}`}>{selectedUser.conversionStatus}</span></span></div>
							<div class="flex justify-between text-xs"><span class="text-gray-400">Total Orders</span><span class="font-semibold text-gray-900">{selectedUser.totalOrders}</span></div>
							<div class="flex justify-between text-xs"><span class="text-gray-400">Avg Order Value</span><span class="font-semibold text-gray-900">${selectedUser.aov.toFixed(2)}</span></div>
							<div class="flex justify-between text-xs"><span class="text-gray-400">Lifetime Value</span><span class="font-semibold text-emerald-600">${selectedUser.ltv.toFixed(2)}</span></div>
							<div class="flex justify-between text-xs"><span class="text-gray-400">Last Order</span><span class="font-medium text-gray-700">{formatDate(selectedUser.lastOrderDate)}</span></div>
						</div>
						{#if selectedUser.orderHistory.length > 0}
							<div class="mt-2 space-y-1">
								{#each selectedUser.orderHistory as o, i}
									<div class="bg-white rounded border border-gray-100 px-3 py-2 text-xs">
										<div class="flex items-center justify-between"><span class="font-medium text-gray-700">{o.id}</span><span class="text-gray-400">{formatDate(o.date)}</span></div>
										<p class="text-gray-600 mt-0.5">{o.items}</p>
										<div class="flex items-center justify-between mt-1 text-gray-400"><span>{o.dropZone}</span><span><span class="font-semibold text-gray-700">${o.total.toFixed(2)}</span> · {'★'.repeat(o.driverRating)}{'☆'.repeat(5 - o.driverRating)}</span></div>
									</div>
								{/each}
							</div>
						{/if}
					</div>

					<div>
						<h3 class="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Campus Logistics</h3>
						<div class="bg-gray-50 rounded-lg p-3 space-y-1.5">
							<p class="text-xs text-gray-400">Preferred Drop Zone: <span class="font-medium text-gray-700">{selectedUser.preferredDropZone || 'N/A'}</span></p>
							<p class="text-xs text-gray-400">
								Avg Time-to-Meet: {#if selectedUser.avgTimeToMeet !== null}
									<span class={`font-medium ${avgTimeColor(selectedUser.avgTimeToMeet)}`}>{selectedUser.avgTimeToMeet} min</span>
								{:else}<span class="text-gray-400">N/A</span>{/if}
							</p>
							<p class="text-xs text-gray-400">Driver Rating Given: <span class="font-medium text-gray-700">{selectedUser.driverRatingGiven ? `${selectedUser.driverRatingGiven} ★` : 'N/A'}</span></p>
							{#if selectedUser.driverNotes.length > 0}
								<div class="mt-1"><p class="text-xs text-gray-400 mb-1">Driver Notes:</p>{#each selectedUser.driverNotes as n, i}<p class="text-xs text-red-500">⚠ {n}</p>{/each}</div>
							{/if}
						</div>
					</div>
				</div>
			{/if}
		</div>

		<footer class="text-center text-xs text-gray-400 py-6 border-t border-gray-100 mt-8">UDO Admin · App Data</footer>
	</main>
</div>
