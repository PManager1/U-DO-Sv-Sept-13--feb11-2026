<script lang="ts">
	import { onMount } from 'svelte';
	import API_BASE from '$lib/api';

	type ItemImage = { url?: string; size?: string; version?: string; isPrimary?: boolean };
	type ItemCard = {
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
		tags: string[];
	};

	const BASE = API_BASE + 'admin/global-grocery-tag/';

	function goBack() {
		history.back();
	}

	let query = $state('');
	let tagInput = $state('');
	let tagsPool = $state<string[]>([]);
	let filteredTags = $state<string[]>([]);
	let showTagDropdown = $state(false);
	let tagHighlight = $state(-1);

	let results = $state<ItemCard[]>([]);
	let itemCount = $state(0);
	let storeCount = $state(0);
	let loading = $state(false);
	let searching = $state(false);
	let error = $state<string | null>(null);
	let notice = $state<string | null>(null);

	let selected = $state<Set<string>>(new Set());
	let submitting = $state(false);

	let searchTimer: ReturnType<typeof setTimeout> | undefined;

	const allSelected = $derived(results.length > 0 && results.every((r) => selected.has(key(r))));
	const heroImageIndex = $state<Record<string, number>>({});

	function key(item: ItemCard) {
		return `${item.brandId}:${item.aisleIndex}:${item.itemIndex}`;
	}

	async function loadTags() {
		try {
			const res = await fetch(BASE + 'tags');
			if (!res.ok) return;
			const data = await res.json();
			tagsPool = Array.isArray(data.tags) ? data.tags : [];
		} catch {
			tagsPool = [];
		}
	}

	function onTagInput(value: string) {
		tagInput = value;
		const q = value.trim().toLowerCase();
		if (!q) {
			filteredTags = [];
			showTagDropdown = false;
			tagHighlight = -1;
			return;
		}
		const fromPool = tagsPool.filter((t) => t.toLowerCase().includes(q));
		const exact = tagsPool.some((t) => t.toLowerCase() === q);
		const extra = exact ? [] : [value.trim()];
		filteredTags = [...fromPool, ...extra].filter((v, i, a) => a.indexOf(v) === i).slice(0, 20);
		showTagDropdown = filteredTags.length > 0;
		tagHighlight = -1;
	}

	function pickTag(tag: string) {
		tagInput = tag;
		showTagDropdown = false;
	}

	function onTagKeydown(e: KeyboardEvent) {
		if (e.key === 'Enter') {
			e.preventDefault();
			const t = filteredTags[tagHighlight] || tagInput.trim();
			if (t) pickTag(t);
		} else if (e.key === 'Escape') {
			showTagDropdown = false;
		} else if (e.key === 'ArrowDown') {
			e.preventDefault();
			tagHighlight = Math.min(tagHighlight + 1, filteredTags.length - 1);
		} else if (e.key === 'ArrowUp') {
			e.preventDefault();
			tagHighlight = Math.max(tagHighlight - 1, 0);
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
			results = data.items || [];
			itemCount = data.itemCount || results.length;
			storeCount = data.storeCount || 0;
			if (!opts.preserveSelection) selected = new Set();
		} catch (err) {
			error = (err as Error).message;
			results = [];
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
		searchTimer = setTimeout(() => doSearch(value), 350);
	}

	function toggleSelection(item: ItemCard) {
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
			for (const item of results) next.add(key(item));
			selected = next;
		}
	}

	function clearSelection() {
		selected = new Set();
	}

	function imageUrl(item: ItemCard) {
		const imgs = item.images || [];
		if (imgs.length === 0) return '';
		const idx = heroImageIndex[`${item.brandId}:${item.aisleIndex}:${item.itemIndex}`] || 0;
		const img = imgs[Math.min(idx, imgs.length - 1)];
		return img?.url || '';
	}

	function imageCount(item: ItemCard) {
		return (item.images || []).length;
	}

	function nextImage(item: ItemCard, dir: number) {
		const k = `${item.brandId}:${item.aisleIndex}:${item.itemIndex}`;
		const n = imageCount(item);
		if (n <= 1) return;
		const cur = heroImageIndex[k] || 0;
		heroImageIndex[k] = (cur + dir + n) % n;
	}

	async function bulkTagAction(action: 'add' | 'remove') {
		const tag = tagInput.trim();
		error = null;
		notice = null;
		if (!tag) {
			error = 'Type a tag first (or pick one from the dropdown).';
			return;
		}
		if (selected.size === 0) {
			error = 'Select at least one item.';
			return;
		}
		submitting = true;
		try {
			const items = [...selected].map((k) => {
				const [brandId, aisleIndex, itemIndex] = k.split(':');
				return { brandId, aisleIndex: Number(aisleIndex), itemIndex: Number(itemIndex) };
			});
			const res = await fetch(BASE + 'bulk-tag', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ action, tag, items })
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
			notice = `${action === 'add' ? 'Applied' : 'Removed'} tag "${tag}" to ${data.updated} item(s).`;
			await doSearch(query.trim(), { preserveSelection: true });
		} catch (err) {
			error = (err as Error).message;
		} finally {
			submitting = false;
		}
	}

	async function removeSingleTag(item: ItemCard, tag: string) {
		const k = key(item);
		if (!selected.has(k)) selected = new Set([...selected, k]);
		tagInput = tag;
		await bulkTagAction('remove');
		tagInput = '';
	}

	function formatPrice(price: number) {
		return price == null ? '—' : `$${price.toFixed(2)}`;
	}

	onMount(() => {
		loadTags();
		doSearch('');
	});
</script>

<svelte:head><title>Admin · Global Grocery Tags</title></svelte:head>

<div class="min-h-screen bg-gray-50">
	<header class="border-b border-gray-200 bg-white">
		<div class="mx-auto max-w-7xl px-6 py-5">
			<button
				type="button"
				onclick={goBack}
				class="cursor-pointer text-sm font-medium text-orange-500 hover:text-orange-600"
				>← Back</button
			>
			<h1 class="mt-3 text-2xl font-bold text-gray-900">Global Grocery Tag Management</h1>
			<p class="text-sm text-gray-500">
				Search items across all grocery stores, select multiple, and apply or remove tags in bulk.
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

		<!-- Search & tag bar -->
		<div class="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
			<div class="grid gap-4 md:grid-cols-2">
				<div>
					<label class="mb-1 block text-xs font-semibold text-gray-500" for="gq">Search items</label
					>
					<div class="flex items-center gap-2">
						<input
							id="gq"
							type="text"
							value={query}
							oninput={(e) => onQueryInput((e.currentTarget as HTMLInputElement).value)}
							placeholder="e.g. milk, banana, chicken…"
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
				<div class="relative">
					<label class="mb-1 block text-xs font-semibold text-gray-500" for="gt">Add Tag</label>
					<div class="flex items-center gap-2">
						<input
							id="gt"
							type="text"
							value={tagInput}
							oninput={(e) => onTagInput((e.currentTarget as HTMLInputElement).value)}
							onkeydown={onTagKeydown}
							onfocus={() => {
								if (tagInput.trim()) showTagDropdown = true;
							}}
							onblur={() => {
								setTimeout(() => (showTagDropdown = false), 150);
							}}
							placeholder="#Fresh Fruits"
							class="min-w-0 flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-orange-400 focus:outline-none"
						/>
						<button
							type="button"
							onclick={() => bulkTagAction('add')}
							disabled={submitting || !tagInput.trim()}
							class="shrink-0 rounded-lg bg-orange-500 px-4 py-2 text-sm font-medium text-white hover:bg-orange-600 disabled:opacity-50"
							>Apply Tag</button
						>
						<button
							type="button"
							onclick={() => bulkTagAction('remove')}
							disabled={submitting || !tagInput.trim()}
							class="shrink-0 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
							>Remove Tag</button
						>
					</div>
					{#if showTagDropdown && filteredTags.length > 0}
						<div
							class="absolute z-50 mt-1 max-h-48 w-full overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-lg"
						>
							{#each filteredTags as t, i}
								<button
									type="button"
									onmousedown={(e) => {
										e.preventDefault();
										pickTag(t);
									}}
									class={`block w-full px-3 py-2 text-left text-sm ${i === tagHighlight ? 'bg-orange-50 text-orange-700' : 'text-gray-700 hover:bg-gray-50'}`}
									>{t}</button
								>
							{/each}
						</div>
					{/if}
				</div>
			</div>
		</div>

		<!-- Select all + summary -->
		<div class="mt-4 flex flex-wrap items-center justify-between gap-3">
			<label class="flex cursor-pointer items-center gap-2 text-sm font-medium text-gray-700">
				<input
					type="checkbox"
					checked={allSelected}
					onchange={toggleSelectAll}
					class="h-4 w-4 rounded border-gray-300 text-orange-500 focus:ring-orange-400"
				/>
				Select all ({itemCount} item{itemCount !== 1 ? 's' : ''} across {storeCount} store{storeCount !==
				1
					? 's'
					: ''})
			</label>
			{#if selected.size > 0}
				<button
					type="button"
					onclick={clearSelection}
					class="text-sm font-medium text-gray-500 hover:text-gray-700">Clear selection</button
				>
			{/if}
		</div>

		<!-- Loading -->
		{#if loading}
			<div class="mt-6 py-16 text-center text-sm text-gray-400">Loading items…</div>
		{:else if results.length === 0}
			<div
				class="mt-6 rounded-xl border border-dashed border-gray-300 bg-white py-16 text-center text-sm text-gray-400"
			>
				No items found. Try a different search.
			</div>
		{:else}
			<!-- Grid -->
			<div class="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
				{#each results as item (key(item))}
					{@const sel = selected.has(key(item))}
					{@const k = key(item)}
					{@const nImgs = imageCount(item)}
					<div
						onclick={() => toggleSelection(item)}
						class={`relative flex cursor-pointer flex-col overflow-hidden rounded-xl border bg-white transition ${sel ? 'border-orange-500 ring-2 ring-orange-200' : 'border-gray-200 hover:border-gray-300'}`}
					>
						<!-- Store logo overlay -->
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

						<!-- Select checkbox -->
						<button
							type="button"
							onclick={(e) => {
								e.stopPropagation();
								toggleSelection(item);
							}}
							class={`absolute top-2 right-2 z-20 flex h-6 w-6 items-center justify-center rounded-full border-2 bg-white shadow transition ${sel ? 'border-orange-500 bg-orange-500' : 'border-gray-300 hover:border-orange-400'}`}
							aria-label="Select item"
						>
							{#if sel}
								<svg
									class="h-4 w-4 text-white"
									fill="none"
									stroke="currentColor"
									viewBox="0 0 24 24"
									stroke-width="3"
									><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" /></svg
								>
							{/if}
						</button>

						<!-- Image carousel -->
						<div class="relative aspect-square w-full bg-gray-100">
							{#if imageUrl(item)}
								<img src={imageUrl(item)} alt={item.name} class="h-full w-full object-cover" />
							{:else}
								<div class="flex h-full w-full items-center justify-center text-3xl text-gray-300">
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
									aria-label="Previous image">‹</button
								>
								<button
									type="button"
									onclick={(e) => {
										e.stopPropagation();
										nextImage(item, 1);
									}}
									class="absolute top-1/2 right-1 z-10 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full bg-black/40 text-white"
									aria-label="Next image">›</button
								>
								<div class="absolute right-0 bottom-1 left-0 z-10 flex justify-center gap-1">
									{#each Array(nImgs) as _, i}
										<span
											class={`h-1.5 rounded-full ${(heroImageIndex[k] || 0) === i ? 'w-3 bg-orange-500' : 'w-1.5 bg-black/30'}`}
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
							{#if item.description}<p class="line-clamp-1 text-[11px] text-gray-400">
									{item.description}
								</p>{/if}
							<div class="mt-1 flex flex-wrap gap-1">
								{#if (item.tags || []).length === 0}
									<span class="text-[11px] text-gray-300 italic">No tags yet</span>
								{:else}
									{#each item.tags as tag}
										<span
											class="inline-flex items-center gap-1 rounded-full bg-violet-100 px-2 py-0.5 text-[11px] font-medium text-violet-700"
										>
											#{tag}
											<button
												type="button"
												onclick={(e) => {
													e.stopPropagation();
													removeSingleTag(item, tag);
												}}
												class="leading-none font-bold hover:text-violet-900"
												aria-label={`Remove tag ${tag}`}>&times;</button
											>
										</span>
									{/each}
								{/if}
							</div>
						</div>
					</div>
				{/each}
			</div>
		{/if}

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
							Target tag: <span class="font-semibold text-gray-600">{tagInput || '—'}</span>
						</p>
					</div>
				</div>
				<div class="flex items-center gap-2">
					<button
						type="button"
						onclick={() => bulkTagAction('add')}
						disabled={submitting || !tagInput.trim()}
						class="rounded-lg bg-orange-500 px-3 py-2 text-sm font-medium text-white hover:bg-orange-600 disabled:opacity-50"
						>Apply Tag</button
					>
					<button
						type="button"
						onclick={() => bulkTagAction('remove')}
						disabled={submitting || !tagInput.trim()}
						class="rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
						>Remove Tag</button
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
