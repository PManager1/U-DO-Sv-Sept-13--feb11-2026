<script lang="ts">
	import { onMount } from 'svelte';
	import API_BASE from '$lib/api';

	let { bid, brand } = $props();

	let parsedData = $state<any>(null);
	let editingData = $state<any>(null);
	let error = $state<string | null>(null);
	let dragOver = $state(false);
	let saving = $state(false);
	let deleting = $state(false);
	let toast = $state<{ type: string; message: string } | null>(null);
	let validationResults = $state<any[]>([]);
	let hasExistingData = $state(false);
	let expandedCats = $state<Record<number, boolean>>({});
	let menuOnlineIssues = $state(brand?.menuOnlineIssues || false);
	let savingIssues = $state(false);
	let scrapeLink = $state(brand?.scrapeLink || '');
	let savingScrapeLink = $state(false);
	let scrapeLinkSaved = $state(false);

	const isValid = validationResults.length > 0 && validationResults.every((r) => r.status !== 'error');

	$effect(() => {
		if (!brand) return;
		menuOnlineIssues = brand.menuOnlineIssues || false;
		scrapeLink = brand.scrapeLink || '';
	});

	onMount(() => {
		fetch(API_BASE + `brands/${bid}/menuOnline`)
			.then((r) => r.json())
			.then((data) => {
				if (data.menu && data.menu.length > 0) {
					parsedData = data;
					hasExistingData = true;
					editingData = JSON.parse(JSON.stringify(data));
					validateData(data);
				}
			})
			.catch(() => {});
	});

	function runValidation(data: any) {
		const results: any[] = [];
		if (!data.menu || !Array.isArray(data.menu) || data.menu.length === 0) {
			results.push({ field: 'menu', status: 'error', message: 'menu must be a non-empty array' });
			return results;
		}
		results.push({ field: 'menu', status: 'success', message: `${data.menu.length} categor${data.menu.length === 1 ? 'y' : 'ies'}` });
		let totalItems = 0;
		for (const [ci, cat] of data.menu.entries()) {
			if (cat.category && cat.category.trim()) results.push({ categoryIndex: ci, field: `cat_${ci}`, status: 'success', message: cat.category });
			else results.push({ categoryIndex: ci, field: `cat_${ci}`, status: 'error', message: 'Category name is missing' });
			if (!cat.items || !Array.isArray(cat.items) || cat.items.length === 0) {
				results.push({ categoryIndex: ci, field: `cat_${ci}_items`, status: 'error', message: 'No items in this category' });
				continue;
			}
			for (const [ii, item] of cat.items.entries()) {
				let itemOk = true;
				if (!item.name || !item.name.trim()) { results.push({ categoryIndex: ci, itemIndex: ii, status: 'error', message: `Item ${ii + 1}: name is missing` }); itemOk = false; }
				if (item.price === undefined || item.price === null || Number(item.price) <= 0) { results.push({ categoryIndex: ci, itemIndex: ii, status: 'error', message: `${cat.category} > "${item.name}" (Item ${ii + 1}): price must be > 0 (got ${item.price})` }); itemOk = false; }
				if (typeof item.available !== 'boolean') { results.push({ categoryIndex: ci, itemIndex: ii, status: 'error', message: `${cat.category} > "${item.name}" (Item ${ii + 1}): available must be a boolean` }); itemOk = false; }
				if (!item.raw_image_url || !item.raw_image_url.trim()) { results.push({ categoryIndex: ci, itemIndex: ii, status: 'warning', message: `${cat.category} > "${item.name}" (Item ${ii + 1}): image URL missing` }); }
				if (itemOk) results.push({ categoryIndex: ci, itemIndex: ii, status: 'success', message: `${cat.category} > ${item.name}` });
				totalItems++;
			}
		}
		results.push({ status: 'info', message: `${totalItems} total item${totalItems === 1 ? '' : 's'}` });
		return results;
	}

	function validateData(data: any) {
		validationResults = runValidation(data);
	}

	const summary = $derived.by(() => {
		if (!editingData?.menu) return null;
		const cats = editingData.menu;
		const allItems = cats.flatMap((c: any) => c.items || []);
		const prices = allItems.map((i: any) => Number(i.price)).filter((p: number) => p > 0);
		return {
			categoryCount: cats.length,
			totalItems: allItems.length,
			minPrice: prices.length > 0 ? Math.min(...prices) : null,
			maxPrice: prices.length > 0 ? Math.max(...prices) : null,
			categories: cats.map((c: any) => ({ name: c.category || 'Unnamed', count: (c.items || []).length }))
		};
	});

	function handleFile(file: File) {
		error = null;
		const reader = new FileReader();
		reader.onload = (e) => {
			try {
				const data = JSON.parse(String(e.target?.result));
				parsedData = data;
				editingData = JSON.parse(JSON.stringify(data));
				validateData(data);
			} catch (err: any) {
				error = 'Invalid JSON file: ' + err.message;
			}
		};
		reader.onerror = () => (error = 'Failed to read file');
		reader.readAsText(file);
	}

	function handleDrop(e: DragEvent) {
		e.preventDefault();
		dragOver = false;
		const file = e.dataTransfer?.files[0];
		if (file) handleFile(file);
	}

	function handleFileInput(e: Event) {
		const file = (e.currentTarget as HTMLInputElement).files?.[0];
		if (file) handleFile(file);
		(e.currentTarget as HTMLInputElement).value = '';
	}

	function handleClear() {
		parsedData = null;
		error = null;
		toast = null;
		validationResults = [];
		expandedCats = {};
		hasExistingData = false;
		editingData = null;
	}

	function updateCategoryName(ci: number, name: string) {
		editingData = { ...editingData, menu: editingData.menu.map((c: any, i: number) => (i === ci ? { ...c, category: name } : c)) };
	}
	function updateItemField(ci: number, ii: number, field: string, value: any) {
		editingData = {
			...editingData,
			menu: editingData.menu.map((c: any, i: number) => (i === ci ? { ...c, items: c.items.map((it: any, j: number) => (j === ii ? { ...it, [field]: value } : it)) } : c))
		};
	}
	function deleteItem(ci: number, ii: number) {
		if (!confirm('Delete this item?')) return;
		editingData = { ...editingData, menu: editingData.menu.map((c: any, i: number) => (i === ci ? { ...c, items: c.items.filter((_: any, j: number) => j !== ii) } : c)) };
	}
	function addItem(ci: number) {
		editingData = { ...editingData, menu: editingData.menu.map((c: any, i: number) => (i === ci ? { ...c, items: [...c.items, { name: '', price: 0, available: true, raw_image_url: '', description: '' }] } : c)) };
	}
	function deleteCategory(ci: number) {
		if (!confirm('Delete this category and all its items?')) return;
		editingData = { ...editingData, menu: editingData.menu.filter((_: any, i: number) => i !== ci) };
	}
	function addCategory() {
		editingData = { ...editingData, menu: [...editingData.menu, { category: 'New Category', items: [] }] };
	}

	function showToast(type: string, message: string) {
		toast = { type, message };
		setTimeout(() => (toast = null), 3000);
	}

	async function saveMenuOnlineIssues() {
		savingIssues = true;
		try {
			await fetch(API_BASE + `admin/brands/${bid}`, {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ menuOnlineIssues })
			});
		} catch (err) {
			console.error('Failed to save:', err);
		} finally {
			savingIssues = false;
		}
	}

	async function saveScrapeLink() {
		savingScrapeLink = true;
		scrapeLinkSaved = false;
		try {
			const res = await fetch(API_BASE + `admin/brands/${bid}`, {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ scrapeLink })
			});
			if (res.ok) {
				scrapeLinkSaved = true;
				setTimeout(() => (scrapeLinkSaved = false), 2000);
			}
		} catch (err) {
			console.error('Failed to save scrape link:', err);
		} finally {
			savingScrapeLink = false;
		}
	}

	async function handleSave() {
		const results = runValidation(editingData);
		validationResults = results;
		saving = true;
		toast = null;
		try {
			const res = await fetch(API_BASE + `admin/brands/${bid}/menuOnline`, {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ menu: editingData.menu })
			});
			if (res.ok) {
				const extraFields: Record<string, any> = {};
				if (editingData.restaurant?.logo_image) extraFields.logoUrl = editingData.restaurant.logo_image;
				else if (editingData.logoUrl) extraFields.logoUrl = editingData.logoUrl;
				if (editingData.restaurant?.banner_image) { extraFields.bannerUrl = editingData.restaurant.banner_image; extraFields.carouselImages = [editingData.restaurant.banner_image]; }
				else if (editingData.bannerUrl) { extraFields.bannerUrl = editingData.bannerUrl; extraFields.carouselImages = [editingData.bannerUrl]; }
				if (editingData.restaurant?.scrapeLink) extraFields.scrapeLink = editingData.restaurant.scrapeLink;
				else if (editingData.restaurant?.scrape_link) extraFields.scrapeLink = editingData.restaurant.scrape_link;
				else if (editingData.scrapeLink) extraFields.scrapeLink = editingData.scrapeLink;
				if (editingData.restaurant?.hours) extraFields.hoursRaw = editingData.restaurant.hours;
				if (editingData.restaurant?.name) extraFields.name = editingData.restaurant.name;
				if (Object.keys(extraFields).length > 0) {
					fetch(API_BASE + `admin/brands/${bid}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(extraFields) }).catch((err) => console.error('Failed to update brand images:', err));
				}
				showToast('success', 'Menu Online saved successfully');
				const saved = JSON.parse(JSON.stringify(editingData));
				parsedData = saved;
				hasExistingData = true;
			} else {
				const text = await res.text();
				let msg;
				try { const p = JSON.parse(text); msg = p.error || p.message || text; } catch { msg = text; }
				showToast('error', msg);
			}
		} catch (err: any) {
			showToast('error', 'Network error: ' + err.message);
		} finally {
			saving = false;
		}
	}

	async function handleDelete() {
		if (!confirm('Delete all menu online data for this brand? This cannot be undone.')) return;
		deleting = true;
		try {
			const res = await fetch(API_BASE + `admin/brands/${bid}/menuOnline`, { method: 'DELETE' });
			if (res.ok) {
				fetch(API_BASE + `admin/brands/${bid}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ hoursRaw: '' }) }).catch(() => {});
				showToast('success', 'Menu Online data deleted');
				handleClear();
			} else {
				const text = await res.text();
				let msg;
				try { const p = JSON.parse(text); msg = p.error || p.message || text; } catch { msg = text; }
				showToast('error', msg);
			}
		} catch (err: any) {
			showToast('error', 'Network error: ' + err.message);
		} finally {
			deleting = false;
		}
	}

	function highlight(json: string) {
		return json
			.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
			.replace(/("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g, (match) => {
				let cls = 'text-amber-600';
				if (/^"/.test(match)) cls = /:$/.test(match) ? 'text-sky-700' : 'text-green-600';
				else if (/true|false/.test(match)) cls = 'text-purple-600';
				else if (/null/.test(match)) cls = 'text-gray-400';
				return `<span class="${cls}">${match}</span>`;
			});
	}

	const webHref = brand?.brandType === 'grocery' ? `/gstore/${bid}` : `/store/${bid}`;
</script>

<div class="space-y-6">
	<!-- Issues checkbox -->
	<div class="flex items-center gap-3 pb-3">
		<label class="flex items-center gap-2 cursor-pointer">
			<input type="checkbox" bind:checked={menuOnlineIssues} onchange={() => setTimeout(saveMenuOnlineIssues, 100)} class="w-4 h-4 rounded border-gray-300 text-violet-600 focus:ring-violet-400" />
			<span class="text-sm text-gray-600">Issues with Menu Online</span>
		</label>
	</div>

	{#if !parsedData}
		<div
			ondrop={handleDrop}
			ondragover={(e) => { e.preventDefault(); dragOver = true; }}
			ondragleave={() => (dragOver = false)}
			class={`bg-white rounded-xl border-2 border-dashed p-10 text-center transition-colors ${dragOver ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'}`}
		>
			<div class="text-4xl mb-3">📄</div>
			<p class="text-sm font-medium text-gray-700 mb-1">Drop a JSON file here</p>
			<p class="text-xs text-gray-400 mb-4">or click to browse files</p>
			<label class="inline-block cursor-pointer bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition">
				Browse Files
				<input type="file" accept=".json" class="hidden" onchange={handleFileInput} />
			</label>
		</div>
	{:else}
		{#if hasExistingData}
			<div class="bg-blue-50 border border-blue-200 rounded-xl p-3 text-sm text-blue-700 flex items-center gap-2">
				<span>📦</span> Loaded from database
				<button onclick={handleClear} class="underline ml-auto text-xs">Start fresh</button>
			</div>
		{/if}

		{#if summary}
			<div class="bg-white rounded-xl border border-gray-200 p-5">
				<div class="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
					<div><div class="text-2xl font-bold text-gray-900">{summary.categoryCount}</div><div class="text-xs text-gray-500">Categories</div></div>
					<div><div class="text-2xl font-bold text-gray-900">{summary.totalItems}</div><div class="text-xs text-gray-500">Items</div></div>
					<div><div class="text-2xl font-bold text-green-600">${summary.minPrice?.toFixed(2)}</div><div class="text-xs text-gray-500">Min Price</div></div>
					<div><div class="text-2xl font-bold text-blue-600">${summary.maxPrice?.toFixed(2)}</div><div class="text-xs text-gray-500">Max Price</div></div>
				</div>
				<div class="mt-3 flex flex-wrap gap-2">
					{#each summary.categories as c, i}
						<span class="text-xs bg-gray-100 text-gray-700 px-2.5 py-1 rounded-full">{c.name} ({c.count})</span>
					{/each}
				</div>
			</div>
		{/if}

		{#if parsedData}
			<div class="bg-white rounded-xl border border-gray-200 overflow-hidden">
				<div class="px-5 py-3 bg-gray-50 flex items-center gap-3">
					<a href={webHref} target="_blank" rel="noopener noreferrer" class="bg-gray-600 hover:bg-gray-700 text-white text-sm font-semibold px-5 py-2 rounded-lg transition flex items-center gap-2">🌐 Web</a>
					<button onclick={() => {}} class="bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold px-5 py-2 rounded-lg transition flex items-center gap-2">🖼️ Save Images to GC</button>
					<span class="flex-1" />
					<button onclick={handleSave} disabled={saving} class="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold px-5 py-2 rounded-lg transition flex items-center gap-2">
						{#if saving}<svg class="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path></svg>{/if}
						{saving ? 'Saving...' : 'Save to Database'}
					</button>
					{#if hasExistingData}
						<button onclick={handleDelete} disabled={deleting} class="bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold px-5 py-2 rounded-lg transition flex items-center gap-2">
							{#if deleting}<svg class="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path></svg>{/if}
							{deleting ? 'Deleting...' : 'Delete JSON from Database'}
						</button>
					{/if}
				</div>
			</div>
		{/if}

		{#if validationResults.length > 0}
			<div class="bg-white rounded-xl border border-gray-200 overflow-hidden">
				<div class="px-5 py-3 bg-gray-50 border-b border-gray-200">
					<span class={isValid ? 'text-green-600' : 'text-red-600'}>{isValid ? '✅ All checks passed' : '❌ Some issues found'}</span>
				</div>
				{#each (editingData?.menu || []) as cat, ci}
					{@const catErrors = validationResults.filter((r) => r.categoryIndex === ci && r.status === 'error')}
					{@const isExpanded = expandedCats[ci]}
					<div class="border-t border-gray-100">
						<button onclick={() => (expandedCats = { ...expandedCats, [ci]: !isExpanded })} class="w-full flex items-center justify-between px-5 py-2.5 text-sm hover:bg-gray-50 transition">
							<span class="font-medium">{cat.category || 'Unnamed'}</span>
							<span class="flex items-center gap-2">
								<span class={catErrors.length === 0 ? 'text-green-600' : 'text-red-600'}>{catErrors.length === 0 ? '✅' : `❌ ${catErrors.length}`}</span>
								<svg class={`w-4 h-4 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" /></svg>
							</span>
						</button>
						{#if isExpanded}
							<div class="px-5 pb-3 space-y-1">
								{#if validationResults.filter((r) => r.categoryIndex === ci).length > 0}
									{#each validationResults.filter((r) => r.categoryIndex === ci) as r, i}
										<div class="text-xs flex items-center gap-2 pl-4">
											<span>{r.status === 'success' ? '✅' : r.status === 'warning' ? '⚠️' : '❌'}</span>
											<span class={r.status === 'error' ? 'text-red-600' : r.status === 'warning' ? 'text-amber-600' : 'text-green-700'}>{r.message}</span>
										</div>
									{/each}
								{:else}
									<div class="text-xs text-gray-400 pl-4">No items in this category</div>
								{/if}
							</div>
						{/if}
					</div>
				{/each}
			</div>
		{/if}

		{#if error}
			<div class="bg-red-50 border border-red-200 rounded-xl p-4">
				<div class="text-xs font-bold text-red-600 mb-1">Error</div>
				<div class="text-xs text-red-500">{error}</div>
			</div>
		{/if}

		{#if editingData}
			<div class="bg-white rounded-xl border border-gray-200 overflow-hidden">
				<div class="px-5 py-3 bg-gray-50 border-b border-gray-200"><h3 class="font-semibold text-gray-900">Edit Menu</h3></div>
				<div class="divide-y divide-gray-100">
					{#each editingData.menu as cat, ci}
						<div class="p-4">
							<div class="flex items-center gap-2 mb-3">
								<input type="text" value={cat.category} oninput={(e) => updateCategoryName(ci, (e.currentTarget as HTMLInputElement).value)} class="flex-1 font-semibold border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
								<button onclick={() => deleteCategory(ci)} class="text-xs text-red-600 hover:text-red-700 font-medium whitespace-nowrap">✕ Remove</button>
							</div>
							{#if !cat.items || cat.items.length === 0}<p class="text-xs text-gray-400 mb-2">No items in this category</p>{/if}
							{#each cat.items as item, ii}
								<div class="flex items-start gap-2 mb-2 p-3 bg-gray-50 rounded-lg">
									<div class="flex-1 grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
										<div><label class="text-gray-400 block mb-0.5">Name</label><input type="text" value={item.name} oninput={(e) => updateItemField(ci, ii, 'name', (e.currentTarget as HTMLInputElement).value)} class="w-full border border-gray-300 rounded px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-blue-400" /></div>
										<div><label class="text-gray-400 block mb-0.5">Price</label><input type="number" step="0.01" min="0" value={item.price} oninput={(e) => updateItemField(ci, ii, 'price', parseFloat((e.currentTarget as HTMLInputElement).value) || 0)} class="w-full border border-gray-300 rounded px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-blue-400" /></div>
										<div><label class="text-gray-400 block mb-0.5">Available</label><input type="checkbox" checked={!!item.available} onchange={(e) => updateItemField(ci, ii, 'available', (e.currentTarget as HTMLInputElement).checked)} class="mt-1.5 block" /></div>
										<div class="flex items-end justify-end"><button onclick={() => deleteItem(ci, ii)} class="text-xs text-red-500 hover:text-red-700">🗑 Remove</button></div>
										<div class="md:col-span-4"><label class="text-gray-400 block mb-0.5">Image URL</label><input type="text" value={item.raw_image_url || ''} oninput={(e) => updateItemField(ci, ii, 'raw_image_url', (e.currentTarget as HTMLInputElement).value)} class="w-full border border-gray-300 rounded px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-blue-400" /></div>
										<div class="md:col-span-4"><label class="text-gray-400 block mb-0.5">Description</label><input type="text" value={item.description || ''} oninput={(e) => updateItemField(ci, ii, 'description', (e.currentTarget as HTMLInputElement).value)} class="w-full border border-gray-300 rounded px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-blue-400" /></div>
									</div>
								</div>
							{/each}
							<button onclick={() => addItem(ci)} class="text-xs text-blue-600 hover:text-blue-700 font-medium">+ Add Item</button>
						</div>
					{/each}
				</div>
				<div class="px-5 py-3 bg-gray-50 border-t border-gray-200">
					<button onclick={addCategory} class="text-xs text-blue-600 hover:text-blue-700 font-medium">+ Add Category</button>
				</div>
			</div>
		{/if}

		<details class="bg-white rounded-xl border border-gray-200 overflow-hidden">
			<summary class="px-5 py-3 bg-gray-50 border-b border-gray-200 cursor-pointer flex items-center justify-between text-sm font-semibold text-gray-900 hover:bg-gray-100 transition select-none">
				Raw JSON
				<svg class="w-4 h-4 text-gray-400 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" /></svg>
			</summary>
			<div>
				<div class="flex items-center justify-end gap-2 px-5 py-2 bg-gray-50 border-b border-gray-200">
					<button onclick={() => navigator.clipboard.writeText(JSON.stringify(parsedData, null, 2))} class="text-xs text-gray-500 hover:text-gray-700 flex items-center gap-1">
						<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/></svg>
						Copy
					</button>
					<button onclick={handleClear} class="text-xs text-red-600 hover:text-red-700 font-medium">Clear</button>
				</div>
				<pre class="p-5 text-xs overflow-x-auto max-h-96 overflow-y-auto"><code>{@html highlight(JSON.stringify(parsedData, null, 2))}</code></pre>
			</div>
		</details>

		<!-- Scrape Link -->
		<div class="border border-gray-300 rounded-xl overflow-hidden">
			<div class="px-4 py-2 bg-gray-50 flex items-center gap-2"><span class="text-xs font-semibold text-gray-700">🔗 Scrape Link</span></div>
			<div class="p-3 bg-white">
				<div class="flex items-center gap-2">
					<input type="text" bind:value={scrapeLink} placeholder="https://..." class="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400" />
					<button onclick={saveScrapeLink} disabled={savingScrapeLink} class="bg-violet-600 hover:bg-violet-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-semibold px-3 py-2 rounded-lg transition shrink-0">{savingScrapeLink ? 'Saving...' : 'Save'}</button>
					{#if scrapeLinkSaved}<span class="text-xs text-green-600 font-medium shrink-0">Saved ✓</span>{/if}
				</div>
			</div>
		</div>

		<!-- Bottom action bar -->
		<div class="bg-white rounded-xl border border-gray-200 overflow-hidden">
			<div class="px-5 py-3 bg-gray-50 flex items-center justify-between gap-3 flex-wrap">
				<a href={webHref} target="_blank" rel="noopener noreferrer" class="bg-gray-600 hover:bg-gray-700 text-white text-sm font-semibold px-5 py-2 rounded-lg transition flex items-center gap-2">🌐 Web</a>
				<div class="flex items-center gap-3">
					<button onclick={handleSave} disabled={saving} class="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold px-5 py-2 rounded-lg transition flex items-center gap-2">
						{#if saving}<svg class="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path></svg>{/if}
						{saving ? 'Saving...' : 'Save to Database'}
					</button>
					{#if hasExistingData}
						<button onclick={handleDelete} disabled={deleting} class="bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold px-5 py-2 rounded-lg transition flex items-center gap-2">
							{#if deleting}<svg class="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path></svg>{/if}
							{deleting ? 'Deleting...' : 'Delete JSON from Database'}
						</button>
					{/if}
				</div>
			</div>
		</div>
	{/if}

	{#if !parsedData && error}
		<div class="bg-red-50 border border-red-200 rounded-xl p-4">
			<div class="text-xs font-bold text-red-600 mb-1">Error</div>
			<div class="text-xs text-red-500">{error}</div>
		</div>
	{/if}

	{#if toast}
		<div class="fixed bottom-6 right-6 z-50 px-4 py-3 rounded-lg shadow-lg text-sm font-medium {toast.type === 'success' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'}">{toast.message}</div>
	{/if}
</div>
