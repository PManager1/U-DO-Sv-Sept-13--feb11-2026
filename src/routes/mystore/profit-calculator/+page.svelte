<script lang="ts">
	import { goto } from '$app/navigation';

	const COMPETITOR_RATE = 0.3;
	const BENCHMARK_DATA = [
		{ category: 'New / Niche', icon: '🌱', dailyOrders: 10 },
		{ category: 'The "Sweet Spot"', icon: '🔥', dailyOrders: 35 },
		{ category: 'High Volume', icon: '🚀', dailyOrders: 80 }
	];
	const DEFAULT_ORDER_VALUE = 46;
	const BENCHMARK_ORDER_VALUE = 30;

	let dailyOrders = $state(80);
	let avgOrderValue = $state(DEFAULT_ORDER_VALUE);
	let udoRateInput = $state(15);

	const orders = $derived(Number(dailyOrders) || 0);
	const orderVal = $derived(Number(avgOrderValue) || 0);
	const udoRate = $derived(Number(udoRateInput) / 100);
	const savingsRate = $derived(COMPETITOR_RATE - udoRate);
	const dailySavings = $derived(orders * orderVal * savingsRate);
	const weeklySavings = $derived(dailySavings * 7);
	const monthlySavings = $derived(dailySavings * 30);
	const yearlySavings = $derived(dailySavings * 365);
	const benchmarkSavingsRate = $derived(savingsRate > 0 ? savingsRate : 0);

	function formatCurrency(num: number) {
		return num.toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 });
	}
</script>

<div class="min-h-screen bg-[#f9f7f5]">
	<header class="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-200 shadow-sm">
		<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center gap-4">
			<button onclick={() => goto('/mystore')} class="p-2 text-gray-500 hover:text-orange-500 hover:bg-gray-100 rounded-lg transition" title="Back">
				<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" /></svg>
			</button>
			<h1 class="text-2xl font-bold text-gray-900">💰 Profit Calculator</h1>
		</div>
	</header>

	<div class="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-8">
		<div class="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
			<div class="bg-gradient-to-r from-orange-500 to-orange-600 px-6 py-8 text-white text-center">
				<h2 class="text-2xl sm:text-3xl font-bold mb-2">Keep More of What You Earn</h2>
				<p class="text-orange-100 text-lg">Switch from 30% commission to U-DO's 15% and save thousands</p>
			</div>
			<div class="px-6 py-6">
				<div class="flex flex-col sm:flex-row gap-6 items-center justify-center">
					<div class="flex-1 w-full">
						<div class="flex justify-between items-center mb-2"><span class="text-sm font-medium text-gray-500">Competitors</span><span class="text-lg font-bold text-red-500">30%</span></div>
						<div class="h-8 bg-gray-100 rounded-full overflow-hidden"><div class="h-full bg-red-400 rounded-full" style="width:100%"></div></div>
						<p class="text-xs text-gray-400 mt-1">They take nearly a third of every order</p>
					</div>
					<div class="flex-shrink-0 w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center text-gray-400 font-bold text-sm">VS</div>
					<div class="flex-1 w-full">
						<div class="flex justify-between items-center mb-2"><span class="text-sm font-medium text-gray-500">U-DO</span><span class="text-lg font-bold text-green-600">15%</span></div>
						<div class="h-8 bg-gray-100 rounded-full overflow-hidden"><div class="h-full bg-green-500 rounded-full" style="width:50%"></div></div>
						<p class="text-xs text-gray-400 mt-1">Half the commission, double the savings</p>
					</div>
				</div>
				<div class="mt-6 text-center"><span class="inline-flex items-center gap-2 bg-green-50 text-green-700 px-5 py-2.5 rounded-full text-lg font-bold">You save <span class="text-2xl">15%</span> on every order</span></div>
			</div>
		</div>

		<div class="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
			<div class="px-6 py-4 border-b border-gray-100">
				<h3 class="text-xl font-bold text-gray-900">📊 Calculate Your Savings</h3>
				<p class="text-sm text-gray-500 mt-1">Enter your numbers to see how much you could save with U-DO</p>
			</div>
			<div class="px-6 py-6">
				<div class="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-8">
					<div>
						<label class="block text-sm font-semibold text-gray-700 mb-2">U-DO charges to pay for the drivers</label>
						<div class="relative">
							<input type="number" min="0" max="30" step="0.5" value={udoRateInput} oninput={(e) => (udoRateInput = Number((e.currentTarget as HTMLInputElement).value))} class="w-full px-4 py-3 border border-gray-200 rounded-xl text-lg font-medium focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-orange-400 transition" />
							<span class="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 text-sm">%</span>
						</div>
					</div>
					<div class="hidden sm:block"></div>
					<div>
						<label class="block text-sm font-semibold text-gray-700 mb-2">Orders per day</label>
						<div class="relative">
							<input type="number" min="0" value={dailyOrders} oninput={(e) => (dailyOrders = Number((e.currentTarget as HTMLInputElement).value))} placeholder="e.g. 35" class="w-full px-4 py-3 border border-gray-200 rounded-xl text-lg font-medium focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-orange-400 transition" />
							<span class="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 text-sm">orders/day</span>
						</div>
					</div>
					<div>
						<label class="block text-sm font-semibold text-gray-700 mb-2">Average order value</label>
						<div class="relative">
							<span class="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-lg font-medium">$</span>
							<input type="number" min="0" step="0.01" value={avgOrderValue} oninput={(e) => (avgOrderValue = Number((e.currentTarget as HTMLInputElement).value))} class="w-full pl-8 pr-4 py-3 border border-gray-200 rounded-xl text-lg font-medium focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-orange-400 transition" />
						</div>
					</div>
				</div>
				{#if orders > 0 && orderVal > 0 && savingsRate > 0}
					<div class="grid grid-cols-2 sm:grid-cols-4 gap-4">
						<div class="bg-orange-50 rounded-xl p-4 text-center"><p class="text-xs font-medium text-orange-600 uppercase tracking-wide mb-1">Daily</p><p class="text-2xl font-bold text-orange-600">{formatCurrency(dailySavings)}</p></div>
						<div class="bg-orange-50 rounded-xl p-4 text-center"><p class="text-xs font-medium text-orange-600 uppercase tracking-wide mb-1">Weekly</p><p class="text-2xl font-bold text-orange-600">{formatCurrency(weeklySavings)}</p></div>
						<div class="bg-green-50 rounded-xl p-4 text-center ring-2 ring-green-200"><p class="text-xs font-medium text-green-600 uppercase tracking-wide mb-1">Monthly</p><p class="text-2xl font-bold text-green-600">{formatCurrency(monthlySavings)}</p><p class="text-[10px] text-green-500 mt-0.5">30 days</p></div>
						<div class="bg-green-50 rounded-xl p-4 text-center"><p class="text-xs font-medium text-green-600 uppercase tracking-wide mb-1">Yearly</p><p class="text-2xl font-bold text-green-600">{formatCurrency(yearlySavings)}</p><p class="text-[10px] text-green-500 mt-0.5">365 days</p></div>
					</div>
				{:else}
					<div class="text-center py-8 text-gray-400"><p class="text-4xl mb-2">👆</p><p>Enter your daily orders above to see your savings</p></div>
				{/if}
			</div>
		</div>

		<div class="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
			<div class="px-6 py-4 border-b border-gray-100">
				<h3 class="text-xl font-bold text-gray-900">📋 Savings by Restaurant Category</h3>
				<p class="text-sm text-gray-500 mt-1">Based on {formatCurrency(BENCHMARK_ORDER_VALUE)} average pizza order value in DC • Competitors take 30% vs U-DO's 15%</p>
			</div>
			<div class="overflow-x-auto">
				<table class="w-full">
					<thead><tr class="bg-gray-50"><th class="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Category</th><th class="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Daily Orders</th><th class="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Daily Savings</th><th class="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Weekly Savings</th><th class="text-right px-4 py-3 text-xs font-semibold text-orange-500 uppercase tracking-wide">Monthly (30 Days)</th><th class="text-right px-4 py-3 text-xs font-semibold text-green-600 uppercase tracking-wide">Yearly (365 Days)</th></tr></thead>
					<tbody class="divide-y divide-gray-50">
						{#each BENCHMARK_DATA as row}
							{@const daily = row.dailyOrders * BENCHMARK_ORDER_VALUE * benchmarkSavingsRate}
							<tr class="hover:bg-orange-50/30 transition">
								<td class="px-6 py-4"><div class="flex items-center gap-2"><span class="text-xl">{row.icon}</span><span class="font-semibold text-gray-900">{row.category}</span></div></td>
								<td class="text-center px-4 py-4 text-gray-700 font-medium">{row.dailyOrders}</td>
								<td class="text-right px-4 py-4 text-gray-700 font-medium">{formatCurrency(daily)}</td>
								<td class="text-right px-4 py-4 text-gray-700 font-medium">{formatCurrency(daily * 7)}</td>
								<td class="text-right px-4 py-4 font-bold text-green-600">{formatCurrency(daily * 30)}</td>
								<td class="text-right px-4 py-4 font-bold text-green-700">{formatCurrency(daily * 365)}</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
			<div class="px-6 py-3 bg-gray-50 border-t border-gray-100"><p class="text-xs text-gray-400">💡 Savings calculated as the commission difference (30% − {udoRateInput}%) × daily orders × average order value.</p></div>
		</div>

		<div class="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
			<div class="bg-gradient-to-r from-orange-500 to-amber-500 px-6 py-5 text-white text-center">
				<h3 class="text-xl sm:text-2xl font-bold">🎯 The U-DO Strategy vs. The Visibility Trap</h3>
				<p class="text-orange-100 text-sm mt-1">This is exactly where your U-DO pitch becomes powerful for the merchant</p>
			</div>
			<div class="px-6 py-8">
				<div class="bg-orange-50 border-l-4 border-orange-500 rounded-r-xl p-6"><p class="text-gray-800 text-lg leading-relaxed italic">"On Uber, you are spending <span class="font-bold text-red-600 not-italic">$20 in food discounts</span> just to get a customer's attention, and then paying Uber another <span class="font-bold text-red-600 not-italic">30%</span> to deliver it. With U-DO, we don't play those games. We give you a <span class="font-bold text-green-700 not-italic">fair 15% rate</span> from the start, so you don't have to bankrupt your margins just to be 'visible'."</p></div>
			</div>
		</div>

		<div class="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
			<div class="bg-gradient-to-r from-green-600 to-emerald-500 px-6 py-5 text-white text-center"><h3 class="text-xl sm:text-2xl font-bold">✅ The "Direct Pricing" Guarantee</h3></div>
			<div class="px-6 py-8 space-y-6">
				<div class="flex gap-4 items-start"><span class="flex-shrink-0 w-10 h-10 rounded-full bg-red-100 text-red-600 flex items-center justify-center font-bold text-lg">⚠️</span><div><h4 class="font-bold text-gray-900 mb-1">The Problem</h4><p class="text-gray-600 leading-relaxed">Uber often allows or encourages restaurants to inflate their menu prices by <span class="font-bold text-red-600">15–20%</span> to cover commissions.</p></div></div>
				<div class="flex gap-4 items-start"><span class="flex-shrink-0 w-10 h-10 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center font-bold text-lg">🤝</span><div><h4 class="font-bold text-gray-900 mb-1">The U-DO Move</h4><p class="text-gray-600 leading-relaxed">You tell the merchant: <span class="italic">"I'm only charging you <span class="font-bold text-orange-600">18–20% commission</span> (down from 30%). In exchange, you must list your <span class="font-bold text-orange-600">true in-store prices</span> on U-DO."</span></p></div></div>
				<div class="flex gap-4 items-start"><span class="flex-shrink-0 w-10 h-10 rounded-full bg-green-100 text-green-600 flex items-center justify-center font-bold text-lg">💎</span><div><h4 class="font-bold text-gray-900 mb-1">The Value</h4><p class="text-gray-600 leading-relaxed">The customer sees a burger for <span class="font-bold text-green-700">$12.00</span> on U-DO instead of <span class="font-bold text-red-600 line-through">$14.50</span> on Uber. This <span class="font-bold text-green-700">"Menu Parity"</span> is your strongest marketing tool.</p></div></div>
				<div class="mt-4 bg-gray-50 rounded-xl p-5 border border-gray-100">
					<p class="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3 text-center">Price comparison for the same burger</p>
					<div class="flex flex-col sm:flex-row gap-4 items-center justify-center">
						<div class="flex-1 text-center bg-red-50 rounded-xl p-4 border border-red-100"><p class="text-sm font-medium text-gray-500 mb-1">Uber Eats</p><p class="text-3xl font-bold text-red-500">$14.50</p><p class="text-xs text-red-400 mt-1">Inflated price to cover 30% commission</p></div>
						<div class="text-2xl text-gray-300 font-bold">→</div>
						<div class="flex-1 text-center bg-green-50 rounded-xl p-4 border border-green-200 ring-2 ring-green-200"><p class="text-sm font-medium text-gray-500 mb-1">U-DO</p><p class="text-3xl font-bold text-green-600">$12.00</p><p class="text-xs text-green-500 mt-1">True in-store price • Fair commission</p></div>
					</div>
				</div>
			</div>
		</div>
	</div>
</div>
