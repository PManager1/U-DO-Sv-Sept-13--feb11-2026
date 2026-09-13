<script lang="ts">
	import { onMount } from 'svelte';
	import API_BASE from '$lib/api';

	type ItemImage = { url?: string; size?: string; version?: string; isPrimary?: boolean };
	type SyncItem = {
		brandId: string;
		brandName: string;
		logoUrl?: string;
		aisleIndex: number;
		itemIndex: number;
		name: string;
		price: number;
		description?: string;
		available: boolean;
		images: ItemImage[];
		rawImageUrl?: string;
		tags: string[];
		adminNote?: string;
	};

	type VaultItem = {
		id: string;
		searchTags?: string[];
		originalFilename?: string;
		urls: Record<string, string>;
		source?: string;
		width?: number;
		height?: number;
		createdAt?: string;
	};

	const BASE = API_BASE + 'admin/global-image-sync/';

	function goBack() {
		history.back();
	}

	let query = $state('');
	let searchResults = $state<SyncItem[]>([]);
	let itemCount = $state(0);
	let storeCount = $state(0);
	let loading = $state(false);
	let searching = $state(false);
	let error = $state<string | null>(null);
	let notice = $state<string | null>(null);

	let vaultItems = $state<VaultItem[]>([]);
	let vaultLoading = $state(false);
	let vaultTab = $state<'vault' | 'fromSearch'>('vault');

	let selected = $state<Set<string>>(new Set());
	let submitting = $state(false);

	let syncMode = $state<'append' | 'replace'>('append');
	let autoMatchEnabled = $state(false);
	let autoMatched = $state<Set<string>>(new Set());

	let searchTimer: ReturnType<typeof setTimeout> | undefined;

	const allSelected = $derived(searchResults.length > 0 && searchResults.every((r) => selected.has(key(r))));

	function key(item: SyncItem) {
		return `${item.brandId}:${item.aisleIndex}:${item.itemIndex}`;
	}

	function imageUrl(item: SyncItem) {
		const imgs = item.images || [];
		if (imgs.length === 0) return item.rawImageUrl || '';
		const primary = imgs.find((i) => i.isPrimary) || imgs[0];
		return primary?.url || item.rawImageUrl || '';
	}

	function imageCount(item: SyncItem) {
		return (item.images || []).length;
	}

	function nextImage(item: SyncItem, dir: number) {
		const k = key(item);
		const n = imageCount(item);
		if (n <= 1) return;
		const cur = heroImageIndex[k] || 0;
		heroImageIndex[k] = (cur + dir + n) % n;
	}

	const heroImageIndex = $state<Record<string, number>>({});

	function formatPrice(price: number) {
		return price == null ? '—' : `$${price.toFixed(2)}`;
	}

	function dimensionsBadge(item: VaultItem) {
		if (item.width && item.height) return `${item.width}×${item.height}`;
		const sizes = Object.keys(item.urls).filter((s) => s !== 'store');
		if (sizes.length > 0) {
			const max = sizes.reduce((a, b) => (parseInt(a) > parseInt(b) ? a : b));
			return `${max}px`;
		}
		if (item.urls.store) return 'Store';
		return '';
	}

	function sourceBadge(item: VaultItem) {
		if (item.source) return item.source;
		if (item.searchTags && item.searchTags.length > 0) {
			const src = item.searchTags.find((t) =>
				['In-Store', 'AI', 'Pinterest', 'Web', 'Aldi', 'Walmart', 'Costco', 'Giant'].some((k) =>
					t.toLowerCase().includes(k.toLowerCase())
				)
			);
			if (src) return src;
		}
		return 'Unknown';
	}

	async function loadVault(q: string) {
		vaultLoading = true;
		try {
			const params = new URLSearchParams();
			if (q) params.set('q', q);
			const res = await fetch(BASE + 'vault?' + params.toString());
			if (!res.ok) throw new Error(`Vault fetch failed (${res.status})`);
			const data = await res.json();
			vaultItems = data.items || [];
		} catch (err) {
			vaultItems = [];
		} finally {
			vaultLoading = false;
		}
	}

	async function doSearch(q: string, opts: { preserveSelection?: boolean } = {}) {
		loading = true;
		error = null;
		try {
			const params = new URLSearchParams();
			if (q) params.set('q', q);
			const res = await fetch(BASE + 'search?' + params.toString());
			if (!res.ok) throw new Error(`Search failed (${res.status})`);
			const data = await res.json();
			searchResults = data.items || [];
			itemCount = data.itemCount || searchResults.length;
			storeCount = data.storeCount || 0;
			if (!opts.preserveSelection) selected = new Set();
			autoMatched = new Set();
			autoMatchEnabled = false;
		} catch (err) {
			error = (err as Error).message;
			searchResults = [];
			itemCount = 0;
			storeCount = 0;
		} finally {
			loading = false;
			searching = false;
		}
	}

	function onQueryInput(value: string) {
		query = value;
		searching = true;
		if (searchTimer) clearTimeout(searchTimer);
		searchTimer = setTimeout(() => {
			doSearch(value);
			loadVault(value);
		}, 350);
	}

	function toggleSelection(item: SyncItem) {
		const k = key(item);
		const next = new Set(selected);
		if (next.has(k)) next.delete(k);
		else next.add(k);
		selected = next;
	}

	function toggleSelectAll() {
		if (allSelected) {
			selected = new Set();
		} else {
			const next = new Set<string>();
			for (const item of searchResults) next.add(key(item));
			selected = next;
		}
	}

	function clearSelection() {
		selected = new Set();
		autoMatched = new Set();
		autoMatchEnabled = false;
	}

	function runAutoMatch() {
		if (searchResults.length === 0) return;
		autoMatchEnabled = !autoMatchEnabled;
		if (autoMatchEnabled) {
			const matched = new Set<string>();
			const normalized = searchResults.map((item) => ({
				k: key(item),
				name: normalizeName(item.name)
			}));
			for (let i = 0; i < normalized.length; i++) {
				for (let j = i + 1; j < normalized.length; j++) {
					if (normalized[i].name === normalized[j].name) {
						matched.add(normalized[i].k);
						matched.add(normalized[j].k);
					} else if (fuzzyMatch(normalized[i].name, normalized[j].name)) {
						matched.add(normalized[i].k);
						matched.add(normalized[j].k);
					}
				}
			}
			autoMatched = matched;
			if (matched.size > 0) {
				selected = new Set([...selected, ...matched]);
			}
		} else {
			autoMatched = new Set();
		}
	}

	function normalizeName(name: string) {
		return name
			.toLowerCase()
			.replace(/[^a-z0-9\s]/g, '')
			.replace(/\s+/g, ' ')
			.trim();
	}

	function fuzzyMatch(a: string, b: string) {
		const tokensA = new Set(a.split(' '));
		const tokensB = new Set(b.split(' '));
		let overlap = 0;
		for (const t of tokensA) {
			if (t.length > 2 && tokensB.has(t)) overlap++;
		}
		const minTokens = Math.min(tokensA.size, tokensB.size);
		return minTokens > 0 && overlap / minTokens >= 0.6;
	}

	type MasterPayload = {
		source: string;
		urls: { url: string; size: string }[];
	};

	function buildMasterFromVault(item: VaultItem): MasterPayload {
		const urls: { url: string; size: string }[] = [];
		const sizeMap: Record<string, string> = { '1000': '1000', '400': '400', '100': '150', store: 'store' };
		for (const [sizeKey, url] of Object.entries(item.urls)) {
			if (url) {
				urls.push({ url, size: sizeMap[sizeKey] || sizeKey });
			}
		}
		if (urls.length === 0 && item.urls.detail) {
			urls.push({ url: item.urls.detail, size: '1000' });
		}
		return {
			source: item.source || item.originalFilename || 'Vault',
			urls
		};
	}

	function buildMasterFromItem(item: SyncItem): MasterPayload {
		const urls: { url: string; size: string }[] = [];
		if (item.images && item.images.length > 0) {
			for (const img of item.images) {
				if (img.url) {
					urls.push({ url: img.url, size: img.size || '1000' });
				}
			}
		} else if (item.rawImageUrl) {
			urls.push({ url: item.rawImageUrl, size: '1000' });
		}
		return {
			source: item.brandName || 'Store Asset',
			urls
		};
	}

	async function syncToTargets(master: MasterPayload, targets: SyncItem[]) {
		if (targets.length === 0) return;
		submitting = true;
		error = null;
		notice = null;
		try {
			const items = targets.map((t) => ({
				brandId: t.brandId,
				aisleIndex: t.aisleIndex,
				itemIndex: t.itemIndex
			}));
			const res = await fetch(BASE + 'sync', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					mode: syncMode,
					master,
					items
				})
			});
			if (!res.ok) {
				let msg = `Request failed (${res.status})`;
				try {
					const b = await res.json();
					if (b?.error) msg = b.error;
				} catch {}
				throw new Error(msg);
			}
			const data = await res.json();
			notice = `Synced ${data.updated} item(s) in ${syncMode} mode.`;
			await doSearch(query.trim(), { preserveSelection: true });
		} catch (err) {
			error = (err as Error).message;
		} finally {
			submitting = false;
		}
	}

	function handleDropVault(e: DragEvent) {
		e.preventDefault();
		const dt = e.dataTransfer;
		if (!dt) return;
		const data = dt.getData('application/x-master');
		if (!data) return;
		try {
			const parsed = JSON.parse(data);
			const master: MasterPayload = parsed.isVault
				? buildMasterFromVault(parsed.item as VaultItem)
				: buildMasterFromItem(parsed.item as SyncItem);
			const targets = searchResults.filter((r) => selected.has(key(r)));
			if (targets.length > 0) {
				syncToTargets(master, targets);
			}
		} catch {}
	}

	function handleCardDrop(e: DragEvent, target: SyncItem) {
		e.preventDefault();
		const dt = e.dataTransfer;
		if (!dt) return;
		const data = dt.getData('application/x-master');
		if (!data) return;
		try {
			const parsed = JSON.parse(data);
			const master: MasterPayload = parsed.isVault
				? buildMasterFromVault(parsed.item as VaultItem)
				: buildMasterFromItem(parsed.item as SyncItem);
			syncToTargets(master, [target]);
		} catch {}
	}

	function handleApplyToSelected() {
		if (selected.size === 0) {
			error = 'Select at least one target item.';
			return;
		}
		if (vaultTab === 'vault' && vaultItems.length > 0) {
			const master = buildMasterFromVault(vaultItems[0]);
			const targets = searchResults.filter((r) => selected.has(key(r)));
			syncToTargets(master, targets);
		} else if (searchResults.length > 0) {
			const master = buildMasterFromItem(searchResults[0]);
			const targets = searchResults.filter((r) => selected.has(key(r)));
			syncToTargets(master, targets);
		}
	}

	function handlePropagateAll() {
		if (autoMatched.size === 0) {
			error = 'Run Auto-Match first to identify target items.';
			return;
		}
		if (vaultTab === 'vault' && vaultItems.length > 0) {
			const master = buildMasterFromVault(vaultItems[0]);
			const targets = searchResults.filter((r) => autoMatched.has(key(r)));
			syncToTargets(master, targets);
		} else if (searchResults.length > 0) {
			const master = buildMasterFromItem(searchResults[0]);
			const targets = searchResults.filter((r) => autoMatched.has(key(r)));
			syncToTargets(master, targets);
		}
	}

	function clearVaultEdit() {
		editingVaultId = null;
		editSource = '';
		editWidth = '';
		editHeight = '';
	}

	let editingVaultId = $state<string | null>(null);
	let editSource = $state('');
	let editWidth = $state('');
	let editHeight = $state('');

	function startVaultEdit(item: VaultItem) {
		editingVaultId = item.id;
		editSource = item.source || '';
		editWidth = item.width ? String(item.width) : '';
		editHeight = item.height ? String(item.height) : '';
	}

	async function saveVaultMeta() {
		if (!editingVaultId) return;
		try {
			const res = await fetch(BASE + 'vault/' + editingVaultId + '/meta', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					source: editSource,
					width: editWidth ? parseInt(editWidth) : 0,
					height: editHeight ? parseInt(editHeight) : 0
				})
			});
			if (!res.ok) throw new Error('Failed to save metadata');
			await loadVault(query);
			clearVaultEdit();
			notice = 'Metadata updated.';
		} catch (err) {
			error = (err as Error).message;
		}
	}

	onMount(() => {
		doSearch('');
		loadVault('');
	});
</script>

<svelte:head><title>Admin · Global Image Sync</title></svelte:head>

<div class="min-h-screen bg-gray-50">
	<header class="border-b border-gray-200 bg-white">
		<div class="mx-auto max-w-7xl px-6 py-5">
			<button
				type="button"
				onclick={goBack}
				class="cursor-pointer text-sm font-medium text-orange-500 hover:text-orange-600"
				>← Back</button
			>
			<h1 class="mt-3 text-2xl font-bold text-gray-900">Global Image Sync Hub</h1>
			<p class="text-sm text-gray-500">
				Curate and distribute high-quality images across all grocery stores in one click.
			</p>
		</div>
	</header>

	<main class="mx-auto max-w-7xl px-6 py-6">
		{#if error}
			<div class="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
				{error}
			</div>
		{/if}
		{#if notice}
			<div
				class="mb-4 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700"
			>
				{notice}
			</div>
		{/if}

		<!-- Search & controls bar -->
		<div class="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
			<div class="grid gap-4 md:grid-cols-3">
				<div class="md:col-span-2">
					<label class="mb-1 block text-xs font-semibold text-gray-500" for="gisq"
						>Search items</label
					>
					<div class="flex items-center gap-2">
						<input
							id="gisq"
							type="text"
							value={query}
							oninput={(e) => onQueryInput((e.currentTarget as HTMLInputElement).value)}
							placeholder="e.g. blackberry, milk, chicken…"
							class="min-w-0 flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-orange-400 focus:outline-none"
						/>
						<button
							type="button"
							onclick={() => doSearch(query.trim())}
							disabled={loading}
							class="shrink-0 rounded-lg bg-orange-500 px-4 py-2 text-sm font-medium text-white hover:bg-orange-600 disabled:opacity-50"
							>Search</button
						>
					</div>
					{#if searching}<p class="mt-1 text-xs text-gray-400">Searching…</p>{/if}
				</div>
				<div>
					<label class="mb-1 block text-xs font-semibold text-gray-500">Sync mode</label>
					<div class="flex items-center gap-2">
						<button
							type="button"
							onclick={() => (syncMode = 'append')}
							class={`flex-1 rounded-lg px-3 py-2 text-sm font-medium ${
								syncMode === 'append'
									? 'bg-emerald-500 text-white'
									: 'bg-gray-100 text-gray-700 hover:bg-gray-200'
							}`}
							>Append</button
						>
						<button
							type="button"
							onclick={() => (syncMode = 'replace')}
							class={`flex-1 rounded-lg px-3 py-2 text-sm font-medium ${
								syncMode === 'replace'
									? 'bg-red-500 text-white'
									: 'bg-gray-100 text-gray-700 hover:bg-gray-200'
							}`}
							>Replace</button
						>
					</div>
					<p class="mt-1 text-[11px] text-gray-400">
						Append keeps existing images; Replace wipes them.
					</p>
				</div>
			</div>
			<div class="mt-4 flex flex-wrap items-center gap-2">
				<button
					type="button"
					onclick={runAutoMatch}
					disabled={searchResults.length === 0}
					class={`rounded-lg px-3 py-1.5 text-sm font-medium ${
						autoMatchEnabled
							? 'bg-violet-500 text-white'
							: 'bg-gray-100 text-gray-700 hover:bg-gray-200'
					} disabled:opacity-50`}
					>
					Auto-Match {autoMatchEnabled ? '✓' : ''}
				</button>
				<button
					type="button"
					onclick={handlePropagateAll}
					disabled={autoMatched.size === 0 || submitting}
					class="rounded-lg bg-violet-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-violet-700 disabled:opacity-50"
					>Propagate to All Matches ({autoMatched.size})</button
				>
				<button
					type="button"
					onclick={handleApplyToSelected}
					disabled={selected.size === 0 || submitting}
					class="rounded-lg bg-orange-500 px-3 py-1.5 text-sm font-medium text-white hover:bg-orange-600 disabled:opacity-50"
					>Sync to Selected ({selected.size})</button
				>
			</div>
		</div>

		<!-- Two-panel layout -->
		<div class="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
			<!-- Left panel: Media Vault -->
			<div class="lg:col-span-1">
				<div class="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
					<div class="mb-3 flex items-center justify-between">
						<h2 class="text-lg font-bold text-gray-900">Media Vault</h2>
						<div class="flex gap-1">
							<button
								type="button"
								onclick={() => (vaultTab = 'vault')}
								class={`rounded px-2 py-1 text-xs font-medium ${
									vaultTab === 'vault'
										? 'bg-emerald-500 text-white'
										: 'bg-gray-100 text-gray-700'
								}`}
								>Vault</button
							>
							<button
								type="button"
								onclick={() => (vaultTab = 'fromSearch')}
								class={`rounded px-2 py-1 text-xs font-medium ${
									vaultTab === 'fromSearch'
										? 'bg-emerald-500 text-white'
										: 'bg-gray-100 text-gray-700'
								}`}
								>From Search</button
							>
						</div>
					</div>

					{#if vaultTab === 'vault'}
						{#if vaultLoading}
							<p class="py-8 text-center text-sm text-gray-400">Loading vault…</p>
						{:else if vaultItems.length === 0}
							<p class="py-8 text-center text-sm text-gray-400">
								No vault images found. Upload images via the GU admin to populate.
							</p>
						{:else}
							<div class="space-y-3">
								{#each vaultItems as item}
									<div
										draggable="true"
										ondragstart={(e) => {
											e.dataTransfer?.setData(
												'application/x-master',
												JSON.stringify({ isVault: true, item })
											);
										}}
										class="group relative cursor-grab overflow-hidden rounded-lg border border-gray-200 hover:border-emerald-400"
									>
										{#if editingVaultId === item.id}
											<div class="p-3">
												<input
													type="text"
													value={editSource}
													oninput={(e) =>
														(editSource = (e.currentTarget as HTMLInputElement).value)}
													placeholder="Source (e.g. In-Store Camera)"
													class="mb-2 w-full rounded border border-gray-300 px-2 py-1 text-xs"
												/>
												<div class="mb-2 flex gap-2">
													<input
														type="number"
														value={editWidth}
														oninput={(e) =>
															(editWidth = (e.currentTarget as HTMLInputElement).value)}
														placeholder="Width"
														class="w-full rounded border border-gray-300 px-2 py-1 text-xs"
													/>
													<input
														type="number"
														value={editHeight}
														oninput={(e) =>
															(editHeight = (e.currentTarget as HTMLInputElement).value)}
														placeholder="Height"
														class="w-full rounded border border-gray-300 px-2 py-1 text-xs"
													/>
												</div>
												<div class="flex gap-2">
													<button
														type="button"
														onclick={saveVaultMeta}
														class="flex-1 rounded bg-emerald-500 px-2 py-1 text-xs text-white"
														>Save</button
													>
													<button
														type="button"
														onclick={clearVaultEdit}
														class="flex-1 rounded bg-gray-200 px-2 py-1 text-xs text-gray-700"
														>Cancel</button
													>
												</div>
											</div>
										{:else}
											<div class="aspect-square w-full bg-gray-100">
												{#if item.urls['1000'] || item.urls['400'] || item.urls.detail}
													<img
														src={item.urls['1000'] || item.urls['400'] || item.urls.detail || ''}
														alt=""
														class="h-full w-full object-cover"
													/>
												{:else}
													<div
														class="flex h-full w-full items-center justify-center text-3xl text-gray-300"
													>
														🖼️
													</div>
												{/if}
											</div>
											<div class="p-2">
												<div class="mb-1 flex flex-wrap gap-1">
													<span
														class="inline-flex items-center rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-medium text-emerald-700"
														>{sourceBadge(item)}</span
													>
													{#if dimensionsBadge(item)}
														<span
															class="inline-flex items-center rounded bg-blue-100 px-1.5 py-0.5 text-[10px] font-medium text-blue-700"
															>{dimensionsBadge(item)}</span
														>
													{/if}
												</div>
												{#if item.searchTags && item.searchTags.length > 0}
													<p class="text-[10px] text-gray-400">
														#{item.searchTags.slice(0, 3).join(' #')}
														{#if item.searchTags.length > 3}…{/if}
													</p>
												{/if}
												<button
													type="button"
													onclick={() => startVaultEdit(item)}
													class="mt-1 text-[10px] text-gray-500 hover:text-gray-700"
													>Edit origin</button
												>
											</div>
										{/if}
									</div>
								{/each}
							</div>
						{/if}
					{:else}
						<!-- From Search tab -->
						{#if searchResults.length === 0}
							<p class="py-8 text-center text-sm text-gray-400">
								Search for items to see their images here.
							</p>
						{:else}
							<div class="space-y-3">
								{#each searchResults as item}
									{#if imageCount(item) > 0 || item.rawImageUrl}
										<div
											draggable="true"
											ondragstart={(e) => {
												e.dataTransfer?.setData(
													'application/x-master',
													JSON.stringify({ isVault: false, item })
												);
											}}
											class="group relative cursor-grab overflow-hidden rounded-lg border border-gray-200 hover:border-emerald-400"
										>
											<div class="aspect-square w-full bg-gray-100">
												<img src={imageUrl(item)} alt="" class="h-full w-full object-cover" />
											</div>
											<div class="p-2">
												<p class="text-xs font-semibold text-gray-800 line-clamp-1">
													{item.name}
												</p>
												<p class="text-[10px] text-gray-400">{item.brandName}</p>
												<span
													class="mt-1 inline-flex items-center rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-700"
													>Store Asset</span
												>
											</div>
										</div>
									{/if}
								{/each}
							</div>
						{/if}
					{/if}
				</div>
			</div>

			<!-- Right panel: Target Product Grid -->
			<div class="lg:col-span-2">
				<div class="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
					<div class="mb-3 flex items-center justify-between">
						<h2 class="text-lg font-bold text-gray-900">
							Target Products ({itemCount} items across {storeCount} stores)
						</h2>
						<label class="flex cursor-pointer items-center gap-2 text-sm font-medium text-gray-700">
							<input
								type="checkbox"
								checked={allSelected}
								onchange={toggleSelectAll}
								class="h-4 w-4 rounded border-gray-300 text-orange-500 focus:ring-orange-400"
							/>
							Select all
						</label>
					</div>

					{#if loading}
						<p class="py-16 text-center text-sm text-gray-400">Loading items…</p>
					{:else if searchResults.length === 0}
						<p class="py-16 text-center text-sm text-gray-400">
							No items found. Try a different search.
						</p>
					{:else}
						<div
							class="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4"
							ondragover={(e) => e.preventDefault()}
							ondrop={handleDropVault}
						>
							{#each searchResults as item (key(item))}
								{@const sel = selected.has(key(item))}
								{@const k = key(item)}
								{@const nImgs = imageCount(item)}
								{@const matched = autoMatched.has(k)}
								<div
									ondragover={(e) => e.preventDefault()}
									ondrop={(e) => handleCardDrop(e, item)}
									onclick={(e) => {
										e.preventDefault();
										toggleSelection(item);
									}}
									class={`relative flex cursor-pointer flex-col overflow-hidden rounded-xl border bg-white transition ${
										sel
											? 'border-orange-500 ring-2 ring-orange-200'
											: matched
												? 'border-violet-400 ring-2 ring-violet-200'
												: 'border-gray-200 hover:border-gray-300'
									}`}
								>
									<!-- Store logo -->
									<div
										class="absolute top-2 left-2 z-20 flex items-center gap-1 rounded-full bg-white/90 px-1.5 py-0.5 shadow"
									>
										{#if item.logoUrl}
											<img
												src={item.logoUrl}
												alt={item.brandName}
												class="h-5 w-5 rounded-full object-cover"
											/>
										{:else}
											<span class="text-xs">🏪</span>
										{/if}
									</div>

									<!-- Checkbox -->
									<button
										type="button"
										onclick={(e) => {
											e.stopPropagation();
											toggleSelection(item);
										}}
										class={`absolute top-2 right-2 z-20 flex h-6 w-6 items-center justify-center rounded-full border-2 bg-white shadow transition ${
											sel ? 'border-orange-500 bg-orange-500' : 'border-gray-300 hover:border-orange-400'
										}`}
										aria-label="Select item"
									>
										{#if sel}
											<svg
												class="h-4 w-4 text-white"
												fill="none"
												stroke="currentColor"
												viewBox="0 0 24 24"
												stroke-width="3"
											>
												<path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
											</svg>
										{/if}
									</button>

									<!-- Image carousel -->
									<div class="relative aspect-square w-full bg-gray-100">
										{#if imageUrl(item)}
											<img src={imageUrl(item)} alt={item.name} class="h-full w-full object-cover" />
										{:else}
											<div
												class="flex h-full w-full items-center justify-center text-3xl text-gray-300"
											>
												🛒
											</div>
										{/if}
										{#if nImgs > 1}
											<button
												type="button"
												onclick={(e) => {
													e.stopPropagation();
													nextImage(item, -1);
												}}
												class="absolute top-1/2 left-1 z-10 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full bg-black/40 text-white"
												aria-label="Previous image"
											>
												‹
											</button>
											<button
												type="button"
												onclick={(e) => {
													e.stopPropagation();
													nextImage(item, 1);
												}}
												class="absolute top-1/2 right-1 z-10 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full bg-black/40 text-white"
												aria-label="Next image"
											>
												›
											</button>
											<div class="absolute right-0 bottom-1 left-0 z-10 flex justify-center gap-1">
												{#each Array(nImgs) as _, i}
													<span
														class={`h-1.5 rounded-full ${
															(heroImageIndex[k] || 0) === i ? 'w-3 bg-orange-500' : 'w-1.5 bg-black/30'
														}`}
													></span>
												{/each}
											</div>
										{/if}
									</div>

									<!-- Details -->
									<div class="flex flex-1 flex-col gap-1 p-3">
										<p class="line-clamp-2 text-sm font-semibold text-gray-800">{item.name}</p>
										<p class="text-sm font-bold text-gray-900">{formatPrice(item.price)}</p>
										<p class="text-[11px] font-medium text-gray-400">{item.brandName}</p>
										{#if item.adminNote}
											<div
												class="mt-1 max-h-12 overflow-y-auto rounded bg-gray-50 p-1.5 text-[10px] text-gray-500"
											>
												{item.adminNote}
											</div>
										{/if}
										{#if (item.tags || []).length > 0}
											<div class="mt-1 flex flex-wrap gap-1">
												{#each item.tags.slice(0, 4) as tag}
													<span
														class="inline-flex items-center rounded-full bg-violet-100 px-1.5 py-0.5 text-[10px] font-medium text-violet-700"
														>#{tag}</span
													>
												{/each}
												{#if item.tags.length > 4}
													<span class="text-[10px] text-gray-400">+{item.tags.length - 4}</span>
												{/if}
											</div>
										{/if}
									</div>
								</div>
							{/each}
						</div>
					{/if}
				</div>
			</div>
		</div>

		<!-- Floating bulk action bar -->
		{#if selected.size >= 1}
			<div
				class="fixed bottom-6 left-1/2 z-50 flex w-[95%] max-w-xl -translate-x-1/2 items-center justify-between gap-3 rounded-2xl border border-gray-200 bg-white px-4 py-3 shadow-lift"
			>
				<div class="flex items-center gap-3">
					<span
						class="flex h-8 w-8 items-center justify-center rounded-full bg-orange-100 text-orange-600"
						>📌</span
					>
					<div>
						<p class="text-sm font-bold text-gray-900">
							{selected.size} item{selected.size !== 1 ? 's' : ''} selected
						</p>
						<p class="text-xs text-gray-400">
							Mode: <span class="font-semibold text-gray-600">{syncMode}</span>
						</p>
					</div>
				</div>
				<div class="flex items-center gap-2">
					<button
						type="button"
						onclick={handleApplyToSelected}
						disabled={submitting}
						class="rounded-lg bg-orange-500 px-3 py-2 text-sm font-medium text-white hover:bg-orange-600 disabled:opacity-50"
						>Sync Now</button
					>
					<button
						type="button"
						onclick={clearSelection}
						disabled={submitting}
						class="rounded-lg px-2 py-2 text-sm font-medium text-gray-400 hover:text-gray-600"
						>Clear</button
					>
				</div>
			</div>
		{/if}
	</main>
</div>
