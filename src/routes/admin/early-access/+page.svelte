<script lang="ts">
	import { onMount } from 'svelte';
	import API_BASE from '$lib/api';

	let signups = $state<any[]>([]);
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
			const res = await fetch(API_BASE + 'early-access');
			if (!res.ok) throw new Error(`Server returned ${res.status}`);
			const data = await res.json();
			signups = data.signups || [];
		} catch (err) {
			error = (err as Error).message + ' — Make sure the server is running at ' + API_BASE;
		} finally {
			loading = false;
		}
	}

	function toggleCard(idx: number) {
		expandedCard = expandedCard === idx ? null : idx;
	}

	const filtered = $derived(
		searchQuery.trim()
			? signups.filter((s) => {
					const text = `${s.email || ''} ${s.phoneNumber || ''} ${s._id || ''}`.toLowerCase();
					return text.includes(searchQuery.toLowerCase());
				})
			: signups
	);

	function formatDate(dateStr: string) {
		if (!dateStr) return '—';
		try {
			const d = new Date(dateStr);
			return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
		} catch {
			return dateStr;
		}
	}

	function getInitials(signup: any) {
		if (signup.email) return signup.email[0].toUpperCase();
		if (signup.phoneNumber) return signup.phoneNumber.slice(-2);
		return '?';
	}
</script>

<header class="bg-white border-b border-gray-200">
	<div class="max-w-6xl mx-auto px-6 py-6">
		<a href="/admin/" class="flex items-center gap-3 group">
			<div class="w-10 h-10 bg-orange-500 rounded-xl flex items-center justify-center">
				<svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
			</div>
			<div>
				<h1 class="text-2xl font-bold text-gray-900">Early Access Signups</h1>
				<p class="text-sm text-gray-500">All signups from the /t landing page</p>
			</div>
		</a>
	</div>
</header>

<main class="max-w-6xl mx-auto px-6 py-8">
	<div class="flex flex-wrap items-center gap-4 mb-6">
		<div class="bg-gray-50 border border-gray-200 rounded-full px-3 py-1 text-xs font-semibold">📧 {signups.length} Signups</div>
		<div class="flex-1"></div>
		<div class="relative">
			<svg class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
			<input type="text" value={searchQuery} oninput={(e) => (searchQuery = (e.currentTarget as HTMLInputElement).value)} placeholder="Search by email or phone..." class="pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm w-72 focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100" />
		</div>
		<button onclick={loadData} class="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition flex items-center gap-2">
			<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
			Refresh
		</button>
	</div>

	{#if loading}
		<div class="text-center py-16">
			<svg class="animate-spin w-10 h-10 text-orange-500 mx-auto mb-4" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path></svg>
			<p class="text-gray-500">Loading signups...</p>
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
			<p class="text-gray-700 font-semibold mb-2">No signups found</p>
			<p class="text-sm text-gray-500">{searchQuery ? 'Try adjusting your search query.' : 'No one has signed up yet.'}</p>
		</div>
	{/if}

	<div class="space-y-3">
		{#each filtered as signup, idx}
			{@const isExpanded = expandedCard === idx}
			<div onclick={() => toggleCard(idx)} class={`bg-white rounded-xl p-5 border cursor-pointer transition-all hover:shadow-md ${isExpanded ? 'border-orange-500 shadow-lg' : 'border-gray-200'}`}>
				<div class="flex items-center gap-4">
					<div class="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center flex-shrink-0">
						<span class="text-lg font-bold text-orange-600">{getInitials(signup)}</span>
					</div>
					<div class="flex-1 min-w-0">
						<div class="flex items-center gap-2 flex-wrap">
							<h3 class="font-semibold text-gray-900 truncate">{signup.email || 'No email'}</h3>
							{#if signup.phoneNumber}<span class="text-xs font-medium px-2 py-0.5 rounded-full bg-green-50 text-green-700">📱 Phone provided</span>{/if}
						</div>
						<div class="flex items-center gap-4 mt-1 flex-wrap">
							{#if signup.email}<span class="text-sm text-gray-500 truncate">✉️ {signup.email}</span>{/if}
							{#if signup.phoneNumber}<span class="text-sm text-green-700 font-medium">📱 {signup.phoneNumber}</span>{/if}
							{#if signup.createdAt}<span class="text-xs text-gray-400">Signed up {formatDate(signup.createdAt)}</span>{/if}
						</div>
					</div>
					<svg class={`w-5 h-5 text-gray-400 flex-shrink-0 transition-transform ${isExpanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" /></svg>
				</div>

				{#if isExpanded}
					<div class="border-t border-gray-100 mt-4 pt-4 overflow-y-auto" style="max-height:70vh">
						<div class="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
							<div><p class="text-xs font-medium text-gray-400">Signup ID</p><p class="font-mono text-xs text-gray-600 bg-gray-50 px-2 py-1 rounded mt-1 break-all">{signup._id || '—'}</p></div>
							<div><p class="text-xs font-medium text-gray-400">Email</p><p class="text-gray-700 mt-1">{signup.email || '—'}</p></div>
							<div><p class="text-xs font-medium text-gray-400">Phone</p><p class="text-gray-700 mt-1">{signup.phoneNumber || '—'}</p></div>
							<div><p class="text-xs font-medium text-gray-400">Signed Up</p><p class="text-gray-700 mt-1">{formatDate(signup.createdAt)}</p></div>
						</div>
					</div>
				{/if}
			</div>
		{/each}
	</div>
</main>

<div class="text-center text-xs text-gray-400 py-6 border-t border-gray-100 mt-8">
	UDO Admin · Early Access Signups · Backend at <code class="bg-gray-100 px-1 rounded">localhost:3030</code>
</div>
