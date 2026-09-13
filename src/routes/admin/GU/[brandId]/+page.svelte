<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/state';
	import API_BASE from '$lib/api';
	import tokenManager from '$lib/tokenManager';
	import TagInput from '$lib/TagInput.svelte';

	let brandId = $derived(page.params.brandId as string);

	function normalizeTags(item: any) {
		if (Array.isArray(item?.tags)) return item.tags.filter((t: any) => typeof t === 'string' && t);
		if (typeof item?.tag === 'string' && item.tag) return [item.tag];
		return [];
	}
	function pickDescription(item: any) {
		if (Array.isArray(item?.description)) return item.description.filter((x: any) => typeof x === 'string').join('\n');
		if (Array.isArray(item?.details)) return item.details.filter((x: any) => typeof x === 'string').join('\n');
		return (
			item?.description ||
			item?.desc ||
			item?.itemDescription ||
			item?.item_description ||
			item?.longDescription ||
			item?.shortDescription ||
			item?.productDescription ||
			item?.product_description ||
			item?.descriptionText ||
			item?.description_text ||
			item?.details ||
			item?.attributes?.description ||
			item?.item?.description ||
			item?.product?.description ||
			item?.meta?.description ||
			item?.info?.description ||
			''
		);
	}
	function isGcUrl(url: string) {
		return typeof url === 'string' && url.startsWith('https://storage.googleapis.com/');
	}
	function addTagToList(tags: string[], tag: string) {
		const list = Array.isArray(tags) ? tags.slice() : [];
		const clean = String(tag || '').trim();
		if (!clean) return list;
		if (!list.includes(clean)) list.push(clean);
		return list;
	}
	function removeTagFromList(tags: string[], tag: string) {
		const list = Array.isArray(tags) ? tags.slice() : [];
		return list.filter((t) => t !== tag);
	}
	function normalizeInput(raw: any) {
		const store = raw?.store && typeof raw.store === 'object' ? raw.store : null;
		const topCategory = raw?.category ? String(raw.category) : '';
		let items: any[] = [];
		if (Array.isArray(raw)) items = raw;
		else if (Array.isArray(raw?.items)) items = raw.items;
		else if (Array.isArray(raw?.aisles)) {
			return { store, aisles: raw.aisles.map((a: any) => ({ category: a?.category ? String(a.category) : 'Uncategorized', items: Array.isArray(a?.items) ? a.items.map((it: any) => ({ ...it, description: pickDescription(it), tags: normalizeTags(it) })) : [] })) };
		} else if (Array.isArray(raw?.menu)) {
			return { store, aisles: raw.menu.map((a: any) => ({ category: a?.category ? String(a.category) : 'Uncategorized', items: Array.isArray(a?.items) ? a.items.map((it: any) => ({ ...it, description: pickDescription(it), tags: normalizeTags(it) })) : [] })) };
		} else {
			return { store, aisles: [] };
		}
		const groups = new Map<string, any[]>();
		for (const item of items) {
			if (!item || typeof item !== 'object') continue;
			const cat = item.category ? String(item.category) : topCategory ? topCategory : 'Uncategorized';
			if (!groups.has(cat)) groups.set(cat, []);
			groups.get(cat)!.push({ ...item, description: pickDescription(item), tags: normalizeTags(item) });
		}
		const aisles: any[] = [];
		for (const [category, list] of groups) aisles.push({ category, items: list });
		return { store, aisles };
	}
	function mergeAisles(existing: any, incoming: any) {
		const base = existing && Array.isArray(existing.aisles) ? existing.aisles.slice() : [];
		const mergedStore = incoming?.store || existing?.store || null;
		for (const inAisle of incoming?.aisles || []) {
			const idx = base.findIndex((a: any) => a.category === inAisle.category);
			if (idx >= 0) base[idx] = { ...inAisle, items: [...inAisle.items] };
			else base.push({ ...inAisle, items: [...inAisle.items] });
		}
		return { store: mergedStore, aisles: base };
	}
	function filterParsedToSelected(preview: any, selectedItems: Set<string>) {
		if (!preview) return null;
		const aisles = preview.aisles
			.map((aisle: any, i: number) => ({ ...aisle, items: aisle.items.filter((_: any, j: number) => selectedItems.has(`${i}:${j}`)) }))
			.filter((a: any) => a.items.length > 0);
		return { store: preview.store ?? null, aisles };
	}

	function appendAisles(existing: any, incoming: any) {
		const base = existing && Array.isArray(existing.aisles) ? existing.aisles.slice() : [];
		const mergedStore = incoming?.store || existing?.store || null;
		for (const inAisle of incoming?.aisles || []) {
			const inItems = inAisle.items || [];
			const idx = base.findIndex((a: any) => a.category === inAisle.category);
			if (idx >= 0) {
				const existingItems = base[idx].items || [];
				const seen = new Set(existingItems.map((i: any) => i.id || i.productId || i.name));
				const newItems = inItems.filter((i: any) => !seen.has(i.id || i.productId || i.name));
				base[idx] = { ...base[idx], ...inAisle, items: [...existingItems, ...newItems] };
			} else {
				base.push({ ...inAisle, items: [...inItems] });
			}
		}
		return { store: mergedStore, aisles: base };
	}

	let brand = $state<any>(null);
	let activeTab = $state('upload');
	let aislesData = $state<any>(null);
	let uploadText = $state('');
	let parsedPreview = $state<any>(null);
	let error = $state<string | null>(null);
	let toast = $state<{ type: string; text: string } | null>(null);
	let previewExpanded = $state<Record<string, boolean>>({});
	let dragOver = $state(false);
	let dragAisle = $state<number | null>(null);
	const MIME_AISLE = 'application/x-aisle-index';
	let tagOptions = $state<string[]>([]);
	// Only tags already used on this brand's parsed items (type-ahead is brand-scoped).
	const allKnownTags = $derived<string[]>([
		...new Set<string>((parsedPreview?.aisles || []).flatMap((a: any) => (a.items || []).flatMap((it: any) => (it.tags || []) as string[])))
	]);
	let selectedItems = $state<Set<string>>(new Set());
	let applyTagInput = $state('');
	let tagInputs = $state<Record<string, string>>({});
	let previewSearch = $state('');

	const searchResults = $derived.by(() => {
		const q = previewSearch.trim().toLowerCase();
		if (!q) return [];
		const out: { ai: number; ii: number; category: string; item: any }[] = [];
		(parsedPreview?.aisles || []).forEach((a: any, ai: number) => {
			(a.items || []).forEach((it: any, ii: number) => {
				const hay = [it.name, it.description, ...(Array.isArray(it.tags) ? it.tags : [])].join(' ').toLowerCase();
				if (hay.includes(q)) out.push({ ai, ii, category: a.category, item: it });
			});
		});
		return out;
	});
	let saving = $state(false);
	let savingRowKey = $state<string | null>(null);
	let gCLoadingKey = $state<string | null>(null);
	let delGCLoadingKey = $state<string | null>(null);
	let imageModal = $state<any>(null);

	$effect(() => {
		if (!imageModal) return;
		const onKey = (e: KeyboardEvent) => {
			if (e.key === 'Escape') closeImageModal();
		};
		window.addEventListener('keydown', onKey);
		return () => window.removeEventListener('keydown', onKey);
	});
	$effect(() => {
		if (!storeImageModal) return;
		const onKey = (e: KeyboardEvent) => {
			if (e.key === 'Escape') closeStoreImageModal();
		};
		window.addEventListener('keydown', onKey);
		return () => window.removeEventListener('keydown', onKey);
	});
	let modalUrl = $state('');
	let modalFile = $state<File | null>(null);
	let modalFilePreview = $state('');
	let modalDragOver = $state(false);
	let modalUrl2 = $state('');
	let modalFile2 = $state<File | null>(null);
	let modalFile2Preview = $state('');
	let modalDragOver2 = $state(false);
	let fileInput1 = $state<HTMLInputElement>();
	let fileInput2 = $state<HTMLInputElement>();
	let modalUrl3 = $state('');
	let modalFile3 = $state<File | null>(null);
	let modalFile3Preview = $state('');
	let modalDragOver3 = $state(false);
	let fileInput3 = $state<HTMLInputElement>();
	let modalUrl4 = $state('');
	let modalFile4 = $state<File | null>(null);
	let modalFile4Preview = $state('');
	let modalDragOver4 = $state(false);
	let fileInput4 = $state<HTMLInputElement>();
	let modalSearchTags = $state('');
	let modalUploading = $state(false);
	let batchFileInput = $state<HTMLInputElement>();
	let modalBatchDrag = $state(false);
	let storeImageModal = $state<{ ai: number; ii: number; item: any } | null>(null);
	let storeUrl1 = $state('');
	let storeUrl2 = $state('');
	let storeUrl3 = $state('');
	let storeFile1 = $state<File | null>(null);
	let storeFile2 = $state<File | null>(null);
	let storeFile3 = $state<File | null>(null);
	let storeFile1Preview = $state('');
	let storeFile2Preview = $state('');
	let storeFile3Preview = $state('');
	let storeDragOver1 = $state(false);
	let storeDragOver2 = $state(false);
	let storeDragOver3 = $state(false);
	let storeFileInput1 = $state<HTMLInputElement>();
	let storeFileInput2 = $state<HTMLInputElement>();
	let storeFileInput3 = $state<HTMLInputElement>();
	let storeUploading = $state(false);
	let storeBatchInput = $state<HTMLInputElement>();
	let storeBatchDrag = $state(false);

	const isGrocery = $derived(brand?.brandType === 'grocery');
	// const isGrocery = $derived(brand?.brand_type === 'grocery' || brand?.brandType === 'grocery');

	const headers = typeof window !== 'undefined' ? tokenManager.getHeaders() : {};

	onMount(() => {
		console.log('ONMOUNT FIRED WITH BRAND ID:', brandId);
  		loadAisles();

		fetch(API_BASE + 'brands/' + brandId, { headers })
			.then((r) => r.json())
			.then((b) => (brand = b))
			.catch(() => (brand = null))  //;
		// fetch(API_BASE + 'admin/brand-tags', { headers })
		// 	.then((r) => r.json())
		// 	.then((data: any) => {
		// 		if (Array.isArray(data)) tagOptions = data;
		// 		else if (Array.isArray(data.values)) tagOptions = data.values;
		// 		else if (Array.isArray(data.tags)) tagOptions = data.tags;
		// 	})
			.catch(() => {});
	});

	$effect(() => {
		if (!toast) return;
		const t = setTimeout(() => (toast = null), 3000);
		return () => clearTimeout(t);
	});

	// function loadAisles() {
	// 	if (!isGrocery || !brandId) {
	// 		aislesData = null;
	// 		parsedPreview = null;
	// 		return;
	// 	}
	// 	fetch(API_BASE + 'brands/' + brandId + '/aisles', { headers })
	// 		.then((r) => r.json())
	// 		.then((data) => {
	// 			if (data && Array.isArray(data.aisles)) {
	// 				const payload = { store: data.store ?? null, aisles: data.aisles };
	// 				aislesData = payload;
	// 				parsedPreview = payload;
	// 				selectedItems = new Set();
	// 				const allExpanded: Record<string, boolean> = {};
	// 				data.aisles.forEach((_: any, i: number) => (allExpanded[i] = true));
	// 				previewExpanded = allExpanded;
	// 			} else {
	// 				aislesData = null;
	// 				parsedPreview = null;
	// 				previewExpanded = {};
	// 			}
	// 		})
	// 		.catch(() => {
	// 			aislesData = null;
	// 			parsedPreview = null;
	// 			previewExpanded = {};
	// 		});
	// }

	// $effect(() => {
	// 	loadAisles();
	// });


function loadAisles() {
  // THIS MUST BE LINE 1 OF THE FUNCTION
  console.log('=== LOAD AISLES FUNCTION TRIGGERED ===', { brandId });

  if (!brandId) {
    console.log('BLOCKED BY GUARD: brandId is falsy');
    return;
  }

  const targetUrl = API_BASE + 'admin/brands/' + brandId + '/products';
  console.log('EXECUTING FETCH TO:', targetUrl);

  fetch(targetUrl, { headers })
    .then((r) => r.json())
    .then((data) => {
      console.log('PAYLOAD RECEIVED:', data);
      aislesData = data;
      parsedPreview = data;
    })
    .catch((err) => console.error('FETCH ERROR:', err));
}



	function parseContent(text: string) {
		error = null;
		let data;
		try {
			data = JSON.parse(text);
		} catch (err: any) {
			error = 'Invalid JSON: ' + err.message;
			return;
		}
		const normalized = normalizeInput(data);
		if (!normalized.aisles || normalized.aisles.length === 0) {
			error = 'No items/categories found in the uploaded data.';
			return;
		}
		parsedPreview = normalized;
		selectedItems = new Set();
		const allExpanded: Record<string, boolean> = {};
		normalized.aisles.forEach((_: any, i: number) => (allExpanded[i] = true));
		previewExpanded = allExpanded;
	}

	function onFile(e: Event) {
		const el = e.currentTarget as HTMLInputElement;
		const file = el.files?.[0];
		if (!file) return;
		const reader = new FileReader();
		reader.onload = () => parseContent(String(reader.result));
		reader.readAsText(file);
		el.value = '';
	}

	function onDrop(e: DragEvent) {
		e.preventDefault();
		dragOver = false;
		const file = e.dataTransfer?.files?.[0];
		if (!file) return;
		const reader = new FileReader();
		reader.onload = () => parseContent(String(reader.result));
		reader.readAsText(file);
	}

	function toggleItem(ai: number, ii: number) {
		const key = `${ai}:${ii}`;
		const next = new Set(selectedItems);
		if (next.has(key)) next.delete(key);
		else next.add(key);
		selectedItems = next;
	}
	function toggleAisle(ai: number) {
		const next = new Set(selectedItems);
		const start = `${ai}:`;
		for (const k of [...next]) if (k.startsWith(start)) next.delete(k);
		const aisle = parsedPreview?.aisles?.[ai];
		if (aisle) aisle.items.forEach((_: any, ii: number) => next.add(`${ai}:${ii}`));
		selectedItems = next;
	}
	function toggleAisleExpanded(ai: number) {
		previewExpanded = { ...previewExpanded, [ai]: !previewExpanded[ai] };
	}
	function moveAisle(from: number, to: number) {
		const next = [...parsedPreview.aisles];
		if (from === to || from < 0 || to < 0 || from >= next.length || to >= next.length) return;
		const [moved] = next.splice(from, 1);
		next.splice(to, 0, moved);
		parsedPreview = { ...parsedPreview, aisles: next };
		selectedItems = new Set();
		previewSearch = '';
	}
	function onAisleDrop(targetIdx: number, e: DragEvent) {
		e.preventDefault();
		const from = Number(e.dataTransfer?.getData(MIME_AISLE));
		if (!isNaN(from)) {
			moveAisle(from, targetIdx);
			persistAisles(parsedPreview, 'Aisle order updated & saved');
		}
		dragAisle = null;
	}

	// jay fix this later 

	function requireGrocery() {
		if (isGrocery) return true;
		toast = { type: 'error', text: `Store Aisles are only available for grocery brands. This brand is of type "${brand?.brandType || 'unknown'}".` };
		return false;
	}

	// async function persistAisles(payload: any, msg: string) {
	// 	if (!requireGrocery()) return;
	// 	if (!payload) { toast = { type: 'error', text: 'There is no Store Aisles data to save yet.' }; return; }
	// 	saving = true;
	// 	toast = null;
	// 	try {
	// 		const res = await fetch(API_BASE + 'admin/brands/' + brandId + '/aisles', {
	// 			method: 'PUT',
	// 			headers,
	// 			body: JSON.stringify({ store: payload.store ?? null, aisles: payload.aisles })
	// 		});
	// 		if (res.ok) {
	// 			toast = { type: 'success', text: msg };
	// 			loadAisles();
	// 		} else {
	// 			const text = await res.text();
	// 			let m;
	// 			try { const p = JSON.parse(text); m = p.error || p.message || text; } catch { m = text; }
	// 			toast = { type: 'error', text: m };
	// 		}
	// 	} catch (err: any) {
	// 		toast = { type: 'error', text: 'Network error: ' + err.message };
	// 	} finally {
	// 		saving = false;
	// 	}
	// }

	async function persistAisles(payload: any, msg: string) {
    if (!payload) { 
        toast = { type: 'error', text: 'There is no store data to save yet.' }; 
        return; 
    }
    saving = true;
    toast = null;
    try {
        // 1. Updated endpoint path and HTTP method (POST instead of PUT)
        const res = await fetch(API_BASE + 'admin/brands/' + brandId + '/upload_products', {
            method: 'POST',
            headers: {
                ...headers,
                'Content-Type': 'application/json'
            },
            // 2. Pass the payload directly so Phoenix receives %{"category" => ..., "items" => [...]}
            body: JSON.stringify(payload)
        });

        if (res.ok) {
            toast = { type: 'success', text: msg };
            loadAisles();
        } else {
            const text = await res.text();
            let m;
            try { 
                const p = JSON.parse(text); 
                m = p.error || p.message || text; 
            } catch { 
                m = text; 
            }
            toast = { type: 'error', text: m };
        }
    } catch (err: any) {
        toast = { type: 'error', text: 'Network error: ' + err.message };
    } finally {
        saving = false;
    }
}

	function handleMerge() {
		if (!requireGrocery()) return;
		if (!parsedPreview) return;
		if (selectedItems.size === 0) { toast = { type: 'error', text: 'No items selected to save. Select the aisles/items you want first.' }; return; }
		persistAisles(mergeAisles(aislesData, filterParsedToSelected(parsedPreview, selectedItems)), 'Merged into Store Aisles');
	}
	function handleReplace() {
		if (!requireGrocery()) return;
		if (!parsedPreview) return;
		if (selectedItems.size === 0) { toast = { type: 'error', text: 'No items selected to save. Select the aisles/items you want first.' }; return; }
		persistAisles(filterParsedToSelected(parsedPreview, selectedItems), 'Replaced Store Aisles');
	}
	function handleSavePreview() {
		// if (!requireGrocery()) return;
		if (!parsedPreview || !parsedPreview.aisles || parsedPreview.aisles.length === 0) { toast = { type: 'error', text: 'There is no data in the preview to save.' }; return; }
		persistAisles(parsedPreview, 'Preview saved successfully');
	}
	function handleAppend() {
		if (!requireGrocery()) return;
		if (!parsedPreview || !parsedPreview.aisles || parsedPreview.aisles.length === 0) { toast = { type: 'error', text: 'There is no data in the preview to append.' }; return; }
		const payload = selectedItems.size > 0 ? filterParsedToSelected(parsedPreview, selectedItems) : parsedPreview;
		if (!payload || !payload.aisles || payload.aisles.length === 0) { toast = { type: 'error', text: 'No items to append.' }; return; }
		persistAisles(appendAisles(aislesData, payload), 'Appended to Store Aisles');
	}

	function collectGcUrls(preview: any): string[] {
		const urls = new Set<string>();
		for (const aisle of preview?.aisles ?? []) {
			for (const item of aisle.items ?? []) {
				if (isGcUrl(item.raw_image_url)) urls.add(item.raw_image_url);
				for (const img of item.images ?? []) {
					if (img && isGcUrl(img.url)) urls.add(img.url);
				}
			}
		}
		return [...urls];
	}

	let deletingAll = $state(false);

	async function handleDeleteAll() {
		if (!requireGrocery()) return;
		if (!confirm('Are you sure you want to delete ALL store aisles for this brand along with their uploaded images? This cannot be undone.')) return;

		const urls = collectGcUrls(parsedPreview);
		let deleted = 0;
		let failed = 0;

		deletingAll = true;
		toast = null;

		for (const url of urls) {
			try {
				const res = await fetch(API_BASE + 'admin/delete-image', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ url })
				});
				if (res.ok) deleted++;
				else failed++;
			} catch {
				failed++;
			}
		}

		parsedPreview = null;
		selectedItems = new Set();
		previewSearch = '';

		await persistAisles({ store: null, aisles: [] }, 'All Store Aisles deleted');

		if (failed > 0 && deleted > 0) {
			toast = { type: 'error', text: `Store aisles cleared. ${deleted} image(s) deleted, but ${failed} failed to delete from GCS.` };
		} else if (failed > 0) {
			toast = { type: 'error', text: `Store aisles cleared, but ${failed} image(s) failed to delete from GCS.` };
		} else if (deleted > 0) {
			toast = { type: 'success', text: `All Store Aisles deleted; ${deleted} image(s) removed from GCS.` };
		}

		deletingAll = false;
	}

	// async function patchItem(ai: number, ii: number, itemObj: any, msg: string, key: string) {
	// 	if (!requireGrocery()) return;
	// 	if (key) savingRowKey = key;
	// 	try {
	// 		const res = await fetch(API_BASE + `admin/brands/${brandId}/aisles/${ai}/items/${ii}`, {
	// 			method: 'PATCH',
	// 			headers,
	// 			body: JSON.stringify(itemObj)
	// 		});
	// 		if (res.ok) {
	// 			toast = { type: 'success', text: msg };
	// 			return true;
	// 		} else {
	// 			const text = await res.text();
	// 			let m;
	// 			try { const p = JSON.parse(text); m = p.error || p.message || text; } catch { m = text; }
	// 			toast = { type: 'error', text: m };
	// 			return false;
	// 		}
	// 	} catch (err: any) {
	// 		toast = { type: 'error', text: 'Network error: ' + err.message };
	// 		return false;
	// 	} finally {
	// 		if (key) savingRowKey = null;
	// 	}
	// }

	async function patchItem(ai: number, ii: number, item: any, successMsg: string, key: string) {
    if (!item || !item.id) {
        console.error('patchItem aborted: Product ID is missing from item object', item);
        return;
    }

    console.log('Sending PATCH request for product ID:', item.id);

    fetch(`${API_BASE}admin/brands/${brandId}/products/${item.id}`, {
        method: 'PATCH',
        headers: {
            'Content-Type': 'application/json',
            ...headers
        },
        body: JSON.stringify({ product: item })
    })
    .then((r) => r.json())
    .then((res) => console.log('Save response:', res))
    .catch((err) => console.error('PATCH request failed:', err));
}



	// function handleSaveRow(ai: number, ii: number) {
	// 	const item = parsedPreview?.aisles?.[ai]?.items?.[ii];
	// 	patchItem(ai, ii, item, 'Item saved to DB', `${ai}:${ii}`);
	// }

// 	function handleSaveRow(ai: number, ii: number) {
//     console.log('SAVE BUTTON CLICKED -> Aisle:', ai, 'Item:', ii);

//     const item = aislesData?.aisles?.[ai]?.items?.[ii];
//     console.log('Target item object:', item);

//     if (!item) {
//         console.error('Save aborted: Item is undefined at aislesData.aisles[' + ai + '].items[' + ii + ']');
//         return;
//     }

//     patchItem(ai, ii, item, 'Item saved to DB', `${ai}:${ii}`);
// }



// function handleSaveRow(ai: number, ii: number) {
//     const item = aislesData?.aisles?.[ai]?.items?.[ii];
//     console.log('PAYLOAD BEING SENT TO PHOENIX:', item?.name);

//     if (item) {
//         patchItem(ai, ii, item, 'Item saved to DB', `${ai}:${ii}`);
//     }
// }

function handleSaveRow(ai: number, ii: number) {
    const item = parsedPreview?.aisles?.[ai]?.items?.[ii];
    
    console.log('Sending item name to backend:', item?.name);

    if (item) {
        patchItem(ai, ii, item, 'Item saved to DB', `${ai}:${ii}`);
    }
}



	async function upToGC(ai: number, ii: number) {
		if (!requireGrocery()) return;
		const item = parsedPreview?.aisles?.[ai]?.items?.[ii];
		if (!item) return;
		if (!item.raw_image_url) { toast = { type: 'error', text: 'This row has no image URL to upload.' }; return; }
		gCLoadingKey = `${ai}:${ii}`;
		try {
			const res = await fetch(API_BASE + 'admin/upload-image-from-url', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ url: item.raw_image_url, folder: 'Grocery' })
			});
			if (!res.ok) { const t = await res.text(); let m; try { const p = JSON.parse(t); m = p.error || p.message || t; } catch { m = t; } toast = { type: 'error', text: m }; return; }
			const data = await res.json();
			const updatedItem = { ...item, raw_image_url: data.url };
			parsedPreview = {
				...parsedPreview,
				aisles: parsedPreview.aisles.map((a: any, x: number) => (x === ai ? { ...a, items: a.items.map((it: any, y: number) => (y === ii ? updatedItem : it)) } : a))
			};
			toast = { type: 'success', text: 'Image uploaded to GC' };
			patchItem(ai, ii, updatedItem, 'Image uploaded to GC & saved', '');
		} catch (err: any) {
			toast = { type: 'error', text: 'Network error: ' + err.message };
		} finally {
			gCLoadingKey = null;
		}
	}

	async function delGC(ai: number, ii: number) {
		if (!requireGrocery()) return;
		const item = parsedPreview?.aisles?.[ai]?.items?.[ii];
		if (!item) return;
		const targetUrl = isGcUrl(item.raw_image_url) ? item.raw_image_url : (item.images || []).find((img: any) => isGcUrl(img.url))?.url;
		if (!targetUrl) { toast = { type: 'error', text: 'No GC image to delete on this row.' }; return; }
		if (!confirm('Delete this image from Google Cloud?')) return;
		delGCLoadingKey = `${ai}:${ii}`;
		try {
			const res = await fetch(API_BASE + 'admin/delete-image', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ url: targetUrl })
			});
			if (!res.ok) { const t = await res.text(); let m; try { const p = JSON.parse(t); m = p.error || p.message || t; } catch { m = t; } toast = { type: 'error', text: m }; return; }
			const hadImages = Array.isArray(item.images);
			let updatedImages = hadImages ? item.images.filter((img: any) => img.url !== targetUrl) : null;
			let raw = item.raw_image_url === targetUrl ? '' : item.raw_image_url;
			if (hadImages && updatedImages.length > 0) {
				updatedImages = updatedImages.map((img: any, k: number) => ({ ...img, isPrimary: k === 0 }));
				raw = updatedImages[0].url;
			} else if (hadImages) {
				updatedImages = [];
			}
			const updatedItem = {
				...item,
				raw_image_url: raw,
				version: hadImages && updatedImages.length > 0 ? updatedImages[0].version ?? '' : item.raw_image_url === targetUrl ? '' : item.version,
				...(hadImages ? { images: updatedImages } : {})
			};
			parsedPreview = {
				...parsedPreview,
				aisles: parsedPreview.aisles.map((a: any, x: number) => (x === ai ? { ...a, items: a.items.map((it: any, y: number) => (y === ii ? updatedItem : it)) } : a))
			};
			toast = { type: 'success', text: 'Image deleted from GC' };
			patchItem(ai, ii, updatedItem, 'Image deleted from GC & saved', '');
		} catch (err: any) {
			toast = { type: 'error', text: 'Network error: ' + err.message };
		} finally {
			delGCLoadingKey = null;
		}
	}

	async function upImageToGC(ai: number, ii: number, url: string) {
		if (!requireGrocery()) return;
		const item = parsedPreview?.aisles?.[ai]?.items?.[ii];
		if (!item) return;
		gCLoadingKey = `${ai}:${ii}`;
		try {
			const res = await fetch(API_BASE + 'admin/upload-image-from-url', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ url, folder: 'Grocery' })
			});
			if (!res.ok) { const t = await res.text(); let m; try { const p = JSON.parse(t); m = p.error || p.message || t; } catch { m = t; } toast = { type: 'error', text: m }; return; }
			const data = await res.json();
			const images = (item.images || []).map((img: any) => (img.url === url ? { ...img, url: data.url } : img));
			const raw = item.raw_image_url === url ? data.url : item.raw_image_url;
			const updatedItem = { ...item, images, raw_image_url: raw };
			updatePreviewItem(ai, ii, 'images', images);
			updatePreviewItem(ai, ii, 'raw_image_url', raw);
			toast = { type: 'success', text: 'Image uploaded to GC' };
			await patchItem(ai, ii, updatedItem, 'Image uploaded to GC & saved', '');
		} catch (err: any) {
			toast = { type: 'error', text: 'Network error: ' + err.message };
		} finally {
			gCLoadingKey = null;
		}
	}

	async function deleteItemImage(ai: number, ii: number, url: string) {
		if (!requireGrocery()) return;
		const item = parsedPreview?.aisles?.[ai]?.items?.[ii];
		if (!item) return;
		// Delete the file from GCS too (best-effort) so it doesn't remain accessible.
		try {
			await fetch(API_BASE + 'admin/delete-image', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ url })
			});
		} catch (e) {
			console.error('Failed to delete image from GCS:', e);
		}
		const images = (item.images || []).filter((img: any) => img.url !== url);
		const raw = item.raw_image_url === url ? (images[0]?.url || '') : item.raw_image_url;
		const updatedItem = { ...item, images, raw_image_url: raw };
		updatePreviewItem(ai, ii, 'images', images);
		updatePreviewItem(ai, ii, 'raw_image_url', raw);
		toast = { type: 'success', text: 'Image removed' };
		await patchItem(ai, ii, updatedItem, 'Image removed & saved', `${ai}:${ii}`);
	}

	async function deleteStoreImage(ai: number, ii: number, url: string) {
		if (!requireGrocery()) return;
		const item = parsedPreview?.aisles?.[ai]?.items?.[ii];
		if (!item) return;
		try {
			await fetch(API_BASE + 'admin/delete-image', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ url })
			});
		} catch (e) {
			console.error('Failed to delete store image from GCS:', e);
		}
		const storeImages = (item.storeImages || []).filter((img: any) => img.url !== url);
		const updatedItem = { ...item, storeImages };
		updatePreviewItem(ai, ii, 'storeImages', storeImages);
		toast = { type: 'success', text: 'Store image removed' };
		await patchItem(ai, ii, updatedItem, 'Store image removed & saved', `${ai}:${ii}`);
	}

	function updatePreviewItem(ai: number, ii: number, field: string, value: any) {
		parsedPreview = {
			...parsedPreview,
			aisles: parsedPreview.aisles.map((a: any, x: number) =>
				x === ai ? { ...a, items: a.items.map((it: any, y: number) => (y === ii ? { ...it, [field]: value } : it)) } : a
			)
		};
	}

	function addTagFromRowInput(ai: number, ii: number, tagOverride?: string) {
		const val = ((tagOverride ?? tagInputs[`${ai}:${ii}`]) || '').trim();
		const item = parsedPreview?.aisles?.[ai]?.items?.[ii];
		if (!item || !val) return;
		const updated = { ...item, tags: addTagToList(item.tags, val) };
		updatePreviewItem(ai, ii, 'tags', updated.tags);
		tagInputs = { ...tagInputs, [`${ai}:${ii}`]: '' };
		patchItem(ai, ii, updated, 'Tag saved to DB', '');
	}
	function removeTagFromItem(ai: number, ii: number, tag: string) {
		const item = parsedPreview?.aisles?.[ai]?.items?.[ii];
		if (!item) return;
		const updated = { ...item, tags: removeTagFromList(item.tags, tag) };
		updatePreviewItem(ai, ii, 'tags', updated.tags);
		patchItem(ai, ii, updated, 'Tag removed from DB', '');
	}
	function applyTagToSelected() {
		if (!requireGrocery()) return;
		const tag = applyTagInput.trim();
		if (!tag || selectedItems.size === 0 || !parsedPreview) return;
		const updated = {
			...parsedPreview,
			aisles: parsedPreview.aisles.map((a: any, x: number) => ({
				...a,
				items: a.items.map((it: any, y: number) => (selectedItems.has(`${x}:${y}`) ? { ...it, tags: addTagToList(it.tags, tag) } : it))
			}))
		};
		parsedPreview = updated;
		applyTagInput = '';
		selectedItems = new Set();
		persistAisles(updated, `Tag "${tag}" added to DB`);
	}
	function removeAllTagsFromSelected() {
		if (!requireGrocery()) return;
		if (selectedItems.size === 0 || !parsedPreview) return;
		const updated = {
			...parsedPreview,
			aisles: parsedPreview.aisles.map((a: any, x: number) => ({
				...a,
				items: a.items.map((it: any, y: number) => (selectedItems.has(`${x}:${y}`) ? { ...it, tags: [] } : it))
			}))
		};
		parsedPreview = updated;
		persistAisles(updated, 'Tags removed from selected rows');
	}

	function updateAisleCategory(ai: number, value: string) {
		if (!requireGrocery()) return;
		aislesData = { ...aislesData, aisles: aislesData.aisles.map((a: any, x: number) => (x === ai ? { ...a, category: value } : a)) };
	}
	// function updateItemField(ai: number, ii: number, field: string, value: any) {
	// 	if (!requireGrocery()) return;
	// 	aislesData = {
	// 		...aislesData,
	// 		aisles: aislesData.aisles.map((a: any, x: number) =>
	// 			x === ai ? { ...a, items: a.items.map((it: any, y: number) => (y === ii ? { ...it, [field]: value } : it)) } : a
	// 		)
	// 	};
	// }


	function updateItemField(ai: number, ii: number, field: string, value: any) {
    if (!requireGrocery()) return;

    // 1. Update local UI state directly
    const item = aislesData.aisles[ai].items[ii];
    item[field] = value;
    aislesData = { ...aislesData };

    // 2. Fire-and-forget PATCH to Phoenix
    fetch(`${API_BASE}admin/brands/${brandId}/products/${item.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...headers },
        body: JSON.stringify({ product: { [field]: value } })
    }).catch((err) => console.error('Save failed:', err));
}




	function deleteItem(ai: number, ii: number) {
		if (!requireGrocery()) return;
		if (!confirm('Delete this item?')) return;
		aislesData = { ...aislesData, aisles: aislesData.aisles.map((a: any, x: number) => (x === ai ? { ...a, items: a.items.filter((_: any, y: number) => y !== ii) } : a)) };
	}
	function addItem(ai: number) {
		if (!requireGrocery()) return;
		aislesData = { ...aislesData, aisles: aislesData.aisles.map((a: any, x: number) => (x === ai ? { ...a, items: [...a.items, { name: '', price: 0, available: true, raw_image_url: '', tags: [], description: '' }] } : a)) };
	}
	function deleteAisle(ai: number) {
		if (!requireGrocery()) return;
		if (!confirm('Delete this aisle and all its items?')) return;
		aislesData = { ...aislesData, aisles: aislesData.aisles.filter((_: any, x: number) => x !== ai) };
	}
	function handleSaveStoreAisles() {
		persistAisles(aislesData, 'Store Aisles saved successfully');
	}

	function openImageModal(ai: number, ii: number) {
		const item = parsedPreview?.aisles?.[ai]?.items?.[ii];
		if (!item) return;
		imageModal = { ai, ii, item, mode: 'edit' };
		modalUrl = item.raw_image_url || '';
		modalFile = null;
		modalFilePreview = '';
		modalUrl2 = '';
		modalFile2 = null;
		modalFile2Preview = '';
		modalUrl3 = '';
		modalFile3 = null;
		modalFile3Preview = '';
		modalUrl4 = '';
		modalFile4 = null;
		modalFile4Preview = '';
		modalSearchTags = '';
	}
	function openAddImageModal(ai: number, ii: number) {
		const item = parsedPreview?.aisles?.[ai]?.items?.[ii];
		if (!item) return;
		imageModal = { ai, ii, item, mode: 'add' };
		modalUrl = '';
		modalFile = null;
		modalFilePreview = '';
		modalUrl2 = '';
		modalFile2 = null;
		modalFile2Preview = '';
		modalUrl3 = '';
		modalFile3 = null;
		modalFile3Preview = '';
		modalUrl4 = '';
		modalFile4 = null;
		modalFile4Preview = '';
		modalSearchTags = '';
	}
	function openStoreImageModal(ai: number, ii: number) {
		const item = parsedPreview?.aisles?.[ai]?.items?.[ii];
		if (!item) return;
		storeImageModal = { ai, ii, item };
		storeUrl1 = '';
		storeUrl2 = '';
		storeUrl3 = '';
		storeFile1 = null;
		storeFile2 = null;
		storeFile3 = null;
		storeFile1Preview = '';
		storeFile2Preview = '';
		storeFile3Preview = '';
	}
	function closeStoreImageModal() {
		storeImageModal = null;
		storeUrl1 = '';
		storeUrl2 = '';
		storeUrl3 = '';
		storeFile1 = null;
		storeFile2 = null;
		storeFile3 = null;
		storeFile1Preview = '';
		storeFile2Preview = '';
		storeFile3Preview = '';
	}
	function closeImageModal() {
		imageModal = null;
		modalUrl = '';
		modalFile = null;
		modalFilePreview = '';
		modalUrl2 = '';
		modalFile2 = null;
		modalFile2Preview = '';
		modalUrl3 = '';
		modalFile3 = null;
		modalFile3Preview = '';
		modalUrl4 = '';
		modalFile4 = null;
		modalFile4Preview = '';
		modalSearchTags = '';
	}
	async function uploadImageToGCS(file: File, size?: string): Promise<string> {
		const fd = new FormData();
		fd.append('image', file);
		fd.append('folder', 'Grocery');
		if (size) {
			const ext = file.name.includes('.') ? file.name.slice(file.name.lastIndexOf('.')) : '';
			const base = file.name.replace(/\.[^.]+$/, '');
			fd.append('name', `${base}_${size}${ext}`);
		}
		const res = await fetch(API_BASE + 'admin/upload-image', {
			method: 'POST',
			headers: { Authorization: tokenManager.getHeaders().Authorization },
			body: fd
		});
		if (!res.ok) throw new Error('Upload failed');
		const data = await res.json();
		return data.url || '';
	}

	function detectSize(filename: string): '1000' | '400' | '150' | 'store' | null {
		const n = filename.toLowerCase();
		if (n.includes('_card')) return '1000';
		if (n.includes('_detail')) return '400';
		if (n.includes('_thumb')) return '150';
		if (n.includes('_store')) return 'store';
		return null;
	}

	function assignModalFile(slot: number, file: File) {
		const preview = URL.createObjectURL(file);
		if (slot === 0) { modalFile = file; modalFilePreview = preview; }
		else if (slot === 1) { modalFile2 = file; modalFile2Preview = preview; }
		else if (slot === 2) { modalFile3 = file; modalFile3Preview = preview; }
		else { modalFile4 = file; modalFile4Preview = preview; }
	}

	function handleBatchFiles(list: FileList | File[] | null) {
		const files = Array.from(list || []);
		const sizeToSlot: Record<string, number> = { '1000': 0, '400': 1, '150': 2, 'store': 3 };
		const current = (s: number) => [modalFile, modalFile2, modalFile3, modalFile4][s];
		const remaining: File[] = [];
		for (const f of files) {
			const s = detectSize(f.name);
			const slot = s ? sizeToSlot[s] : -1;
			if (slot >= 0 && !current(slot)) assignModalFile(slot, f);
			else remaining.push(f);
		}
		for (const f of remaining) {
			for (let s = 0; s < 4; s++) {
				if (!current(s)) { assignModalFile(s, f); break; }
			}
		}
	}

	function handleBatchDrop(e: DragEvent) {
		e.preventDefault();
		modalBatchDrag = false;
		const list = e.dataTransfer?.files;
		if (list && list.length) handleBatchFiles(list);
	}

	function detectStoreSize(filename: string): 'store-1000' | 'store-400' | 'store-150' | null {
		const n = filename.toLowerCase();
		if (n.includes('_store_card')) return 'store-1000';
		if (n.includes('_store_detail')) return 'store-400';
		if (n.includes('_store_thumb')) return 'store-150';
		if (n.includes('_store')) return 'store-1000';
		return null;
	}

	function assignStoreFile(slot: number, file: File) {
		const preview = URL.createObjectURL(file);
		if (slot === 0) { storeFile1 = file; storeFile1Preview = preview; }
		else if (slot === 1) { storeFile2 = file; storeFile2Preview = preview; }
		else { storeFile3 = file; storeFile3Preview = preview; }
	}

	function handleStoreBatchFiles(list: FileList | File[] | null) {
		const files = Array.from(list || []);
		const sizeToSlot: Record<string, number> = { 'store-1000': 0, 'store-400': 1, 'store-150': 2 };
		const current = (s: number) => [storeFile1, storeFile2, storeFile3][s];
		const remaining: File[] = [];
		for (const f of files) {
			const s = detectStoreSize(f.name);
			const slot = s ? sizeToSlot[s] : -1;
			if (slot >= 0 && !current(slot)) assignStoreFile(slot, f);
			else remaining.push(f);
		}
		for (const f of remaining) {
			for (let s = 0; s < 3; s++) {
				if (!current(s)) { assignStoreFile(s, f); break; }
			}
		}
	}

	function handleStoreBatchDrop(e: DragEvent) {
		e.preventDefault();
		storeBatchDrag = false;
		const list = e.dataTransfer?.files;
		if (list && list.length) handleStoreBatchFiles(list);
	}

	function moveModalFile(from: number, to: number) {
		if (to < 0 || to > 3 || from === to) return;
		const slots = [
			{ f: modalFile, p: modalFilePreview, u: modalUrl },
			{ f: modalFile2, p: modalFile2Preview, u: modalUrl2 },
			{ f: modalFile3, p: modalFile3Preview, u: modalUrl3 },
			{ f: modalFile4, p: modalFile4Preview, u: modalUrl4 }
		];
		[slots[from], slots[to]] = [slots[to], slots[from]];
		modalFile = slots[0].f; modalFilePreview = slots[0].p; modalUrl = slots[0].u;
		modalFile2 = slots[1].f; modalFile2Preview = slots[1].p; modalUrl2 = slots[1].u;
		modalFile3 = slots[2].f; modalFile3Preview = slots[2].p; modalUrl3 = slots[2].u;
		modalFile4 = slots[3].f; modalFile4Preview = slots[3].p; modalUrl4 = slots[3].u;
	}

	async function handleModalUpload() {
		if (!imageModal) return;
		const { ai, ii, mode } = imageModal;
		const item = parsedPreview?.aisles?.[ai]?.items?.[ii];
		if (!item) return;
		modalUploading = true;
		try {
			if (mode === 'add') {
				const uploads: { url: string; size: string }[] = [];
				if (modalFile) uploads.push({ url: await uploadImageToGCS(modalFile, '1000'), size: '1000' });
				else if (modalUrl.trim()) uploads.push({ url: modalUrl.trim(), size: '1000' });
				if (modalFile2) uploads.push({ url: await uploadImageToGCS(modalFile2, '400'), size: '400' });
				else if (modalUrl2.trim()) uploads.push({ url: modalUrl2.trim(), size: '400' });
				if (modalFile3) uploads.push({ url: await uploadImageToGCS(modalFile3, '150'), size: '150' });
				else if (modalUrl3.trim()) uploads.push({ url: modalUrl3.trim(), size: '150' });
				if (modalFile4) uploads.push({ url: await uploadImageToGCS(modalFile4, 'store'), size: 'store' });
				else if (modalUrl4.trim()) uploads.push({ url: modalUrl4.trim(), size: 'store' });
				if (uploads.length === 0) throw new Error('Provide at least one image (file or URL).');
				const urls = uploads.map((u) => u.url);
				const images = Array.isArray(item.images) ? item.images : [];
				const updatedImages = [...images];
				for (let k = 0; k < urls.length; k++) {
					const isPrimary = updatedImages.length === 0;
					const size = uploads[k].size;
					updatedImages.push({ url: urls[k], version: '', isPrimary, size });
				}
				const updatedItem = {
					...item,
					images: updatedImages,
					raw_image_url: urls[0]
				};
				updatePreviewItem(ai, ii, 'images', updatedImages);
				updatePreviewItem(ai, ii, 'raw_image_url', urls[0]);
				await patchItem(ai, ii, updatedItem, 'Images added & saved', `${ai}:${ii}`);
				try {
					const searchTags = modalSearchTags.split(',').map((t) => t.trim()).filter(Boolean);
					await fetch(API_BASE + 'admin/images', {
						method: 'POST',
						headers: { 'Content-Type': 'application/json' },
						body: JSON.stringify({
							searchTags,
							originalFilename: modalFile?.name || modalFile2?.name || modalFile3?.name || modalFile4?.name || '',
							urls: { 1000: urls[0], 400: urls[1] || '', 100: urls[2] || '', store: urls[3] || '' }
						})
					});
				} catch (err) {
					console.error('Failed to save image metadata:', err);
				}
				closeImageModal();
			} else {
				let url = '';
				if (modalFile) url = await uploadImageToGCS(modalFile);
				else url = modalUrl.trim();
				if (!url) throw new Error('Provide an image URL or a file.');
				updatePreviewItem(ai, ii, 'raw_image_url', url);
				await patchItem(ai, ii, { ...item, raw_image_url: url }, 'Image saved to DB', '');
				closeImageModal();
			}
		} catch (err: any) {
			toast = { type: 'error', text: 'Upload error: ' + err.message };
		} finally {
			modalUploading = false;
		}
	}

	async function handleStoreImageUpload() {
		if (!storeImageModal) return;
		const { ai, ii } = storeImageModal;
		const item = parsedPreview?.aisles?.[ai]?.items?.[ii];
		if (!item) return;
		storeUploading = true;
		try {
			const slots = [
				{ file: storeFile1, url: storeUrl1, size: 'store-1000' },
				{ file: storeFile2, url: storeUrl2, size: 'store-400' },
				{ file: storeFile3, url: storeUrl3, size: 'store-150' },
			];
			const uploads: { url: string; size: string }[] = [];
			for (const slot of slots) {
				if (slot.file) uploads.push({ url: await uploadImageToGCS(slot.file, slot.size), size: slot.size });
				else if (slot.url.trim()) uploads.push({ url: slot.url.trim(), size: slot.size });
			}
			if (uploads.length === 0) throw new Error('Provide at least one store image (file or URL).');
			const storeImages = Array.isArray(item.storeImages) ? item.storeImages : [];
			const updatedStoreImages = [...storeImages];
			for (const u of uploads) {
				updatedStoreImages.push({ url: u.url, version: '', isPrimary: updatedStoreImages.length === 0, size: u.size });
			}
			const updatedItem = { ...item, storeImages: updatedStoreImages };
			updatePreviewItem(ai, ii, 'storeImages', updatedStoreImages);
			await patchItem(ai, ii, updatedItem, 'Store image added & saved', `${ai}:${ii}`);
			closeStoreImageModal();
		} catch (err: any) {
			toast = { type: 'error', text: 'Upload error: ' + err.message };
		} finally {
			storeUploading = false;
		}
	}

	const modalItem = $derived(imageModal ? parsedPreview?.aisles?.[imageModal.ai]?.items?.[imageModal.ii] : null);

	async function removeAttachedImage(url: string) {
		if (!imageModal || !modalItem) return;
		// Delete the file from GCS too (best-effort) so it doesn't remain accessible.
		try {
			await fetch(API_BASE + 'admin/delete-image', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ url })
			});
		} catch (e) {
			console.error('Failed to delete image from GCS:', e);
		}
		const images = (modalItem.images || []).filter((img: any) => img.url !== url);
		updatePreviewItem(imageModal.ai, imageModal.ii, 'images', images);
		await patchItem(imageModal.ai, imageModal.ii, { ...modalItem, images }, 'Image removed', `${imageModal.ai}:${imageModal.ii}`);
	}

	async function removeAttachedStoreImage(url: string) {
		if (!storeImageModal) return;
		try {
			await fetch(API_BASE + 'admin/delete-image', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ url })
			});
		} catch (e) {
			console.error('Failed to delete store image from GCS:', e);
		}
		const item = parsedPreview?.aisles?.[storeImageModal.ai]?.items?.[storeImageModal.ii];
		if (!item) return;
		const storeImages = (item.storeImages || []).filter((img: any) => img.url !== url);
		updatePreviewItem(storeImageModal.ai, storeImageModal.ii, 'storeImages', storeImages);
		await patchItem(storeImageModal.ai, storeImageModal.ii, { ...item, storeImages }, 'Store image removed', `${storeImageModal.ai}:${storeImageModal.ii}`);
	}
</script>

<svelte:head><title>Admin · {brand?.name || 'GU'}</title></svelte:head>

<div class="min-h-screen bg-gray-50">
	<header class="bg-white border-b border-gray-200">
		<div class="max-w-6xl mx-auto px-6 py-4">
			<a href="/admin/brands" class="text-orange-500 hover:text-orange-600 text-sm font-medium">← Back to Brands</a>
			<div class="flex items-center justify-between mt-2">
				<div class="flex items-center gap-3 min-w-0">
					{#if brand?.logoUrl}
						<img src={brand.logoUrl} alt={brand?.name || 'Logo'} class="w-10 h-10 rounded-xl object-contain bg-white border border-gray-200 flex-shrink-0" />
					{:else if brand?.name}
						<div class="w-10 h-10 rounded-xl bg-violet-100 flex items-center justify-center text-violet-700 font-bold text-lg flex-shrink-0">{brand.name.charAt(0)}</div>
					{/if}
					<div class="min-w-0">
						<h1 class="text-xl font-bold text-gray-900 truncate">{brand?.name || 'Loading...'}</h1>
						<p class="text-sm text-gray-500">{brandId}</p>
					</div>
				</div>
				{#if !isGrocery}
					<span class="text-xs bg-amber-50 text-amber-700 px-3 py-1.5 rounded-full">Only grocery brands are supported</span>
				{/if}
			</div>
			<div class="flex border-b border-gray-200 overflow-x-auto">
				{#each ['upload', 'store', 'replacements'] as tab}
					<button
						onclick={() => (activeTab = tab)}
						class={`px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap cursor-pointer ${activeTab === tab ? 'border-violet-600 text-violet-700' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
					>
						{tab === 'upload' ? 'Upload JSON' : tab === 'store' ? 'Store Aisles' : 'Replacements'}
					</button>
				{/each}
				<a
					href={`/admin/GU/${brandId}/tree-builder`}
					class="ml-1 self-center inline-flex items-center gap-1.5 px-4 py-3 text-sm font-medium border-b-2 border-transparent text-gray-500 whitespace-nowrap transition-colors cursor-pointer hover:text-gray-700 hover:border-gray-300"
				>🌳 Tree builder</a>
			</div>
		</div>
	</header>

	{#if toast}
		<div class="fixed bottom-4 right-4 z-50 px-4 py-3 rounded-xl shadow-lg text-sm font-medium {toast.type === 'error' ? 'bg-red-600 text-white' : 'bg-green-600 text-white'}">{toast.text}</div>
	{/if}

	<main class="max-w-6xl mx-auto px-6 py-6">
		{#if activeTab === 'upload'}
			<div class="bg-white rounded-xl border border-gray-200 p-5">
				<div
					ondragover={(e) => { e.preventDefault(); dragOver = true; }}
					ondragleave={() => (dragOver = false)}
					ondrop={onDrop}
					class={`border-2 border-dashed rounded-xl p-8 text-center transition ${dragOver ? 'border-blue-400 bg-blue-50' : 'border-gray-300'}`}
				>
					<div class="text-3xl mb-2">📄</div>
					<p class="text-sm text-gray-600">Drop a JSON file here, or paste below-1</p>
					<label class="inline-block mt-3 cursor-pointer bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium">
						Browse Files
						<input type="file" accept=".json" class="hidden" onchange={onFile} />
					</label>
				</div>
				<textarea bind:value={uploadText} rows={8} placeholder={'{"items":[{"name":"...","price":2.99,"category":"Trending"}]}'} class="mt-4 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-400"></textarea>
				<div class="mt-3 flex items-center gap-2">
					<button onclick={() => parseContent(uploadText)} class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium">Parse JSON</button>
					{#if error}<span class="text-sm text-red-600">{error}</span>{/if}
				</div>
			</div>

			<div class="bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-3">
				<a href={brand?.brandType === 'grocery' ? `/gstore/${brandId}` : `/store/${brandId}`} target="_blank" rel="noopener noreferrer" class="bg-gray-600 hover:bg-gray-700 text-white text-sm font-semibold px-5 py-2 rounded-lg transition flex items-center gap-2">🌐 Web</a>
				<span class="text-xs text-gray-500">View this store on the public web</span>
			</div>

			{#if parsedPreview}
				<div class="mt-6 bg-white rounded-xl border border-gray-200 overflow-hidden">
					<div class="px-5 py-3 bg-gray-50 border-b border-gray-200 flex flex-wrap items-center gap-2">
						<h2 class="font-semibold text-gray-900 mr-auto">Parsed Preview ({parsedPreview.aisles.length} aisles)</h2>
						<button onclick={handleSavePreview} class="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-lg text-xs font-semibold">Save Preview to DB</button>
						<button onclick={handleAppend} class="bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 rounded-lg text-xs font-semibold">Append to Store Aisles</button>
						<button onclick={handleMerge} class="bg-violet-600 hover:bg-violet-700 text-white px-3 py-1.5 rounded-lg text-xs font-semibold">Merge into Store Aisles</button>
						<button onclick={handleReplace} class="bg-gray-600 hover:bg-gray-700 text-white px-3 py-1.5 rounded-lg text-xs font-semibold">Replace Store Aisles</button>
						<button onclick={handleDeleteAll} disabled={deletingAll} class="bg-red-600 hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white px-3 py-1.5 rounded-lg text-xs font-semibold">{deletingAll ? 'Deleting...' : 'Delete all'}</button>
					</div>
					<p class="px-5 py-2 text-xs text-gray-500 bg-gray-50 border-b border-gray-200">Append adds this file's aisles/items on top of what's already saved — use it to load multiple JSON files one after another.</p>
					<div class="px-5 py-2 bg-white border-b border-gray-200">
						<input type="text" bind:value={previewSearch} placeholder="Search items below..." class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
					</div>
					{#if previewSearch.trim()}
						<div class="px-5 py-3 bg-blue-50/40 border-b border-gray-200">
							<p class="text-xs font-semibold text-gray-600 mb-2">Search results ({searchResults.length})</p>
							{#if searchResults.length === 0}
								<p class="text-xs text-gray-400">No items match "{previewSearch.trim()}"</p>
							{:else}
								<div class="flex gap-2 overflow-x-auto pb-1">
									{#each searchResults as r}
										{@const resultImg = r.item.raw_image_url || (r.item.images || [])[0]?.url || ''}
										<div class="w-44 flex-shrink-0 border border-gray-200 rounded-lg p-2 bg-white flex flex-col">
											<div class="flex items-center gap-1.5">
												<input type="checkbox" checked={selectedItems.has(`${r.ai}:${r.ii}`)} onchange={() => toggleItem(r.ai, r.ii)} class="rounded" />
												<span class="text-[10px] text-gray-400 truncate">{r.category}</span>
											</div>
											<p class="text-xs font-semibold text-gray-800 mt-1 line-clamp-2">{r.item.name}</p>
											<p class="text-[10px] text-gray-500 mt-0.5">${Number(r.item.price || 0).toFixed(2)}</p>
											{#if (r.item.tags || []).length > 0}
												<div class="flex flex-wrap gap-1 mt-1">
													{#each (r.item.tags || []) as tag}
														<span class="text-[9px] font-medium px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 truncate">#{tag}</span>
													{/each}
												</div>
											{/if}
											{#if resultImg}
												<img src={resultImg} alt="" referrerpolicy="no-referrer" class="mt-auto pt-1 w-full h-16 object-contain bg-gray-50 rounded" />
											{/if}
										</div>
									{/each}
								</div>
							{/if}
						</div>
					{/if}
					{#if selectedItems.size > 0}
						<div class="px-5 py-2 bg-amber-50 border-b border-amber-100 flex flex-wrap items-center gap-2">
							<span class="text-xs text-gray-600">{selectedItems.size} selected</span>
							<TagInput value={applyTagInput} onValueChange={(v) => (applyTagInput = v)} onAdd={(tag) => { applyTagInput = tag; applyTagToSelected(); }} tags={allKnownTags} placeholder="Tag..." />
							<button onclick={applyTagToSelected} class="bg-violet-600 text-white px-3 py-1 rounded-lg text-xs font-medium">Apply Tag</button>
							<button onclick={removeAllTagsFromSelected} class="bg-red-600 text-white px-3 py-1 rounded-lg text-xs font-medium">Remove All Tags</button>
						</div>
					{/if}
					<div class="divide-y divide-gray-100">
						{#each parsedPreview.aisles as aisle, ai}
							<div
								draggable="true"
								ondragstart={(e) => { e.dataTransfer!.setData(MIME_AISLE, String(ai)); dragAisle = ai; }}
								ondragend={() => (dragAisle = null)}
								ondragover={(e) => e.preventDefault()}
								ondrop={(e) => onAisleDrop(ai, e)}
								class={`p-4 ${dragAisle === ai ? 'opacity-40' : ''}`}
							>
								<div class="flex items-center gap-2 mb-3 px-3 py-2 rounded-lg bg-gray-100">
									<span class="cursor-grab active:cursor-grabbing select-none text-gray-400" title="Drag to reorder">⠿</span>
									<button type="button" onclick={() => toggleAisleExpanded(ai)} class="text-gray-500 hover:text-gray-700" title={previewExpanded[ai] !== false ? 'Collapse' : 'Expand'}>
										{previewExpanded[ai] !== false ? '▾' : '▸'}
									</button>
									<label class="flex items-center gap-1.5 text-2xl font-bold text-gray-800 cursor-pointer">
										<input type="checkbox" checked={aisle.items.length > 0 && aisle.items.every((_: any, j: number) => selectedItems.has(`${ai}:${j}`))} onchange={() => toggleAisle(ai)} class="rounded" />
										{aisle.category}
									</label>
									<span class="text-xs text-gray-400 ml-auto">{aisle.items.length} items</span>
								</div>
								{#if previewExpanded[ai] !== false}
								<div class="space-y-2">
									{#each aisle.items as item, ii}
										<div class="p-3 bg-gray-50 rounded-lg flex items-start gap-3 text-xs">
											<input type="checkbox" checked={selectedItems.has(`${ai}:${ii}`)} onchange={() => toggleItem(ai, ii)} class="mt-1 rounded" />
											<div class="flex flex-col gap-1 flex-shrink-0">
												{#if item.raw_image_url}
													<img src={item.raw_image_url} alt="" class="w-12 h-12 rounded object-cover border border-gray-100" referrerpolicy="no-referrer" />
												{:else}
													<div class="w-12 h-12 rounded bg-gray-100 flex items-center justify-center text-gray-300">🍽️</div>
												{/if}
												{#if (item.images || []).length > 0}
													<div class="flex gap-1 flex-wrap max-w-[96px]">
														{#each (item.images || []) as img}
															<img src={img.url} alt="" class="w-5 h-5 rounded object-cover border border-gray-200" referrerpolicy="no-referrer" />
														{/each}
													</div>
												{/if}
											</div>
											<div class="flex-1 min-w-0">
												<div class="flex items-center justify-between gap-2">
													<input type="text" value={item.name || ''} oninput={(e) => updatePreviewItem(ai, ii, 'name', (e.currentTarget as HTMLInputElement).value)} class="flex-1 font-semibold border border-gray-300 rounded px-2 py-1" />
													<input type="number" step="0.01" value={item.price} oninput={(e) => updatePreviewItem(ai, ii, 'price', parseFloat((e.currentTarget as HTMLInputElement).value) || 0)} class="w-24 font-bold border border-gray-300 rounded px-2 py-1 text-right" />
												</div>
												<input type="text" value={item.description || ''} oninput={(e) => updatePreviewItem(ai, ii, 'description', (e.currentTarget as HTMLInputElement).value)} placeholder="Description" class="mt-1 w-full border border-gray-300 rounded px-2 py-1" />
												<div class="flex items-center gap-1.5 mt-1 flex-wrap">
													{#each (item.tags || []) as tag}
														<span class="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-amber-50 text-amber-700">#{tag}<button type="button" onclick={() => removeTagFromItem(ai, ii, tag)} class="text-amber-500 hover:text-amber-700 font-bold leading-none">✕</button></span>
													{/each}
													<TagInput value={tagInputs[`${ai}:${ii}`] || ''} onValueChange={(v) => (tagInputs = { ...tagInputs, [`${ai}:${ii}`]: v })} onAdd={(tag) => addTagFromRowInput(ai, ii, tag)} tags={allKnownTags} placeholder="Add tag..." />
													<label class="flex items-center gap-1 text-gray-600"><input type="checkbox" checked={item.available !== false} onchange={(e) => updatePreviewItem(ai, ii, 'available', (e.currentTarget as HTMLInputElement).checked)} class="h-3.5 w-3.5 rounded" /> Available</label>
												</div>
												<div class="mt-2 flex items-center gap-2">
													<span class="text-gray-400">🖼️</span>
													<input type="text" value={item.raw_image_url || ''} oninput={(e) => updatePreviewItem(ai, ii, 'raw_image_url', (e.currentTarget as HTMLInputElement).value)} placeholder="Image URL..." class="flex-1 border border-gray-300 rounded px-2 py-1" />
													<button onclick={() => openImageModal(ai, ii)} class="text-xs text-gray-600 hover:text-gray-800 flex-shrink-0">📷 Edit</button>
												</div>
												{#if (item.images || []).length > 0}
													<div class="mt-2 space-y-1.5">
														{#each item.images as img, imgIdx}
															{@const sizeLbl = img.size ?? (imgIdx === 0 ? '1000' : imgIdx === 1 ? '400' : imgIdx === 2 ? '150' : 'store')}
															<div class="flex items-center gap-2 border border-gray-200 rounded-lg px-2 py-1.5">
																<img src={img.url} alt="" class="w-9 h-9 rounded object-cover flex-shrink-0 border border-gray-100" referrerpolicy="no-referrer" />
<span class={`text-[9px] font-bold px-1.5 py-0.5 rounded ${sizeLbl === 'store' ? 'bg-blue-100 text-blue-700' : sizeLbl === '400' ? 'bg-violet-100 text-violet-700' : 'bg-emerald-100 text-emerald-700'}`}>{sizeLbl === 'store' ? 'Store' : sizeLbl + 'px'}</span>
																<a href={img.url} target="_blank" rel="noopener noreferrer" class="flex-1 min-w-0 text-[10px] text-blue-600 hover:underline truncate">{img.url}</a>
																<button onclick={() => upImageToGC(ai, ii, img.url)} disabled={!isGrocery || gCLoadingKey === `${ai}:${ii}`} class="text-[10px] font-medium text-sky-600 hover:text-sky-800 flex-shrink-0">{gCLoadingKey === `${ai}:${ii}` ? '...' : 'up GC'}</button>
																<button onclick={() => openImageModal(ai, ii)} class="text-[10px] font-medium text-gray-600 hover:text-gray-800 flex-shrink-0">Edit</button>
																<button onclick={() => deleteItemImage(ai, ii, img.url)} class="text-[10px] font-medium text-red-600 hover:text-red-800 flex-shrink-0">Delete</button>
															</div>
														{/each}
													</div>
												{/if}
												{#if (item.storeImages || []).length > 0}
													<div class="mt-3">
														<p class="text-xs font-bold text-gray-700 mb-1">store image</p>
														<div class="space-y-1.5">
															{#each item.storeImages as img, idx}
																<div class="flex items-center gap-2 border border-gray-200 rounded-lg px-2 py-1.5">
																	<img src={img.url} alt="" class="w-9 h-9 rounded object-cover flex-shrink-0 border border-gray-100" referrerpolicy="no-referrer" />
																	<span class="text-[9px] font-bold px-1.5 py-0.5 rounded bg-blue-100 text-blue-700">Store</span>
																	<a href={img.url} target="_blank" rel="noopener noreferrer" class="flex-1 min-w-0 text-[10px] text-blue-600 hover:underline truncate">{img.url}</a>
																	<button onclick={() => upImageToGC(ai, ii, img.url)} disabled={!isGrocery || gCLoadingKey === `${ai}:${ii}`} class="text-[10px] font-medium text-sky-600 hover:text-sky-800 flex-shrink-0">{gCLoadingKey === `${ai}:${ii}` ? '...' : 'up GC'}</button>
																	<button onclick={() => openStoreImageModal(ai, ii)} class="text-[10px] font-medium text-gray-600 hover:text-gray-800 flex-shrink-0">Edit</button>
																	<button onclick={() => deleteStoreImage(ai, ii, img.url)} class="text-[10px] font-medium text-red-600 hover:text-red-800 flex-shrink-0">Delete</button>
																</div>
															{/each}
														</div>
													</div>
												{/if}
												<div class="mt-2">
													<textarea
														value={item.adminNote || ''}
														oninput={(e) => updatePreviewItem(ai, ii, 'adminNote', (e.currentTarget as HTMLTextAreaElement).value)}
														placeholder="Admin note..."
														rows={2}
														class="w-full border border-gray-300 rounded px-2 py-1 text-xs"
													></textarea>
												</div>
												<div class="mt-2 flex justify-end gap-2">
													<button onclick={() => openStoreImageModal(ai, ii)} disabled={!isGrocery} class={`min-w-[72px] px-3 py-1 rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 transition-all duration-200 active:scale-95 ${isGrocery ? 'bg-blue-600 hover:bg-blue-700 text-white' : 'bg-gray-100 text-gray-400 cursor-not-allowed'}`}>store image</button>
													<button onclick={() => openAddImageModal(ai, ii)} disabled={!isGrocery} class={`min-w-[72px] px-3 py-1 rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 transition-all duration-200 active:scale-95 ${isGrocery ? 'bg-violet-600 hover:bg-violet-700 text-white' : 'bg-gray-100 text-gray-400 cursor-not-allowed'}`}>add more image</button>
													<button onclick={() => upToGC(ai, ii)} disabled={!isGrocery || gCLoadingKey === `${ai}:${ii}`} class="bg-sky-600 hover:bg-sky-700 text-white px-3 py-1 rounded-lg text-xs font-medium">{gCLoadingKey === `${ai}:${ii}` ? 'Uploading...' : 'up to GC'}</button>
													<button onclick={() => delGC(ai, ii)} disabled={!isGrocery || delGCLoadingKey === `${ai}:${ii}`} class="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded-lg text-xs font-medium">{delGCLoadingKey === `${ai}:${ii}` ? 'Deleting...' : 'del GC'}</button>
													<!-- <button onclick={() => handleSaveRow(ai, ii)} disabled={!isGrocery || savingRowKey === `${ai}:${ii}`} class="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1 rounded-lg text-xs font-medium">{savingRowKey === `${ai}:${ii}` ? 'Saving...' : 'Save'}</button> -->


													<!-- If using Svelte 4: -->
														<!-- <button 
																onclick={() => handleSaveRow(ai, ii)} 
																disabled={!isGrocery || savingRowKey === `${ai}:${ii}`} 
																class="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1 rounded-lg text-xs font-medium"
															>
																{savingRowKey === `${ai}:${ii}` ? 'Saving...' : 'Save-2'}
															</button> -->


															<button 
																onclick={() => handleSaveRow(ai, ii)} 
																class="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1 rounded-lg text-xs font-medium"
															>
																{savingRowKey === `${ai}:${ii}` ? 'Saving...' : 'Save-2'}
															</button>




												</div>
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


		{:else if activeTab === 'replacements'}
				<div class="bg-white rounded-xl border border-gray-200 p-12 text-center text-gray-400">
					<p class="text-sm">No replacement data available.</p>
				</div>

		{:else}
			<div class="flex items-center justify-between mb-4">
				<p class="text-sm text-gray-500">{aislesData?.aisles?.length || 0} aisles</p>
				<button onclick={handleSaveStoreAisles} class="bg-violet-600 hover:bg-violet-700 text-white px-4 py-2 rounded-lg text-sm font-medium">Save Aisles</button>
			</div>
			{#if !aislesData}
				<div class="text-center py-12 text-gray-400">No store aisles data loaded</div>
			{:else}
				<div class="space-y-3">
					{#each aislesData.aisles as aisle, ai}
						<div class="bg-white rounded-xl border border-gray-200 p-4">
							<div class="flex items-center gap-2 mb-3">
								<input type="text" value={aisle.category} oninput={(e) => updateAisleCategory(ai, (e.currentTarget as HTMLInputElement).value)} class="flex-1 font-semibold border border-gray-300 rounded-lg px-3 py-1.5 text-sm" />
								<button onclick={() => deleteAisle(ai)} class="text-xs text-red-600 hover:text-red-700">🗑 Delete</button>
							</div>
							<div class="space-y-2">
								{#each aisle.items as item, ii}
									<div class="p-3 bg-gray-50 rounded-lg text-xs">
										<div class="grid grid-cols-2 md:grid-cols-4 gap-2">
											<div><label class="text-gray-400 block mb-0.5">Name</label><input type="text" bind:value={item.name} class="w-full border border-gray-300 rounded px-2 py-1" /></div>
											<div><label class="text-gray-400 block mb-0.5">Price</label><input type="number" step="0.01" value={item.price} oninput={(e) => updateItemField(ai, ii, 'price', parseFloat((e.currentTarget as HTMLInputElement).value) || 0)} class="w-full border border-gray-300 rounded px-2 py-1" /></div>
											<div><label class="text-gray-400 block mb-0.5">Image URL</label><input type="text" value={item.raw_image_url || ''} oninput={(e) => updateItemField(ai, ii, 'raw_image_url', (e.currentTarget as HTMLInputElement).value)} class="w-full border border-gray-300 rounded px-2 py-1" /></div>
											<div class="flex items-end justify-between">
												<label class="flex items-center gap-1"><input type="checkbox" checked={item.available !== false} onchange={(e) => updateItemField(ai, ii, 'available', (e.currentTarget as HTMLInputElement).checked)} class="rounded" /> Available</label>
												<button onclick={() => deleteItem(ai, ii)} class="text-red-500 hover:text-red-700">🗑</button>
											</div>
										</div>
										<div class="mt-2"><label class="text-gray-400 block mb-0.5">Description</label><input type="text" value={item.description || ''} oninput={(e) => updateItemField(ai, ii, 'description', (e.currentTarget as HTMLInputElement).value)} placeholder="Description" class="w-full border border-gray-300 rounded px-2 py-1" /></div>
									</div>
								{/each}
								<button onclick={() => addItem(ai)} class="text-xs text-blue-600 hover:text-blue-700 font-medium">+ Add Item</button>
							</div>
						</div>
					{/each}
				</div>
			{/if}
		{/if}
	</main>

	{#if imageModal}
		<div class="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onclick={closeImageModal}>
			<form class="bg-white rounded-2xl p-6 w-full max-w-md max-h-[70vh] overflow-y-auto" onclick={(e) => e.stopPropagation()} onsubmit={(e) => { e.preventDefault(); handleModalUpload(); }}>
				<div class="flex items-center justify-between mb-4">
					<h3 class="text-lg font-bold">{imageModal.mode === 'add' ? 'Add More Image' : 'Edit Image'}</h3>
					<button type="button" onclick={closeImageModal} class="text-gray-400 hover:text-gray-700">&times;</button>
				</div>
				<div class="space-y-4">
					{#if (modalItem?.images || []).length > 0}
						<div>
							<p class="text-sm font-medium text-gray-700 mb-2">Attached images ({modalItem.images.length})</p>
							<div class="space-y-2 max-h-44 overflow-y-auto">
								{#each modalItem.images as img, imgIdx}
									<div class="flex items-center gap-3 border border-gray-200 rounded-xl p-2">
										<img src={img.url} alt="" class="w-12 h-12 rounded object-cover flex-shrink-0 border border-gray-100" referrerpolicy="no-referrer" />
										<a href={img.url} target="_blank" rel="noopener noreferrer" class="flex-1 min-w-0 text-xs text-blue-600 hover:underline truncate">{img.url}</a>
										<div class="flex items-center gap-1 flex-shrink-0">
											<button type="button" onclick={() => { modalUrl = img.url; if (imageModal.mode === 'add') { modalUrl2 = ''; modalFile = null; modalFile2 = null; } }} class="text-xs text-gray-600 hover:text-gray-900" title="Edit">Edit</button>
											<button type="button" onclick={() => removeAttachedImage(img.url)} class="text-xs text-red-600 hover:text-red-800" title="Delete">Delete</button>
										</div>
									</div>
								{/each}
							</div>
						</div>
					{/if}
					{#if imageModal.mode === 'add'}
						<div
							ondragover={(e) => { e.preventDefault(); modalBatchDrag = true; }}
							ondragleave={() => (modalBatchDrag = false)}
							ondrop={handleBatchDrop}
							onclick={() => batchFileInput?.click()}
							class={`border-2 border-dashed rounded-xl p-5 text-center cursor-pointer ${modalBatchDrag ? 'border-blue-400 bg-blue-50' : 'border-gray-300'}`}
						>
							<p class="text-sm text-gray-500 mb-2">Drop up to 3 images together, or</p>
							<button type="button" onclick={(e) => { e.stopPropagation(); batchFileInput?.click(); }} class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium cursor-pointer">Browse files</button>
							<input type="file" accept="image/*" multiple class="sr-only" bind:this={batchFileInput} onchange={(e) => { handleBatchFiles(e.currentTarget.files); e.currentTarget.value = ''; }} />
							<p class="text-xs text-gray-400 mt-2">Auto-assigns by filename: _card (1000px) · _detail (400px) · _thumb (150px)</p>
						</div>
						<div>
							<div class="flex items-center justify-between mb-1">
								<label class="block text-sm font-medium text-gray-700">Image 1 (1000px)</label>
								<div class="flex gap-1">
									<button type="button" onclick={() => moveModalFile(0, 0 - 1)} disabled class="w-6 h-6 rounded bg-gray-100 hover:bg-gray-200 disabled:opacity-30">↑</button>
									<button type="button" onclick={() => moveModalFile(0, 0 + 1)} class="w-6 h-6 rounded bg-gray-100 hover:bg-gray-200">↓</button>
								</div>
							</div>
							<div
								ondragover={(e) => { e.preventDefault(); modalDragOver = true; }}
								ondragleave={() => (modalDragOver = false)}
								ondrop={(e) => { e.preventDefault(); modalDragOver = false; const f = e.dataTransfer?.files?.[0]; if (f) { modalFile = f; modalFilePreview = URL.createObjectURL(f); } }}
								onclick={() => fileInput1?.click()}
								class={`border-2 border-dashed rounded-xl p-5 text-center cursor-pointer ${modalDragOver ? 'border-blue-400 bg-blue-50' : 'border-gray-300'}`}
							>
								<p class="text-sm text-gray-500 mb-2">Drop image or</p>
								<button type="button" onclick={(e) => { e.stopPropagation(); fileInput1?.click(); }} class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium cursor-pointer">Browse</button>
								<input type="file" accept="image/*" class="sr-only" bind:this={fileInput1} onchange={(e) => { const f = (e.currentTarget as HTMLInputElement).files?.[0]; if (f) { modalFile = f; modalFilePreview = URL.createObjectURL(f); } e.currentTarget.value = ''; }} />
								{#if modalFilePreview}
									<img src={modalFilePreview} alt="Preview" class="mt-2 w-24 h-24 mx-auto rounded-lg object-cover border border-gray-200" />
								{:else if modalFile}<p class="text-xs text-gray-500 mt-2">{modalFile.name}</p>{/if}
							</div>
							<input type="text" bind:value={modalUrl} placeholder="or image URL https://..." class="mt-2 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
						</div>
						<div>
							<div class="flex items-center justify-between mb-1">
								<label class="block text-sm font-medium text-gray-700">Image 2 (400px)</label>
								<div class="flex gap-1">
									<button type="button" onclick={() => moveModalFile(1, 1 - 1)} class="w-6 h-6 rounded bg-gray-100 hover:bg-gray-200">↑</button>
									<button type="button" onclick={() => moveModalFile(1, 1 + 1)} class="w-6 h-6 rounded bg-gray-100 hover:bg-gray-200">↓</button>
								</div>
							</div>
							<div
								ondragover={(e) => { e.preventDefault(); modalDragOver2 = true; }}
								ondragleave={() => (modalDragOver2 = false)}
								ondrop={(e) => { e.preventDefault(); modalDragOver2 = false; const f = e.dataTransfer?.files?.[0]; if (f) { modalFile2 = f; modalFile2Preview = URL.createObjectURL(f); } }}
								onclick={() => fileInput2?.click()}
								class={`border-2 border-dashed rounded-xl p-5 text-center cursor-pointer ${modalDragOver2 ? 'border-blue-400 bg-blue-50' : 'border-gray-300'}`}
							>
								<p class="text-sm text-gray-500 mb-2">Drop image or</p>
								<button type="button" onclick={(e) => { e.stopPropagation(); fileInput2?.click(); }} class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium cursor-pointer">Browse</button>
								<input type="file" accept="image/*" class="sr-only" bind:this={fileInput2} onchange={(e) => { const f = (e.currentTarget as HTMLInputElement).files?.[0]; if (f) { modalFile2 = f; modalFile2Preview = URL.createObjectURL(f); } e.currentTarget.value = ''; }} />
								{#if modalFile2Preview}
									<img src={modalFile2Preview} alt="Preview" class="mt-2 w-24 h-24 mx-auto rounded-lg object-cover border border-gray-200" />
								{:else if modalFile2}<p class="text-xs text-gray-500 mt-2">{modalFile2.name}</p>{/if}
							</div>
							<input type="text" bind:value={modalUrl2} placeholder="or image URL https://..." class="mt-2 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
						</div>
						<div>
							<div class="flex items-center justify-between mb-1">
								<label class="block text-sm font-medium text-gray-700">Image 3 (150px)</label>
								<div class="flex gap-1">
									<button type="button" onclick={() => moveModalFile(2, 2 - 1)} class="w-6 h-6 rounded bg-gray-100 hover:bg-gray-200">↑</button>
									<button type="button" onclick={() => moveModalFile(2, 2 + 1)} disabled class="w-6 h-6 rounded bg-gray-100 hover:bg-gray-200 disabled:opacity-30">↓</button>
								</div>
							</div>
							<div
								ondragover={(e) => { e.preventDefault(); modalDragOver3 = true; }}
								ondragleave={() => (modalDragOver3 = false)}
								ondrop={(e) => { e.preventDefault(); modalDragOver3 = false; const f = e.dataTransfer?.files?.[0]; if (f) { modalFile3 = f; modalFile3Preview = URL.createObjectURL(f); } }}
								onclick={() => fileInput3?.click()}
								class={`border-2 border-dashed rounded-xl p-5 text-center cursor-pointer ${modalDragOver3 ? 'border-blue-400 bg-blue-50' : 'border-gray-300'}`}
							>
								<p class="text-sm text-gray-500 mb-2">Drop image or</p>
								<button type="button" onclick={(e) => { e.stopPropagation(); fileInput3?.click(); }} class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium cursor-pointer">Browse</button>
								<input type="file" accept="image/*" class="sr-only" bind:this={fileInput3} onchange={(e) => { const f = (e.currentTarget as HTMLInputElement).files?.[0]; if (f) { modalFile3 = f; modalFile3Preview = URL.createObjectURL(f); } e.currentTarget.value = ''; }} />
								{#if modalFile3Preview}
									<img src={modalFile3Preview} alt="Preview" class="mt-2 w-24 h-24 mx-auto rounded-lg object-cover border border-gray-200" />
								{:else if modalFile3}<p class="text-xs text-gray-500 mt-2">{modalFile3.name}</p>{/if}
							</div>
							<input type="text" bind:value={modalUrl3} placeholder="or image URL https://..." class="mt-2 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
						</div>
						<div>
							<div class="flex items-center justify-between mb-1">
								<label class="block text-sm font-medium text-gray-700">Store Image</label>
								<div class="flex gap-1">
									<button type="button" onclick={() => moveModalFile(3, 3 - 1)} class="w-6 h-6 rounded bg-gray-100 hover:bg-gray-200">↑</button>
									<button type="button" onclick={() => moveModalFile(3, 3 + 1)} disabled class="w-6 h-6 rounded bg-gray-100 hover:bg-gray-200 disabled:opacity-30">↓</button>
								</div>
							</div>
							<div
								ondragover={(e) => { e.preventDefault(); modalDragOver4 = true; }}
								ondragleave={() => (modalDragOver4 = false)}
								ondrop={(e) => { e.preventDefault(); modalDragOver4 = false; const f = e.dataTransfer?.files?.[0]; if (f) { modalFile4 = f; modalFile4Preview = URL.createObjectURL(f); } }}
								onclick={() => fileInput4?.click()}
								class={`border-2 border-dashed rounded-xl p-5 text-center cursor-pointer ${modalDragOver4 ? 'border-blue-400 bg-blue-50' : 'border-gray-300'}`}
							>
								<p class="text-sm text-gray-500 mb-2">Drop image or</p>
								<button type="button" onclick={(e) => { e.stopPropagation(); fileInput4?.click(); }} class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium cursor-pointer">Browse</button>
								<input type="file" accept="image/*" class="sr-only" bind:this={fileInput4} onchange={(e) => { const f = (e.currentTarget as HTMLInputElement).files?.[0]; if (f) { modalFile4 = f; modalFile4Preview = URL.createObjectURL(f); } e.currentTarget.value = ''; }} />
								{#if modalFile4Preview}
									<img src={modalFile4Preview} alt="Preview" class="mt-2 w-24 h-24 mx-auto rounded-lg object-cover border border-gray-200" />
								{:else if modalFile4}<p class="text-xs text-gray-500 mt-2">{modalFile4.name}</p>{/if}
							</div>
							<input type="text" bind:value={modalUrl4} placeholder="or image URL https://..." class="mt-2 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
						</div>
						<div>
							<label class="block text-sm font-medium text-gray-700 mb-1">Search tags (comma separated)</label>
							<input type="text" bind:value={modalSearchTags} placeholder="e.g. orange, juice, beverage, citrus" class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
						</div>
					{:else}
						<div>
							<div
								ondragover={(e) => { e.preventDefault(); modalDragOver = true; }}
								ondragleave={() => (modalDragOver = false)}
								ondrop={(e) => { e.preventDefault(); modalDragOver = false; const f = e.dataTransfer?.files?.[0]; if (f) modalFile = f; }}
								onclick={() => fileInput1?.click()}
								class={`border-2 border-dashed rounded-xl p-5 text-center cursor-pointer ${modalDragOver ? 'border-blue-400 bg-blue-50' : 'border-gray-300'}`}
							>
								<p class="text-sm text-gray-500 mb-2">Drop image or</p>
								<button type="button" onclick={(e) => { e.stopPropagation(); fileInput1?.click(); }} class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium cursor-pointer">Browse</button>
								<input type="file" accept="image/*" class="sr-only" bind:this={fileInput1} onchange={(e) => { const f = (e.currentTarget as HTMLInputElement).files?.[0]; if (f) modalFile = f; e.currentTarget.value = ''; }} />
								{#if modalFile}<p class="text-xs text-gray-500 mt-2">{modalFile.name}</p>{/if}
							</div>
							<input type="text" bind:value={modalUrl} placeholder="or image URL https://..." class="mt-2 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
						</div>
					{/if}
				</div>
				<button type="submit" disabled={modalUploading} class="mt-4 w-full bg-violet-600 hover:bg-violet-700 text-white font-semibold py-3 rounded-lg">{modalUploading ? 'Uploading...' : (imageModal.mode === 'add' ? 'Add' : 'Save Image')}</button>
			</form>
		</div>
	{/if}

	{#if storeImageModal}
		<div class="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onclick={closeStoreImageModal}>
			<form class="bg-white rounded-2xl p-6 w-full max-w-md max-h-[70vh] overflow-y-auto" onclick={(e) => e.stopPropagation()} onsubmit={(e) => { e.preventDefault(); handleStoreImageUpload(); }}>
				<div class="flex items-center justify-between mb-4">
					<h3 class="text-lg font-bold">Add Store Image</h3>
					<button type="button" onclick={closeStoreImageModal} class="text-gray-400 hover:text-gray-700">&times;</button>
				</div>
				<div class="space-y-4">
					{#if storeImageModal && parsedPreview?.aisles?.[storeImageModal.ai]?.items?.[storeImageModal.ii]?.storeImages?.length}
						{@const storeImgItem = parsedPreview.aisles[storeImageModal.ai].items[storeImageModal.ii]}
						<div>
							<p class="text-sm font-medium text-gray-700 mb-2">Attached store images ({storeImgItem.storeImages.length})</p>
							<div class="space-y-2 max-h-44 overflow-y-auto">
								{#each storeImgItem.storeImages as img, imgIdx}
									<div class="flex items-center gap-3 border border-gray-200 rounded-xl p-2">
										<img src={img.url} alt="" class="w-12 h-12 rounded object-cover flex-shrink-0 border border-gray-100" referrerpolicy="no-referrer" />
										<a href={img.url} target="_blank" rel="noopener noreferrer" class="flex-1 min-w-0 text-xs text-blue-600 hover:underline truncate">{img.url}</a>
										<div class="flex items-center gap-1 flex-shrink-0">
											<button type="button" onclick={() => { storeUrl1 = img.url; }} class="text-xs text-gray-600 hover:text-gray-900" title="Edit">Edit</button>
											<button type="button" onclick={() => removeAttachedStoreImage(img.url)} class="text-xs text-red-600 hover:text-red-800" title="Delete">Delete</button>
										</div>
									</div>
								{/each}
							</div>
						</div>
					{/if}
					<div
						ondragover={(e) => { e.preventDefault(); storeBatchDrag = true; }}
						ondragleave={() => (storeBatchDrag = false)}
						ondrop={handleStoreBatchDrop}
						onclick={() => storeBatchInput?.click()}
						class={`border-2 border-dashed rounded-xl p-5 text-center cursor-pointer ${storeBatchDrag ? 'border-blue-400 bg-blue-50' : 'border-gray-300'}`}
					>
						<p class="text-sm text-gray-500 mb-2">Drop up to 3 store images together, or</p>
						<button type="button" onclick={(e) => { e.stopPropagation(); storeBatchInput?.click(); }} class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium cursor-pointer">Browse files</button>
						<input type="file" accept="image/*" multiple class="sr-only" bind:this={storeBatchInput} onchange={(e) => { handleStoreBatchFiles(e.currentTarget.files); e.currentTarget.value = ''; }} />
						<p class="text-xs text-gray-400 mt-2">Auto-assigns by filename: _store_card · _store_detail · _store_thumb</p>
					</div>
					<div>
						<div class="flex items-center justify-between mb-1">
							<label class="block text-sm font-medium text-gray-700">Store Image 1 (store-1000)</label>
						</div>
						<div
							ondragover={(e) => { e.preventDefault(); storeDragOver1 = true; }}
							ondragleave={() => (storeDragOver1 = false)}
							ondrop={(e) => { e.preventDefault(); storeDragOver1 = false; const f = e.dataTransfer?.files?.[0]; if (f) { storeFile1 = f; storeFile1Preview = URL.createObjectURL(f); } }}
							onclick={() => storeFileInput1?.click()}
							class={`border-2 border-dashed rounded-xl p-5 text-center cursor-pointer ${storeDragOver1 ? 'border-blue-400 bg-blue-50' : 'border-gray-300'}`}
						>
							<p class="text-sm text-gray-500 mb-2">Drop image or</p>
							<button type="button" onclick={(e) => { e.stopPropagation(); storeFileInput1?.click(); }} class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium cursor-pointer">Browse</button>
							<input type="file" accept="image/*" class="sr-only" bind:this={storeFileInput1} onchange={(e) => { const f = (e.currentTarget as HTMLInputElement).files?.[0]; if (f) { storeFile1 = f; storeFile1Preview = URL.createObjectURL(f); } e.currentTarget.value = ''; }} />
							{#if storeFile1Preview}
								<img src={storeFile1Preview} alt="Preview" class="mt-2 w-24 h-24 mx-auto rounded-lg object-cover border border-gray-200" />
							{:else if storeFile1}<p class="text-xs text-gray-500 mt-2">{storeFile1.name}</p>{/if}
						</div>
						<input type="text" bind:value={storeUrl1} placeholder="or image URL https://..." class="mt-2 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
					</div>
					<div>
						<div class="flex items-center justify-between mb-1">
							<label class="block text-sm font-medium text-gray-700">Store Image 2 (store-400)</label>
						</div>
						<div
							ondragover={(e) => { e.preventDefault(); storeDragOver2 = true; }}
							ondragleave={() => (storeDragOver2 = false)}
							ondrop={(e) => { e.preventDefault(); storeDragOver2 = false; const f = e.dataTransfer?.files?.[0]; if (f) { storeFile2 = f; storeFile2Preview = URL.createObjectURL(f); } }}
							onclick={() => storeFileInput2?.click()}
							class={`border-2 border-dashed rounded-xl p-5 text-center cursor-pointer ${storeDragOver2 ? 'border-blue-400 bg-blue-50' : 'border-gray-300'}`}
						>
							<p class="text-sm text-gray-500 mb-2">Drop image or</p>
							<button type="button" onclick={(e) => { e.stopPropagation(); storeFileInput2?.click(); }} class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium cursor-pointer">Browse</button>
							<input type="file" accept="image/*" class="sr-only" bind:this={storeFileInput2} onchange={(e) => { const f = (e.currentTarget as HTMLInputElement).files?.[0]; if (f) { storeFile2 = f; storeFile2Preview = URL.createObjectURL(f); } e.currentTarget.value = ''; }} />
							{#if storeFile2Preview}
								<img src={storeFile2Preview} alt="Preview" class="mt-2 w-24 h-24 mx-auto rounded-lg object-cover border border-gray-200" />
							{:else if storeFile2}<p class="text-xs text-gray-500 mt-2">{storeFile2.name}</p>{/if}
						</div>
						<input type="text" bind:value={storeUrl2} placeholder="or image URL https://..." class="mt-2 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
					</div>
					<div>
						<div class="flex items-center justify-between mb-1">
							<label class="block text-sm font-medium text-gray-700">Store Image 3 (store-150)</label>
						</div>
						<div
							ondragover={(e) => { e.preventDefault(); storeDragOver3 = true; }}
							ondragleave={() => (storeDragOver3 = false)}
							ondrop={(e) => { e.preventDefault(); storeDragOver3 = false; const f = e.dataTransfer?.files?.[0]; if (f) { storeFile3 = f; storeFile3Preview = URL.createObjectURL(f); } }}
							onclick={() => storeFileInput3?.click()}
							class={`border-2 border-dashed rounded-xl p-5 text-center cursor-pointer ${storeDragOver3 ? 'border-blue-400 bg-blue-50' : 'border-gray-300'}`}
						>
							<p class="text-sm text-gray-500 mb-2">Drop image or</p>
							<button type="button" onclick={(e) => { e.stopPropagation(); storeFileInput3?.click(); }} class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium cursor-pointer">Browse</button>
							<input type="file" accept="image/*" class="sr-only" bind:this={storeFileInput3} onchange={(e) => { const f = (e.currentTarget as HTMLInputElement).files?.[0]; if (f) { storeFile3 = f; storeFile3Preview = URL.createObjectURL(f); } e.currentTarget.value = ''; }} />
							{#if storeFile3Preview}
								<img src={storeFile3Preview} alt="Preview" class="mt-2 w-24 h-24 mx-auto rounded-lg object-cover border border-gray-200" />
							{:else if storeFile3}<p class="text-xs text-gray-500 mt-2">{storeFile3.name}</p>{/if}
						</div>
						<input type="text" bind:value={storeUrl3} placeholder="or image URL https://..." class="mt-2 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
					</div>
				</div>
				<button type="submit" disabled={storeUploading} class="mt-4 w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-lg">{storeUploading ? 'Uploading...' : 'Add'}</button>
			</form>
		</div>
	{/if}
</div>
