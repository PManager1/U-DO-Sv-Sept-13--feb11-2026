<script lang="ts">
	import { marketData, boroughs } from '$lib/adminRewardsData';

	let selectedCities = $state(new Set(boroughs.map((b) => b.key)));
	let search = $state('');
	let sortKey = $state('rank');
	let sortAsc = $state(true);
	let highlightedId = $state<string | null>(null);
	let cityDropdownOpen = $state(false);

	function toggleCity(key: string) {
		const next = new Set(selectedCities);
		if (next.has(key)) next.delete(key);
		else next.add(key);
		selectedCities = next;
	}

	const selectedLabels = $derived(boroughs.filter((b) => selectedCities.has(b.key)).map((b) => b.label));
	const displayLabel = $derived(
		selectedLabels.length === boroughs.length
			? 'All cities'
			: selectedLabels.length === 1
				? selectedLabels[0]
				: `${selectedLabels.length} cities selected`
	);

	const markets = $derived(boroughs.filter((b) => selectedCities.has(b.key)).map((b) => marketData[b.key]));

	const combinedProfitPool = $derived(markets.reduce((s, m) => s + m.profitPool, 0));
	const combinedProfitTarget = $derived(markets.reduce((s, m) => s + m.profitTarget, 0));
	const combinedOrderVelocity = $derived(markets.reduce((s, m) => s + m.orderVelocity, 0));
	const combinedOrderTarget = $derived(markets.reduce((s, m) => s + m.orderTarget, 0));
	const combinedDriversOnline = $derived(markets.reduce((s, m) => s + m.driversOnline, 0));
	const combinedStoresActive = $derived(markets.reduce((s, m) => s + m.storesActive, 0));

	const drivers = $derived(markets.flatMap((m) => m.drivers));

	function cityForDriver(name: string) {
		for (const b of boroughs) {
			if (marketData[b.key].drivers.some((d: any) => d.name === name)) return b.label;
		}
		return '';
	}

	function handleSort(key: string) {
		if (sortKey === key) {
			sortAsc = !sortAsc;
			return;
		}
		sortKey = key;
		sortAsc = true;
	}

	const sortedDrivers = $derived.by(() => {
		const list = [...drivers];
		list.sort((a, b) => {
			let va = a[sortKey];
			let vb = b[sortKey];
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

	function handleSearch() {
		const q = search.trim().toLowerCase();
		if (!q) {
			highlightedId = null;
			return;
		}
		const found = drivers.find((d: any) => d.id.toLowerCase().includes(q) || d.code.toLowerCase().includes(q));
		highlightedId = found ? found.id : null;
	}

	function sortIcon(k: string) {
		if (sortKey !== k) return '↕';
		return sortAsc ? '↑' : '↓';
	}

	const profitPct = $derived(combinedProfitTarget > 0 ? Math.round((combinedProfitPool / combinedProfitTarget) * 100) : 0);
	const orderPct = $derived(combinedOrderTarget > 0 ? Math.round((combinedOrderVelocity / combinedOrderTarget) * 100) : 0);
</script>

<div class="min-h-screen bg-gray-50">
	<header class="bg-white border-b border-gray-200">
		<div class="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
			<div class="flex items-center gap-4">
				<a href="/admin/" class="text-gray-400 hover:text-gray-600 transition">
					<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" /></svg>
				</a>
				<div>
					<h1 class="text-xl font-bold text-gray-900">Market Control Center</h1>
					<p class="text-sm text-gray-500">NYC Boroughs — Tournament & Driver Oversight</p>
				</div>
				<span class="bg-yellow-200 text-yellow-800 text-[10px] font-bold px-2.5 py-1 rounded-full">Mock data</span>
			</div>
		</div>
	</header>

	<main class="max-w-7xl mx-auto px-6 py-6 space-y-6">
		<div class="flex items-start gap-3">
			<label class="text-sm font-semibold text-gray-600 mt-2">Select city:</label>
			<div class="relative">
				<button onclick={() => (cityDropdownOpen = !cityDropdownOpen)} class="border border-gray-200 rounded-lg px-4 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-yellow-400 font-medium min-w-[200px] text-left flex items-center justify-between">
					<span>{displayLabel}</span>
					<svg class={`w-4 h-4 text-gray-400 transition-transform ${cityDropdownOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" /></svg>
				</button>
				{#if cityDropdownOpen}
					<div class="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg p-2 z-20 min-w-[220px]">
						{#each boroughs as b}
							<label class="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-gray-50 cursor-pointer text-sm">
								<input type="checkbox" checked={selectedCities.has(b.key)} onchange={() => toggleCity(b.key)} class="rounded border-gray-300 text-yellow-500 focus:ring-yellow-400" />
								{b.label}
							</label>
						{/each}
					</div>
				{/if}
			</div>
		</div>

		<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
			<div class="bg-white rounded-xl border border-gray-200 p-4">
				<p class="text-xs text-gray-400 uppercase font-semibold tracking-wide">Market</p>
				<p class="text-lg font-bold text-gray-900 mt-1">{displayLabel}</p>
				<p class="text-xs text-gray-400">Combined market view</p>
			</div>
			<div class="bg-white rounded-xl border border-gray-200 p-4">
				<p class="text-xs text-gray-400 uppercase font-semibold tracking-wide">Cumulative Profit Pool</p>
				<p class="text-lg font-bold text-green-600 mt-1">${combinedProfitPool.toLocaleString()}</p>
				<div class="w-full bg-gray-100 rounded-full h-2 mt-2"><div class="bg-green-500 h-2 rounded-full" style="width:{profitPct}%"></div></div>
				<p class="text-xs text-gray-400 mt-1">{profitPct}% toward ${combinedProfitTarget.toLocaleString()} goal</p>
			</div>
			<div class="bg-white rounded-xl border border-gray-200 p-4">
				<p class="text-xs text-gray-400 uppercase font-semibold tracking-wide">Order Velocity</p>
				<p class="text-lg font-bold text-blue-600 mt-1">{combinedOrderVelocity.toLocaleString()} / {combinedOrderTarget.toLocaleString()}</p>
				<div class="w-full bg-gray-100 rounded-full h-2 mt-2"><div class="bg-blue-500 h-2 rounded-full" style="width:{orderPct}%"></div></div>
				<p class="text-xs text-gray-400 mt-1">{orderPct}% toward self-funding threshold</p>
			</div>
			<div class="bg-white rounded-xl border border-gray-200 p-4">
				<p class="text-xs text-gray-400 uppercase font-semibold tracking-wide">Active Fleet</p>
				<p class="text-lg font-bold text-purple-600 mt-1">{combinedDriversOnline} Drivers Online</p>
				<p class="text-sm text-gray-500">{combinedStoresActive} Stores Active</p>
			</div>
		</div>

		<div class="bg-white rounded-xl border border-gray-200 overflow-x-auto">
			<div class="px-6 py-4 border-b border-gray-100">
				<h2 class="text-base font-bold text-gray-900">Master Driver & Tournament Directory</h2>
				<p class="text-xs text-gray-400">{displayLabel} — Viral Node (Supply) & Customer Velocity (Demand)</p>
			</div>
			<table class="w-full text-sm">
				<thead class="bg-gray-50 border-b border-gray-100">
					<tr>
						<th class="px-3 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider cursor-pointer hover:text-orange-600 whitespace-nowrap" onclick={() => handleSort('rank')}>Rank {sortIcon('rank')}</th>
						<th class="px-3 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider cursor-pointer hover:text-orange-600 whitespace-nowrap" onclick={() => handleSort('name')}>Driver Details {sortIcon('name')}</th>
						<th class="px-3 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider cursor-pointer hover:text-orange-600 whitespace-nowrap" onclick={() => handleSort('code')}>Referral Code {sortIcon('code')}</th>
						<th class="px-3 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">Recruited <span class="text-gray-300 ml-1">↕</span></th>
						<th class="px-3 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider cursor-pointer hover:text-orange-600 whitespace-nowrap" onclick={() => handleSort('downlineTrips')}>Downline Trips {sortIcon('downlineTrips')}</th>
						<th class="px-3 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider cursor-pointer hover:text-orange-600 whitespace-nowrap" onclick={() => handleSort('customersReferred')}>Customers {sortIcon('customersReferred')}</th>
						<th class="px-3 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider cursor-pointer hover:text-orange-600 whitespace-nowrap" onclick={() => handleSort('customerPoints')}>Points {sortIcon('customerPoints')}</th>
						<th class="px-3 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider cursor-pointer hover:text-orange-600 whitespace-nowrap" onclick={() => handleSort('stripeStatus')}>Stripe {sortIcon('stripeStatus')}</th>
						<th class="px-3 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">Alerts</th>
					</tr>
				</thead>
				<tbody class="divide-y divide-gray-50">
					{#each sortedDrivers as d}
						<tr class={`hover:bg-gray-50 transition ${highlightedId === d.id ? 'bg-yellow-50 ring-2 ring-yellow-300' : ''}`}>
							<td class="px-3 py-3 font-bold text-gray-900">{d.rank}</td>
							<td class="px-3 py-3"><p class="font-semibold text-gray-900">{d.name}</p><p class="text-xs text-gray-400">{d.id}</p></td>
							<td class="px-3 py-3 font-mono text-xs text-gray-600">{d.code}</td>
							<td class="px-3 py-3">
								<span class="font-semibold text-gray-900">{d.activeRecruits}</span><span class="text-gray-400"> / {d.totalRecruits}</span>
								<div class="w-16 bg-gray-100 rounded-full h-1.5 mt-1"><div class="bg-orange-400 h-1.5 rounded-full" style="width:{(d.activeRecruits / d.totalRecruits) * 100}%"></div></div>
							</td>
							<td class="px-3 py-3"><p class="font-semibold text-gray-900">{d.downlineTrips.toLocaleString()} trips</p><p class="text-xs text-green-600">${d.downlinePay.toFixed(2)} paid</p></td>
							<td class="px-3 py-3 font-semibold text-gray-900">{d.customersReferred}</td>
							<td class="px-3 py-3 font-semibold text-gray-900">{d.customerPoints.toLocaleString()}</td>
							<td class="px-3 py-3"><span class={`text-xs font-bold ${d.stripeColor}`}>{d.stripeStatus}</span></td>
							<td class="px-3 py-3">
								{#if d.alerts.length > 0}
									<div class="space-y-1">{#each d.alerts as a, i}<span class={`block text-[11px] font-medium ${d.alertType === 'danger' ? 'text-red-600' : 'text-yellow-700'}`}>{a}</span>{/each}</div>
								{:else}<span class="text-xs text-green-600">Clear ✓</span>{/if}
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>

		<div class="bg-white rounded-xl border border-gray-200 p-6">
			<div class="flex flex-wrap items-center gap-4">
				<div class="flex-1 min-w-[250px]">
					<p class="text-xs text-gray-400 uppercase font-semibold tracking-wide mb-1">Quick Search</p>
					<div class="flex gap-2">
						<input value={search} oninput={(e) => (search = (e.currentTarget as HTMLInputElement).value)} onkeydown={(e) => e.key === 'Enter' && handleSearch()} placeholder="Enter Driver ID or Code..." class="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-yellow-400" />
						<button onclick={handleSearch} class="bg-yellow-500 hover:bg-yellow-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition">Search</button>
					</div>
				</div>
				<div class="flex gap-2 flex-wrap">
					<button onclick={() => window.confirm('Freeze Stripe Wallet — confirm?')} class="px-4 py-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg text-xs font-medium border border-red-200 transition">Freeze Stripe Wallet</button>
					<button onclick={() => window.confirm('Disqualify from Tournament — confirm?')} class="px-4 py-2 bg-orange-50 hover:bg-orange-100 text-orange-600 rounded-lg text-xs font-medium border border-orange-200 transition">Disqualify from Tournament</button>
					<button onclick={() => { const pts = window.prompt('Enter bonus points/trips to add:'); if (pts) window.alert(`Added ${pts} bonus points/trips`); }} class="px-4 py-2 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-lg text-xs font-medium border border-blue-200 transition">Add Bonus Points/Trips</button>
				</div>
			</div>
		</div>
	</main>

	<footer class="text-center text-xs text-gray-400 py-6 border-t border-gray-100 max-w-7xl mx-auto">UDO Admin · Market Control Center</footer>
</div>
