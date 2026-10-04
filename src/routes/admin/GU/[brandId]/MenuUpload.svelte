<script lang="ts">
	// Restaurant / local-business menu upload. Separate from the grocery Upload JSON tab:
	// a save always replaces the brand's whole menu (PUT admin/brands/:id/menu → Udo.Menus.import_menu).
	import { onMount } from 'svelte';
	import API_BASE from '$lib/api';

	let { brandId, headers }: { brandId: string; headers: Record<string, string> } = $props();

	type Section = { category: string; items: any[] };
	type Warning = { type: string; section: string; name?: string; differs?: string[]; kept?: any; dropped?: any; text?: string };

	let saved = $state<Section[] | null>(null);
	let savedError = $state<string | null>(null);
	let preview = $state<Section[] | null>(null);
	let fileName = $state('');
	let pasteText = $state('');
	let parseError = $state<string | null>(null);
	let dragOver = $state(false);
	let expanded = $state<Record<number, boolean>>({});
	let showIdentical = $state(false);
	let saving = $state(false);
	let deleting = $state(false);
	let toast = $state<{ type: 'success' | 'error'; text: string } | null>(null);

	const COMPARED = ['price', 'description', 'image', 'modifier_data', 'available'] as const;

	onMount(loadSaved);

	$effect(() => {
		if (!toast) return;
		const t = setTimeout(() => (toast = null), 5000);
		return () => clearTimeout(t);
	});

	async function loadSaved() {
		savedError = null;
		try {
			const res = await fetch(`${API_BASE}admin/brands/${brandId}/menu`, { headers });
			if (!res.ok) throw new Error(`menu fetch ${res.status}`);
			const data = await res.json();
			saved = Array.isArray(data?.menu) ? data.menu : [];
		} catch (err: any) {
			savedError = err.message;
			saved = [];
		}
	}

	// Same rule as the backend's slugify, so preview warnings match what the save will report.
	function slugify(text: string) {
		return String(text ?? '')
			.toLowerCase()
			.replace(/[^a-z0-9\s-]/g, '')
			.replace(/[\s-]+/g, '_')
			.replace(/^_+|_+$/g, '');
	}

	function sectionName(value: any) {
		const name = String(value ?? '').trim();
		return name || 'Menu';
	}

	// Accepts { menu: [...] }, { aisles: [...] }, a bare list of sections, or a flat { items: [{ category, ... }] }.
	function toSections(raw: any): Section[] {
		const list = Array.isArray(raw) ? raw : raw?.menu ?? raw?.aisles;
		if (Array.isArray(list) && list.some((s: any) => Array.isArray(s?.items))) {
			return list.map((s: any) => ({ category: s?.category ?? s?.name ?? '', items: Array.isArray(s?.items) ? s.items : [] }));
		}
		const items = Array.isArray(raw?.items) ? raw.items : Array.isArray(raw) ? raw : [];
		const groups = new Map<string, any[]>();
		for (const item of items) {
			const key = sectionName(item?.category);
			if (!groups.has(key)) groups.set(key, []);
			groups.get(key)!.push(item);
		}
		return [...groups].map(([category, items]) => ({ category, items }));
	}

	function itemFields(item: any) {
		const price = typeof item?.price === 'number' ? item.price : parseFloat(item?.price);
		return {
			price: Number.isFinite(price) ? price : null,
			description: String(item?.description ?? '').trim(),
			image: item?.raw_image_url || item?.image_url || item?.imageUrl || null,
			modifier_data: item?.modifier_data && (Array.isArray(item.modifier_data) ? item.modifier_data.length : Object.keys(item.modifier_data).length) ? item.modifier_data : null,
			available: item?.available !== false
		};
	}

	function modifierGroups(item: any): any[] {
		const m = item?.modifier_data;
		if (Array.isArray(m)) return m;
		return Array.isArray(m?.groups) ? m.groups : [];
	}

	function same(a: any, b: any) {
		return JSON.stringify(a) === JSON.stringify(b);
	}

	// Mirrors Udo.Menus.build_menu: merge same-slug sections, keep the first copy of each item id.
	const analysis = $derived.by(() => {
		if (!preview) return null;
		const warnings: Warning[] = [];
		const sections: { name: string; items: any[]; modifiers: number }[] = [];
		const bySlug = new Map<string, number>();
		const kept = new Map<string, any>();

		for (const s of preview) {
			const name = sectionName(s.category);
			if (!String(s.category ?? '').trim()) warnings.push({ type: 'blank_section', section: name, text: 'A section has no name; its items go under "Menu".' });
			const slug = slugify(name) || 'menu';
			let idx = bySlug.get(slug);
			if (idx === undefined) {
				idx = sections.length;
				bySlug.set(slug, idx);
				sections.push({ name, items: [], modifiers: 0 });
			} else {
				warnings.push({ type: 'merged_section', section: name, text: `"${name}" appears more than once; its items are merged into the first one.` });
			}
			const target = sections[idx];

			for (const item of s.items) {
				const name = String(item?.name ?? '').trim();
				if (!slugify(name)) {
					warnings.push({ type: 'no_name', section: target.name, text: `An item in "${target.name}" has no name and will be skipped.` });
					continue;
				}
				const id = `${slug}_${slugify(name)}`;
				const fields = itemFields(item);
				const first = kept.get(id);
				if (first) {
					const differs = COMPARED.filter((f) => !same(first[f], fields[f]));
					warnings.push({
						type: 'duplicate',
						section: target.name,
						name,
						differs,
						kept: Object.fromEntries(differs.map((f) => [f, first[f]])),
						dropped: Object.fromEntries(differs.map((f) => [f, fields[f]]))
					});
					continue;
				}
				kept.set(id, fields);
				if (fields.price === null) warnings.push({ type: 'no_price', section: target.name, name, text: `"${name}" has no price.` });
				if (!fields.image) warnings.push({ type: 'no_image', section: target.name, name, text: `"${name}" has no image.` });
				if (fields.modifier_data) target.modifiers++;
				target.items.push(item);
			}
		}

		const duplicates = warnings.filter((w) => w.type === 'duplicate');
		return {
			sections,
			itemCount: sections.reduce((n, s) => n + s.items.length, 0),
			duplicates,
			identical: duplicates.filter((w) => w.differs!.length === 0),
			differing: duplicates.filter((w) => w.differs!.length > 0),
			other: warnings.filter((w) => w.type !== 'duplicate')
		};
	});

	function parse(text: string, name = '') {
		parseError = null;
		let raw;
		try {
			raw = JSON.parse(text);
		} catch (err: any) {
			parseError = 'Invalid JSON: ' + err.message;
			return;
		}
		const sections = toSections(raw);
		if (!sections.some((s) => s.items.length > 0)) {
			parseError = 'No menu items found. Expected { "menu": [{ "category": "...", "items": [...] }] }.';
			return;
		}
		preview = sections;
		fileName = name;
		expanded = {};
		showIdentical = false;
	}

	function readFile(file: File | undefined) {
		if (!file) return;
		const reader = new FileReader();
		reader.onload = () => parse(String(reader.result), file.name);
		reader.readAsText(file);
	}

	function onFile(e: Event) {
		const el = e.currentTarget as HTMLInputElement;
		readFile(el.files?.[0]);
		el.value = '';
	}

	function onDrop(e: DragEvent) {
		e.preventDefault();
		dragOver = false;
		readFile(e.dataTransfer?.files?.[0]);
	}

	function cancelPreview() {
		preview = null;
		fileName = '';
		parseError = null;
	}

	async function saveMenu() {
		if (!preview || !analysis) return;
		const msg = `Replace the whole menu with ${analysis.sections.length} sections and ${analysis.itemCount} items? Items not in this file will be removed.`;
		if (!confirm(msg)) return;
		saving = true;
		try {
			const res = await fetch(`${API_BASE}admin/brands/${brandId}/menu`, {
				method: 'PUT',
				headers: { ...headers, 'Content-Type': 'application/json' },
				body: JSON.stringify({ menu: preview })
			});
			const data = await res.json().catch(() => ({}));
			if (res.ok) {
				const dups = (data.warnings || []).filter((w: any) => w.type === 'duplicate').length;
				toast = {
					type: 'success',
					text: `Saved ${data.sections} sections, ${data.items} items${dups ? ` · skipped ${dups} duplicate${dups === 1 ? '' : 's'}` : ''}.`
				};
				cancelPreview();
				await loadSaved();
			} else {
				toast = { type: 'error', text: data.error || `Save failed (${res.status})` };
			}
		} catch (err: any) {
			toast = { type: 'error', text: 'Network error: ' + err.message };
		} finally {
			saving = false;
		}
	}

	async function deleteAll() {
		if (!confirm('Delete the whole menu for this store, including its uploaded images? This cannot be undone.')) return;
		deleting = true;
		try {
			const res = await fetch(`${API_BASE}admin/brands/${brandId}/products`, { method: 'DELETE', headers });
			const data = await res.json().catch(() => ({}));
			if (res.ok) {
				toast = { type: 'success', text: `Deleted ${data.products_unlinked ?? 0} item(s) and ${data.images_deleted ?? 0} image(s).` };
				await loadSaved();
			} else {
				toast = { type: 'error', text: data.error || `Delete failed (${res.status})` };
			}
		} catch (err: any) {
			toast = { type: 'error', text: 'Network error: ' + err.message };
		} finally {
			deleting = false;
		}
	}

	function money(v: any) {
		return typeof v === 'number' ? `$${v.toFixed(2)}` : '—';
	}

	function showValue(field: string, v: any) {
		if (v === null || v === undefined || v === '') return '(empty)';
		if (field === 'price') return String(v);
		if (field === 'modifier_data') return `${modifierGroups({ modifier_data: v }).length} modifier group(s)`;
		if (field === 'image') return String(v).split('/').slice(-2).join('/');
		return String(v);
	}
</script>

{#if toast}
	<div class="fixed bottom-4 right-4 z-50 max-w-md px-4 py-3 rounded-xl shadow-lg text-sm font-medium {toast.type === 'error' ? 'bg-red-600 text-white' : 'bg-green-600 text-white'}">{toast.text}</div>
{/if}

<div class="space-y-6">
	<!-- Upload -->
	<div class="bg-white rounded-xl border border-gray-200 p-5">
		<h2 class="font-semibold text-gray-900">Upload menu</h2>
		<p class="text-xs text-gray-500 mt-1">
			Sections come from each item's <code>category</code> in the file, in file order. Saving replaces the whole menu.
		</p>
		<div
			role="region"
			aria-label="Drop a menu JSON file"
			ondragover={(e) => { e.preventDefault(); dragOver = true; }}
			ondragleave={() => (dragOver = false)}
			ondrop={onDrop}
			class={`mt-4 border-2 border-dashed rounded-xl p-6 text-center transition ${dragOver ? 'border-violet-400 bg-violet-50' : 'border-gray-300'}`}
		>
			<p class="text-sm text-gray-600">Drop a menu JSON file here</p>
			<label class="inline-block mt-3 cursor-pointer bg-violet-600 hover:bg-violet-700 text-white px-4 py-2 rounded-lg text-sm font-medium">
				Choose file
				<input type="file" accept=".json,application/json" class="hidden" onchange={onFile} />
			</label>
		</div>
		<details class="mt-3">
			<summary class="text-xs text-gray-500 cursor-pointer">…or paste JSON</summary>
			<textarea bind:value={pasteText} rows={6} placeholder={'{"menu":[{"category":"Burgers","items":[{"name":"...","price":9.99}]}]}'} class="mt-2 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-violet-400"></textarea>
			<button onclick={() => parse(pasteText, 'pasted JSON')} class="mt-2 bg-gray-700 hover:bg-gray-800 text-white px-3 py-1.5 rounded-lg text-xs font-semibold">Parse</button>
		</details>
		{#if parseError}<p class="mt-3 text-sm text-red-600">{parseError}</p>{/if}
	</div>

	{#if preview && analysis}
		<!-- Preview of the new menu -->
		<div class="bg-white rounded-xl border border-violet-200 overflow-hidden">
			<div class="px-5 py-3 bg-violet-50 border-b border-violet-100 flex flex-wrap items-center gap-2">
				<div class="mr-auto">
					<h2 class="font-semibold text-gray-900">New menu preview</h2>
					<p class="text-xs text-gray-500">
						{fileName} · {analysis.sections.length} sections · {analysis.itemCount} items
						{#if analysis.duplicates.length}· {analysis.duplicates.length} duplicates: {analysis.identical.length} identical, {analysis.differing.length} differ{/if}
					</p>
				</div>
				<button onclick={cancelPreview} class="bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 px-3 py-1.5 rounded-lg text-xs font-semibold">Cancel</button>
				<button onclick={saveMenu} disabled={saving} class="bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-400 text-white px-3 py-1.5 rounded-lg text-xs font-semibold">
					{saving ? 'Saving…' : 'Save menu (replaces current)'}
				</button>
			</div>

			{#if analysis.differing.length}
				<div class="px-5 py-3 border-b border-amber-100 bg-amber-50">
					<p class="text-xs font-semibold text-amber-800">Copies that differ: the first version is kept, these values are dropped</p>
					<table class="mt-2 w-full text-xs">
						<thead class="text-left text-gray-500">
							<tr><th class="py-1 pr-3 font-medium">Item</th><th class="py-1 pr-3 font-medium">Field</th><th class="py-1 pr-3 font-medium">Kept</th><th class="py-1 font-medium">Dropped</th></tr>
						</thead>
						<tbody>
							{#each analysis.differing as w}
								{#each w.differs ?? [] as field, i}
									<tr class="border-t border-amber-100 align-top">
										<td class="py-1 pr-3 text-gray-800">{#if i === 0}{w.section} / {w.name}{/if}</td>
										<td class="py-1 pr-3 text-gray-500">{field}</td>
										<td class="py-1 pr-3 text-gray-800 break-all">{showValue(field, w.kept?.[field])}</td>
										<td class="py-1 text-red-700 break-all">{showValue(field, w.dropped?.[field])}</td>
									</tr>
								{/each}
							{/each}
						</tbody>
					</table>
				</div>
			{/if}

			{#if analysis.identical.length}
				<div class="px-5 py-2 border-b border-gray-100 bg-gray-50">
					<button onclick={() => (showIdentical = !showIdentical)} class="text-xs font-semibold text-gray-600">
						{showIdentical ? '▾' : '▸'} Exact copies (will be skipped): {analysis.identical.length}
					</button>
					{#if showIdentical}
						<ul class="mt-1 text-xs text-gray-500 list-disc pl-5">
							{#each analysis.identical as w}<li>{w.section} / {w.name}</li>{/each}
						</ul>
					{/if}
				</div>
			{/if}

			{#if analysis.other.length}
				<div class="px-5 py-2 border-b border-gray-100">
					<p class="text-xs font-semibold text-gray-600">Other warnings ({analysis.other.length})</p>
					<ul class="mt-1 text-xs text-gray-500 list-disc pl-5 max-h-32 overflow-y-auto">
						{#each analysis.other as w}<li>{w.text}</li>{/each}
					</ul>
				</div>
			{/if}

			<div class="divide-y divide-gray-100">
				{#each analysis.sections as section, si}
					<div>
						<button onclick={() => (expanded = { ...expanded, [si]: !expanded[si] })} class="w-full px-5 py-3 flex items-center gap-3 text-left hover:bg-gray-50">
							<span class="text-gray-400 w-4">{expanded[si] ? '▾' : '▸'}</span>
							<span class="text-xs text-gray-400 w-6">{si + 1}</span>
							<span class="font-semibold text-gray-900">{section.name}</span>
							<span class="ml-auto text-xs text-gray-500">{section.items.length} items{#if section.modifiers} · {section.modifiers} with modifiers{/if}</span>
						</button>
						{#if expanded[si]}
							<div class="px-5 pb-3 space-y-2">
								{#each section.items as item}
									{@const img = item.raw_image_url || item.image_url || item.imageUrl}
									{@const groups = modifierGroups(item)}
									<div class="flex gap-3 p-2 bg-gray-50 rounded-lg text-xs">
										{#if img}
											<img src={img} alt="" referrerpolicy="no-referrer" class="w-12 h-12 object-cover rounded bg-white flex-shrink-0" />
										{:else}
											<div class="w-12 h-12 rounded bg-gray-200 flex-shrink-0"></div>
										{/if}
										<div class="min-w-0 flex-1">
											<div class="flex gap-2">
												<span class="font-semibold text-gray-800">{item.name}</span>
												<span class="ml-auto text-gray-700">{money(itemFields(item).price)}</span>
											</div>
											{#if item.description}<p class="text-gray-500 line-clamp-2">{item.description}</p>{/if}
											{#if groups.length}
												<p class="text-violet-700 mt-0.5">
													{#each groups as g, gi}{gi ? ' · ' : ''}{g.name} ({(g.options || []).length}){/each}
												</p>
											{/if}
										</div>
									</div>
								{/each}
							</div>
						{/if}
					</div>
				{/each}
			</div>
		</div>
	{/if}

	<!-- Current saved menu -->
	<div class="bg-white rounded-xl border border-gray-200 overflow-hidden">
		<div class="px-5 py-3 bg-gray-50 border-b border-gray-200 flex flex-wrap items-center gap-2">
			<h2 class="font-semibold text-gray-900 mr-auto">
				Current menu
				{#if saved}<span class="text-xs font-normal text-gray-500">· {saved.length} sections · {saved.reduce((n, s) => n + s.items.length, 0)} items</span>{/if}
			</h2>
			<a href={`http://localhost:4000/store/${brandId}`} target="_blank" rel="noopener noreferrer" class="bg-gray-600 hover:bg-gray-700 text-white px-3 py-1.5 rounded-lg text-xs font-semibold">🌐 View store</a>
			<button onclick={deleteAll} disabled={deleting || !saved?.length} class="bg-red-600 hover:bg-red-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white px-3 py-1.5 rounded-lg text-xs font-semibold">
				{deleting ? 'Deleting…' : 'Delete all'}
			</button>
		</div>
		{#if savedError}
			<p class="px-5 py-4 text-sm text-red-600">Could not load the saved menu: {savedError}</p>
		{:else if saved === null}
			<p class="px-5 py-4 text-sm text-gray-400">Loading…</p>
		{:else if saved.length === 0}
			<p class="px-5 py-4 text-sm text-gray-400">No menu saved yet. Upload a file above.</p>
		{:else}
			<ol class="divide-y divide-gray-100">
				{#each saved as section, si}
					<li class="px-5 py-2 flex items-center gap-3 text-sm">
						<span class="text-xs text-gray-400 w-6">{si + 1}</span>
						<span class="text-gray-900">{section.category}</span>
						<span class="ml-auto text-xs text-gray-500">
							{section.items.length} items
							{#if section.items.some((i: any) => i.modifier_data)} · {section.items.filter((i: any) => i.modifier_data).length} with modifiers{/if}
							{#if section.items.some((i: any) => !i.available)} · {section.items.filter((i: any) => !i.available).length} unavailable{/if}
						</span>
					</li>
				{/each}
			</ol>
		{/if}
	</div>
</div>
