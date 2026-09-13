<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/state';
	import API_BASE from '$lib/api';
	import tokenManager from '$lib/tokenManager';

	let brandId = $derived(page.params.brandId as string);

	function slugify(name: string) {
		return (name || '').toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
	}
	const MIME_TAG = 'application/x-tag';
	const MIME_CAT = 'application/x-category';

	let categories = $state<any[]>([]); // [{ id, name, tags: [] }]
	let poolTags = $state<string[]>([]);
	let loading = $state(true);
	let error = $state<string | null>(null);
	let newCatName = $state('');
	let newTagName = $state('');
	let jsonInput = $state('');
	let dragCat = $state<number | null>(null);
	let dragTag = $state<{ tag: string; fromCatId: string | null } | null>(null);
	let saving = $state(false);
	let saveMsg = $state<{ type: string; text: string } | null>(null);
	let hasEdited = $state(false);
	let saveTimer: ReturnType<typeof setTimeout> | null = null;
	let lastGood: any = null;
	let brand = $state<any>(null);

	const headers = typeof window !== 'undefined' ? tokenManager.getHeaders() : {};

	onMount(() => {
		let cancelled = false;
		(async () => {
			try {
				const brandRes = await fetch(API_BASE + 'brands/' + brandId, { headers });
				if (brandRes.ok && !cancelled) brand = await brandRes.json();
			} catch {}
			try {
				const treeRes = await fetch(API_BASE + 'brands/' + brandId + '/category-tree', { headers });
				if (treeRes.ok) {
					const tree = await treeRes.json();
					if (cancelled) return;
					const hasCats = Array.isArray(tree.categories) && tree.categories.length > 0;
					const hasTags = Array.isArray(tree.poolTags) && tree.poolTags.length > 0;
					if (hasCats || hasTags) {
						categories = (tree.categories || []).map((c: any, ci: number) => ({ id: c.name + '-' + ci, name: c.name, tags: (c.subcategories || []).map((s: any) => s.name) }));
						poolTags = tree.poolTags || [];
						lastGood = JSON.parse(JSON.stringify({ categories: tree.categories || [], poolTags: tree.poolTags || [] }));
						loading = false;
						return;
					}
				}
				const res = await fetch(API_BASE + 'brands/' + brandId + '/aisles', { headers });
				if (!res.ok) throw new Error('Failed to load store data');
				const data = await res.json();
				if (cancelled) return;
				const aisles = Array.isArray(data.aisles) ? data.aisles : [];
				categories = aisles.map((a: any) => ({ id: a.category || `cat-${Math.random().toString(36).slice(2)}`, name: a.category, tags: [] }));
				const tagSet = new Set<string>();
				aisles.forEach((a: any) => (a.items || []).forEach((it: any) => (it.tags || []).forEach((t: string) => tagSet.add(t))));
				poolTags = [...tagSet];
			} catch (err: any) {
				if (!cancelled) error = err.message;
			} finally {
				if (!cancelled) loading = false;
			}
		})();
		return () => { cancelled = true; };
	});

	function buildPayload() {
		return {
			categories: categories.map((c, ci) => ({
				name: c.name,
				order: ci,
				subcategories: (c.tags || []).map((t: string, ti: number) => ({ name: t, order: ti }))
			})),
			poolTags: poolTags || []
		};
	}
	function isTreeEmpty(payload: any) {
		return (!Array.isArray(payload?.categories) || payload.categories.length === 0) && (!Array.isArray(payload?.poolTags) || payload.poolTags.length === 0);
	}
	async function persistTree(payload: any, opts: { showMsg?: boolean; silent?: boolean } = {}) {
		const { showMsg = false, silent = false } = opts;
		if (silent && isTreeEmpty(payload)) return;
		if (!silent) saving = true;
		if (showMsg) saveMsg = null;
		try {
			const res = await fetch(API_BASE + 'admin/brands/' + brandId + '/category-tree', {
				method: 'PUT',
				headers: { ...tokenManager.getHeaders() },
				body: JSON.stringify(payload)
			});
			if (!res.ok) throw new Error('Failed to save');
			if (!isTreeEmpty(payload)) lastGood = JSON.parse(JSON.stringify(payload));
			if (showMsg) saveMsg = { type: 'success', text: 'Category tree saved' };
		} catch (err: any) {
			if (showMsg) saveMsg = { type: 'error', text: err.message };
			else console.error('Auto-save failed:', err);
		} finally {
			if (!silent) saving = false;
		}
	}
	function markEdited() {
		hasEdited = true;
	}

	$effect(() => {
		if (!hasEdited || loading) return;
		if (saveTimer) clearTimeout(saveTimer);
		saveTimer = setTimeout(() => {
			persistTree(buildPayload(), { silent: true });
		}, 400);
		return () => { if (saveTimer) clearTimeout(saveTimer); };
	});

	async function handleSave() {
		if (loading) return;
		const payload = buildPayload();
		if (isTreeEmpty(payload) && lastGood && !confirm('This will clear the entire category tree. Continue?')) return;
		markEdited();
		if (saveTimer) clearTimeout(saveTimer);
		await persistTree(payload, { showMsg: true });
	}
	function handleRestore() {
		if (!lastGood) return;
		categories = lastGood.categories.map((c: any, ci: number) => ({ id: c.name + '-' + ci, name: c.name, tags: (c.subcategories || []).map((s: any) => s.name) }));
		poolTags = lastGood.poolTags || [];
		saveMsg = { type: 'success', text: 'Restored last saved tree' };
	}
	function normalizeInjected(raw: any) {
		const rawCats = Array.isArray(raw) ? raw : Array.isArray(raw?.categories) ? raw.categories : [];
		const cats = rawCats
			.map((c: any, ci: number) => {
				const name = (c && (c.name || c.category)) || '';
				const subs = (Array.isArray(c.subcategories) ? c.subcategories : []).map((s: any) => (typeof s === 'string' ? s : (s && s.name) || '')).filter(Boolean);
				return { name, order: ci, subcategories: subs.map((n: string, ti: number) => ({ name: n, order: ti })) };
			})
			.filter((c: any) => c.name);
		const pool = Array.isArray(raw) ? [] : Array.isArray(raw?.poolTags) ? raw.poolTags.filter(Boolean) : [];
		return { categories: cats, poolTags: pool };
	}
	async function handleInjectJson() {
		let parsed;
		try {
			parsed = JSON.parse(jsonInput);
		} catch (err: any) {
			saveMsg = { type: 'error', text: 'Invalid JSON: ' + err.message };
			return;
		}
		const cats = Array.isArray(parsed) ? parsed : Array.isArray(parsed?.categories) ? parsed.categories : null;
		if (!cats || cats.length === 0) {
			saveMsg = { type: 'error', text: 'JSON must be an array of categories (or an object with a non-empty "categories" array)' };
			return;
		}
		const payload = normalizeInjected(parsed);
		if (payload.categories.length === 0) {
			saveMsg = { type: 'error', text: 'No valid categories found in JSON' };
			return;
		}
		saving = true;
		saveMsg = null;
		const authHeaders = tokenManager.getHeaders();
		try {
			const res = await fetch(API_BASE + 'admin/brands/' + brandId + '/category-tree', {
				method: 'PUT',
				headers: { ...authHeaders },
				body: JSON.stringify(payload)
			});
			if (!res.ok) {
				const d = await res.json().catch(() => ({}));
				const msg = d.message || d.error || 'Failed to inject';
				throw new Error(res.status === 401 ? msg + ' — you need to be logged in to save.' : `${msg} (${res.status})`);
			}
			const treeRes = await fetch(API_BASE + 'brands/' + brandId + '/category-tree', { headers: { ...authHeaders } });
			if (treeRes.ok) {
				const tree = await treeRes.json();
				categories = (tree.categories || []).map((c: any, ci: number) => ({ id: c.name + '-' + ci, name: c.name, tags: (c.subcategories || []).map((s: any) => s.name) }));
				poolTags = tree.poolTags || [];
			} else {
				categories = payload.categories.map((c: any, ci: number) => ({ id: c.name + '-' + ci, name: c.name, tags: c.subcategories.map((s: any) => s.name) }));
				poolTags = payload.poolTags;
			}
			lastGood = JSON.parse(JSON.stringify(payload));
			hasEdited = false;
			saveMsg = { type: 'success', text: `Injected ${payload.categories.length} categories into DB` };
		} catch (err: any) {
			saveMsg = { type: 'error', text: err.message };
		} finally {
			saving = false;
		}
	}

	function assignTag(catId: string, tag: string) {
		if (!tag) return;
		markEdited();
		categories = categories.map((c) =>
			c.id === catId ? { ...c, tags: c.tags.includes(tag) ? c.tags : [...c.tags, tag] } : { ...c, tags: c.tags.filter((t: string) => t !== tag) }
		);
		poolTags = poolTags.filter((t) => t !== tag);
	}
	function removeFromCategory(catId: string, tag: string) {
		markEdited();
		categories = categories.map((c) => (c.id === catId ? { ...c, tags: c.tags.filter((t: string) => t !== tag) } : c));
		poolTags = poolTags.includes(tag) ? poolTags : [...poolTags, tag];
	}
	function dropTagOn(tag: string, catId: string, toIndex: number) {
		if (!tag) return;
		markEdited();
		poolTags = poolTags.filter((t) => t !== tag);
		categories = categories.map((c) => {
			if (c.id === catId) {
				const without = c.tags.filter((t: string) => t !== tag);
				const tags = [...without];
				const idx = Math.min(toIndex, tags.length);
				tags.splice(idx, 0, tag);
				return { ...c, tags };
			}
			return { ...c, tags: c.tags.filter((t: string) => t !== tag) };
		});
		dragTag = null;
	}
	function onTagDrop(catId: string, e: DragEvent) {
		e.preventDefault();
		const tag = e.dataTransfer?.getData(MIME_TAG) || dragTag?.tag;
		if (tag) assignTag(catId, tag);
	}
	function onCatDrop(targetIdx: number, e: DragEvent) {
		e.preventDefault();
		const from = Number(e.dataTransfer?.getData(MIME_CAT));
		if (!isNaN(from)) moveCategory(from, targetIdx);
		dragCat = null;
	}

	function addCategory() {
		const name = newCatName.trim();
		if (!name) return;
		markEdited();
		categories = [...categories, { id: slugify(name) + '-' + Date.now(), name, tags: [] }];
		newCatName = '';
	}
	function addTag() {
		const name = newTagName.trim();
		if (!name) return;
		markEdited();
		poolTags = poolTags.includes(name) ? poolTags : [...poolTags, name];
		newTagName = '';
	}
	function renameCategory(catId: string, name: string) {
		markEdited();
		categories = categories.map((c) => (c.id === catId ? { ...c, name } : c));
	}
	function deleteCategory(catId: string) {
		markEdited();
		const cat = categories.find((c) => c.id === catId);
		categories = categories.filter((c) => c.id !== catId);
		if (cat && cat.tags.length) poolTags = [...new Set([...poolTags, ...cat.tags])];
	}
	function moveCategory(from: number, to: number) {
		markEdited();
		const next = [...categories];
		if (from === to || from < 0 || to < 0 || from >= next.length || to >= next.length) return;
		const [moved] = next.splice(from, 1);
		next.splice(to, 0, moved);
		categories = next;
	}

	const treeJson = $derived(JSON.stringify(categories.map((c) => ({ category: c.name, subcategories: c.tags })), null, 2));
</script>

<svelte:head><title>Tree Builder · U-DO</title></svelte:head>

<div class="min-h-screen bg-gray-50">
	<header class="bg-white border-b border-gray-200 sticky top-0 z-10">
		<div class="max-w-6xl mx-auto px-6 py-4 flex items-center gap-3">
			<a href={`/admin/GU/${brandId}`} class="w-9 h-9 rounded-xl bg-violet-600 flex items-center justify-center">
				<svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
			</a>
			<div class="flex items-center gap-3">
				{#if brand?.logoUrl}
					<img src={brand.logoUrl} alt={brand?.name || 'Logo'} class="w-11 h-11 rounded-xl object-contain bg-white border border-gray-200 flex-shrink-0" />
				{:else if brand?.name}
					<div class="w-11 h-11 rounded-xl bg-violet-100 flex items-center justify-center text-violet-700 font-bold text-lg flex-shrink-0">{brand.name.charAt(0)}</div>
				{/if}
				<div>
					<h1 class="text-xl font-bold text-gray-900">{brand?.name || 'Tree Builder'}</h1>
					<p class="text-sm text-gray-500">{brandId}</p>
				</div>
			</div>
			<div class="ml-auto flex items-center gap-3">
				{#if saveMsg}<span class={`text-sm font-medium ${saveMsg.type === 'success' ? 'text-green-600' : 'text-red-600'}`}>{saveMsg.text}</span>{/if}
				<button onclick={handleSave} disabled={saving || loading} class="bg-violet-600 hover:bg-violet-700 text-white px-5 py-2 rounded-lg text-sm font-semibold transition disabled:bg-gray-300 disabled:cursor-not-allowed">{saving ? 'Saving...' : 'Save'}</button>
				<button onclick={handleRestore} disabled={!lastGood} title="Undo accidental changes" class="bg-gray-200 hover:bg-gray-300 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium transition disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed">Restore last saved</button>
			</div>
		</div>
	</header>

	<main class="max-w-6xl mx-auto px-6 py-8">
		{#if loading}
			<div class="text-center py-16"><div class="w-10 h-10 border-4 border-violet-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div><p class="text-gray-500">Loading tags & categories…</p></div>
		{:else if error}
			<div class="text-center py-16"><p class="text-red-600 font-semibold">Failed to load data</p><p class="text-sm text-gray-500">{error}</p></div>
		{:else}
			<div class="flex flex-col lg:flex-row gap-6">
				<aside class="lg:w-64 flex-shrink-0">
					<div class="bg-white rounded-2xl border border-gray-200 p-4 sticky top-20">
						<div class="flex items-center justify-between mb-3">
							<h2 class="font-semibold text-gray-900">All Tags</h2>
							<span class="text-xs text-gray-400">{poolTags.length} unassigned</span>
						</div>
						{#if poolTags.length === 0}
							<p class="text-xs text-gray-400">No unassigned tags. Create one below or unassign tags (✕) from categories to return them here.</p>
						{:else}
							<div class="flex flex-wrap gap-2">
								{#each poolTags as tag}
									<span draggable="true" ondragstart={(e) => { e.dataTransfer!.setData(MIME_TAG, tag); dragTag = { tag, fromCatId: null }; }} class="cursor-grab active:cursor-grabbing inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-amber-50 border border-amber-200 text-amber-700 text-xs font-medium select-none hover:bg-amber-100">#{tag}</span>
								{/each}
							</div>
						{/if}
						<div class="mt-4 pt-3 border-t border-gray-100">
							<label class="block text-xs font-semibold text-gray-500 mb-1">Create Tag</label>
							<div class="flex gap-1.5">
								<input type="text" bind:value={newTagName} onkeydown={(e) => { if (e.key === 'Enter') addTag(); }} placeholder="New tag (e.g. Pork)" class="flex-1 min-w-0 border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400" />
								<button onclick={addTag} class="bg-amber-500 hover:bg-amber-600 text-white px-3 py-1.5 rounded-lg text-sm font-medium transition flex-shrink-0">+ Add</button>
							</div>
						</div>
					</div>
				</aside>

				<section class="flex-1 min-w-0 space-y-3">
					<div class="flex items-center justify-between">
						<h2 class="font-semibold text-gray-900">Categories</h2>
						<span class="text-xs text-gray-400">{categories.length} categories · click Save to persist</span>
					</div>

					<div class="bg-white rounded-2xl border border-gray-200 p-3">
						<div class="flex gap-2">
							<input type="text" bind:value={newCatName} onkeydown={(e) => { if (e.key === 'Enter') addCategory(); }} placeholder="New category name (e.g. Meat & Seafood)" class="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400" />
							<button onclick={addCategory} class="bg-violet-600 hover:bg-violet-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition">+ Add Category</button>
						</div>
					</div>

					{#if categories.length === 0}
						<div class="bg-white rounded-2xl border border-dashed border-gray-300 p-8 text-center text-sm text-gray-400">No categories yet. Add one above, then drag tags into it.</div>
					{/if}

					{#each categories as cat, idx}
						<div draggable="true" ondragstart={(e) => { e.dataTransfer!.setData(MIME_CAT, String(idx)); dragCat = idx; }} ondragend={() => (dragCat = null)} ondragover={(e) => e.preventDefault()} ondrop={(e) => onCatDrop(idx, e)} class={`bg-white rounded-2xl border overflow-hidden transition ${dragCat === idx ? 'opacity-40 border-violet-400' : 'border-gray-200'}`}>
							<div class="px-4 py-3 bg-gray-50 border-b border-gray-200 flex items-center gap-2 cursor-grab active:cursor-grabbing">
								<svg class="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" /></svg>
								<input type="text" value={cat.name} oninput={(e) => renameCategory(cat.id, (e.currentTarget as HTMLInputElement).value)} class="flex-1 font-semibold text-gray-900 border border-transparent hover:border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400 bg-transparent" />
								<span class="text-xs text-gray-400">{cat.tags.length} tag{cat.tags.length === 1 ? '' : 's'}</span>
								<button onclick={() => moveCategory(idx, idx - 1)} disabled={idx === 0} class="text-gray-400 hover:text-gray-700 disabled:opacity-30" title="Move up">↑</button>
								<button onclick={() => moveCategory(idx, idx + 1)} disabled={idx === categories.length - 1} class="text-gray-400 hover:text-gray-700 disabled:opacity-30" title="Move down">↓</button>
								<button onclick={() => deleteCategory(cat.id)} class="text-gray-400 hover:text-red-500 text-lg leading-none" title="Delete category">✕</button>
							</div>
							<div ondragover={(e) => e.preventDefault()} ondrop={(e) => onTagDrop(cat.id, e)} class="min-h-[56px] p-3">
								{#if cat.tags.length === 0}
									<p class="text-xs text-gray-300 py-1">Drop tags here</p>
								{:else}
									<div class="flex flex-wrap gap-2">
										{#each cat.tags as tag, ti}
											<span draggable="true" ondragstart={(e) => { e.dataTransfer!.setData(MIME_TAG, tag); dragTag = { tag, fromCatId: cat.id }; }} ondragover={(e) => e.preventDefault()} ondrop={(e) => { e.preventDefault(); e.stopPropagation(); dropTagOn(dragTag?.tag || e.dataTransfer!.getData(MIME_TAG), cat.id, ti); }} ondragend={() => (dragTag = null)} class="cursor-grab active:cursor-grabbing inline-flex items-center gap-1 px-2 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-medium select-none hover:bg-emerald-100">
												<span>#{tag}</span>
												<button onclick={() => removeFromCategory(cat.id, tag)} class="text-emerald-500 hover:text-emerald-700 font-bold leading-none" title="Unassign">✕</button>
											</span>
										{/each}
									</div>
								{/if}
							</div>
						</div>
					{/each}
				</section>
			</div>

			<div class="mt-8">
				<h3 class="font-semibold text-gray-900 mb-2">JSON Output</h3>
				<p class="text-xs text-gray-500 mb-2">Category tree as JSON (updates live as you edit).</p>
				<pre class="bg-gray-900 text-green-300 rounded-xl p-4 text-xs overflow-auto max-h-96">{treeJson}</pre>
			</div>

			<div class="mt-8">
				<h3 class="font-semibold text-gray-900 mb-2">Inject JSON into DB</h3>
				<p class="text-xs text-gray-500 mb-2">Paste a category tree JSON and click Inject to write it straight to the database (replaces the current tree).</p>
				<textarea bind:value={jsonInput} rows={12} placeholder={'{\n  "categories": [\n    { "name": "Dairy & Eggs", "subcategories": ["Milk", "Eggs", "Yogurt"] },\n    { "name": "Meat & Seafood", "subcategories": ["Pork", "Chicken"] }\n  ],\n  "poolTags": ["Butter", "Sour Cream"]\n}'} class="w-full font-mono text-xs bg-gray-900 text-green-300 rounded-xl p-4 border border-gray-800 focus:outline-none focus:ring-2 focus:ring-violet-400"></textarea>
				<button onclick={handleInjectJson} disabled={saving} class="mt-3 bg-violet-600 hover:bg-violet-700 text-white px-5 py-2 rounded-lg text-sm font-semibold transition disabled:bg-gray-300 disabled:cursor-not-allowed">{saving ? 'Injecting...' : 'Inject into DB'}</button>
			</div>
		{/if}
	</main>
</div>
