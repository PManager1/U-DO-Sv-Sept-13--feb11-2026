<script lang="ts">
	import { onMount } from 'svelte';
	import API_BASE from '$lib/api';

	let { brandId, initialImages = [], onImagesChange, imageTags = {}, onImageTagsChange, onImageDragStart = () => {} } = $props();

	let images = $state<string[]>([...initialImages]);
	let uploading = $state(false);
	let dragActive = $state(false);
	let error = $state<string | null>(null);
	let dragIndex = $state<number | null>(null);
	let dragOverIndex = $state<number | null>(null);
	let savingOrder = $state(false);
	let selected = $state(new Set<string>());
	let description = $state('');

	let tagOptions = $state<string[]>([]);
	let selectedImageTags = $state<string[]>([]);
	let showTagDropdown = $state(false);
	let tagFilter = $state('');

	onMount(() => {
		fetch(API_BASE + 'admin/brand-tags')
			.then((r) => r.json())
			.then((data: any) => {
				if (Array.isArray(data)) tagOptions = [...new Set((data as string[]).map(String))];
				else if (Array.isArray(data.values)) tagOptions = [...new Set((data.values as string[]).map(String))];
				else if (Array.isArray(data.tags)) tagOptions = [...new Set((data.tags as string[]).map(String))];
			})
			.catch(() => {});
	});

	async function applyTags(remove: boolean) {
		if (selected.size === 0 || selectedImageTags.length === 0) return;
		const currentTags: Record<string, string[]> = { ...imageTags };
		for (const url of selected) {
			const existing: string[] = currentTags[url] || [];
			if (remove) {
				currentTags[url] = existing.filter((t) => !selectedImageTags.includes(t));
				if (currentTags[url].length === 0) delete currentTags[url];
			} else {
				currentTags[url] = [...new Set([...existing, ...selectedImageTags])];
			}
		}
		try {
			const res = await fetch(API_BASE + `admin/brands/${brandId}`, {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ imageTags: currentTags })
			});
			if (res.ok) {
				onImageTagsChange?.(currentTags);
				selectedImageTags = [];
				showTagDropdown = false;
			} else {
				const d = await res.json();
				console.error('Failed to apply tags:', d.message || d.error);
			}
		} catch (err) {
			console.error('Network error applying tags:', err);
		}
	}

	async function handleFiles(files: File[]) {
		if (!files.length) return;
		uploading = true;
		error = null;
		const formData = new FormData();
		files.forEach((f) => formData.append('images', f));
		try {
			const res = await fetch(API_BASE + `admin/brands/${brandId}/carousel`, { method: 'POST', body: formData });
			if (res.ok) {
				const data = await res.json();
				const newUrls = data.urls || [];
				images = [...images, ...newUrls];
				onImagesChange?.(images);
			} else {
				const d = await res.json();
				error = d.message || 'Upload failed';
			}
		} catch (err: any) {
			error = err.message || 'Upload failed';
		} finally {
			uploading = false;
		}
	}

	function onDrop(e: DragEvent) {
		e.preventDefault();
		e.stopPropagation();
		dragActive = false;
		const files = Array.from(e.dataTransfer?.files || []);
		if (files.length) handleFiles(files);
	}
	function onDragEnter(e: DragEvent) { e.preventDefault(); e.stopPropagation(); dragActive = true; }
	function onDragLeave(e: DragEvent) { e.preventDefault(); e.stopPropagation(); dragActive = false; }
	function onDragOver(e: DragEvent) { e.preventDefault(); e.stopPropagation(); }
	function onFileInput(e: Event) {
		const files = Array.from((e.currentTarget as HTMLInputElement).files || []);
		if (files.length) handleFiles(files);
		(e.currentTarget as HTMLInputElement).value = '';
	}

	async function removeImage(index: number) {
		const removed = images[index];
		const updated = images.filter((_, i) => i !== index);
		try {
			await fetch(API_BASE + `admin/brands/${brandId}/carousel`, {
				method: 'DELETE',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ urls: [removed] })
			});
		} catch (err) {
			console.error('Failed to delete carousel image:', err);
		}
		images = updated;
		onImagesChange?.(updated);
	}

	async function saveOrder(newOrder: string[]) {
		savingOrder = true;
		try {
			await fetch(API_BASE + `admin/brands/${brandId}`, {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ carouselImages: newOrder })
			});
		} catch (err) {
			console.error('Failed to save image order:', err);
		} finally {
			savingOrder = false;
		}
	}

	function onReorderStart(e: DragEvent, index: number) {
		dragIndex = index;
		if (e.dataTransfer) {
			e.dataTransfer.effectAllowed = 'copyMove';
			e.dataTransfer.setData('text/plain', String(index));
			const url = images[index];
			e.dataTransfer.setData('text/uri-list', url);
			e.dataTransfer.setData('text/html', `<a href="${url}">${url}</a>`);
			onImageDragStart?.(url);
		}
	}
	function onReorderOver(e: DragEvent, index: number) {
		e.preventDefault();
		e.stopPropagation();
		if (dragIndex === null || dragIndex === index) return;
		dragOverIndex = index;
	}
	function onReorderDrop(e: DragEvent, dropIndex: number) {
		e.preventDefault();
		e.stopPropagation();
		if (dragIndex === null || dragIndex === dropIndex) {
			dragIndex = null;
			dragOverIndex = null;
			return;
		}
		const newImages = [...images];
		const [moved] = newImages.splice(dragIndex, 1);
		newImages.splice(dropIndex, 0, moved);
		images = newImages;
		dragIndex = null;
		dragOverIndex = null;
		saveOrder(newImages);
	}
	function onReorderEnd() {
		dragIndex = null;
		dragOverIndex = null;
	}

	function toggleSelect(url: string) {
		const next = new Set(selected);
		if (next.has(url)) next.delete(url);
		else next.add(url);
		selected = next;
	}
	function selectAll() {
		selected = selected.size === images.length ? new Set() : new Set(images);
	}

	async function deleteImages(all: boolean) {
		const urlsToDelete = all ? [...images] : [...selected];
		if (!urlsToDelete.length) return;
		const msg = all ? `Are you sure you want to delete all ${urlsToDelete.length} images?` : `Are you sure you want to delete ${urlsToDelete.length} selected images?`;
		if (!confirm(msg)) return;
		try {
			await fetch(API_BASE + `admin/brands/${brandId}/carousel`, {
				method: 'DELETE',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ urls: urlsToDelete })
			});
		} catch (err) {
			console.error('Failed to delete carousel images:', err);
		}
		const remaining = images.filter((u) => !urlsToDelete.includes(u));
		images = remaining;
		selected = new Set();
		onImagesChange?.(remaining);
	}
</script>

<div class="space-y-3">
	<div
		class={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${dragActive ? 'border-blue-400 bg-blue-50' : 'border-gray-300 hover:border-gray-400'} ${uploading ? 'opacity-50 pointer-events-none' : ''}`}
		ondragenter={onDragEnter}
		ondragover={onDragOver}
		ondragleave={onDragLeave}
		ondrop={onDrop}
	>
		<div class="space-y-2">
			<div class="text-2xl">📷</div>
			<p class="text-sm font-medium text-gray-700">Drag &amp; drop new images here to upload -1</p>
			<p class="text-xs text-gray-500">or click to browse files</p>
			<label class="inline-block">
				<input type="file" multiple accept="image/*" class="hidden" onchange={onFileInput} disabled={uploading} />
				<span class="cursor-pointer bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition inline-block">Select Images</span>
			</label>
			<p class="text-xs text-gray-400">Supported: JPG, PNG, WebP (Max 5MB each)</p>
		</div>
	</div>

	{#if uploading}
		<div class="flex items-center gap-2 text-sm text-blue-600">
			<div class="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
			Uploading images...
		</div>
	{/if}
	{#if savingOrder}
		<div class="flex items-center gap-2 text-sm text-violet-600">
			<div class="animate-spin rounded-full h-4 w-4 border-b-2 border-violet-600"></div>
			Saving order...
		</div>
	{/if}
	{#if error}
		<div class="bg-red-50 border border-red-200 rounded-lg p-3"><p class="text-sm text-red-600">{error}</p></div>
	{/if}

	{#if images.length > 0}
		<div>
			<div class="flex items-center justify-between mb-2">
				<p class="text-sm font-medium text-gray-700">Carousel Images -2 ({images.length}) · <span class="text-gray-400 font-normal">Drag to reorder</span></p>
				<button onclick={() => deleteImages(selected.size > 0)} class="text-xs text-red-600 hover:text-red-700">
					{selected.size > 0 ? 'Delete Selected Images' : 'Delete All Images'}
				</button>
			</div>

			<div class="flex items-center gap-3 mb-2">
				<label class="flex items-center gap-1.5 text-xs text-gray-500 cursor-pointer hover:text-gray-700 select-none">
					<input type="checkbox" checked={images.length > 0 && selected.size === images.length} onchange={selectAll} class="rounded" />
					Select All
				</label>
				<span onclick={() => (selected = new Set())} class="text-xs text-gray-400 hover:text-gray-600 cursor-pointer ml-2">Unselect all</span>
				{#if selected.size > 0}<span class="text-xs text-blue-600 font-medium">{selected.size} selected</span>{/if}
			</div>

			{#if selected.size > 0}
				<div class="relative mb-2">
					<div class="flex items-center gap-2 flex-wrap">
						<div class="relative">
							<button onclick={() => { showTagDropdown = !showTagDropdown; tagFilter = ''; }} class="border border-gray-300 rounded-lg px-3 py-1.5 text-xs bg-white hover:bg-gray-50 flex items-center gap-2 min-w-[140px]">
								<span class={selectedImageTags.length === 0 ? 'text-gray-400' : 'text-gray-700'}>
									{selectedImageTags.length === 0 ? 'Assign tags...' : `${selectedImageTags.length} tag${selectedImageTags.length > 1 ? 's' : ''}`}
								</span>
								<svg class={`w-3.5 h-3.5 text-gray-400 transition-transform ml-auto ${showTagDropdown ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" /></svg>
							</button>
							{#if showTagDropdown}
								<div class="absolute z-20 mt-1 left-0 w-72 border border-gray-200 rounded-lg bg-white shadow-lg">
									<div class="sticky top-0 bg-white border-b border-gray-100 px-2 py-1.5">
										<input type="text" bind:value={tagFilter} placeholder="Search tags..." class="w-full border border-gray-200 rounded-md px-2 py-1.5 text-xs outline-none focus:border-blue-400" />
									</div>
									<div class="max-h-60 overflow-y-auto">
										{#if tagOptions.length === 0}
											<div class="px-3 py-2 text-xs text-gray-400">No tags available</div>
										{:else}
											{#each tagOptions.filter((t) => t.toLowerCase().includes(tagFilter.toLowerCase())) as tag}
												<label class="flex items-center gap-2 px-3 py-2 hover:bg-gray-50 cursor-pointer text-xs">
													<input type="checkbox" checked={selectedImageTags.includes(tag)} onchange={() => { selectedImageTags = selectedImageTags.includes(tag) ? selectedImageTags.filter((t) => t !== tag) : [...selectedImageTags, tag]; }} class="rounded" />
													{tag}
												</label>
											{/each}
										{/if}
									</div>
								</div>
							{/if}
						</div>
						<button onclick={() => applyTags(false)} disabled={selectedImageTags.length === 0} class="bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs px-3 py-1.5 rounded-md font-medium transition whitespace-nowrap">Apply</button>
						<button onclick={() => applyTags(true)} disabled={selectedImageTags.length === 0} class="bg-red-500 hover:bg-red-600 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs px-3 py-1.5 rounded-md font-medium transition whitespace-nowrap">Remove</button>
					</div>
				</div>
			{/if}

			<div class="grid grid-cols-2 md:grid-cols-4 gap-3">
				{#each images as url, i (url)}
				<div
					draggable="true"
					ondragstart={(e) => onReorderStart(e, i)}
						ondragover={(e) => onReorderOver(e, i)}
						ondrop={(e) => onReorderDrop(e, i)}
						ondragend={onReorderEnd}
						onclick={() => toggleSelect(url)}
						class={`relative group cursor-pointer rounded-lg border-2 transition-all ${selected.has(url) ? 'ring-2 ring-blue-500 border-blue-500' : ''} ${dragIndex === i ? 'opacity-40 border-gray-300 scale-95' : dragOverIndex === i ? 'border-blue-500 bg-blue-50 scale-105 shadow-md' : 'border-gray-200 hover:border-gray-300'}`}
					>
						<img src={url} alt={`Carousel ${i + 1}`} class="w-full h-24 object-cover rounded-lg" draggable="false" />
						{#if selected.has(url)}
							<div class="absolute inset-0 bg-blue-600/30 rounded-lg flex items-center justify-center pointer-events-none">
								<svg class="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7" /></svg>
							</div>
						{/if}
						<span class="absolute top-1 left-8 bg-black/60 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold">{i + 1}</span>
						<button onclick={(e) => { e.stopPropagation(); removeImage(i); }} class="absolute top-1 right-1 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-xs hover:bg-red-600">×</button>
						<a href={url} target="_blank" rel="noreferrer" onclick={(e) => e.stopPropagation()} class="absolute bottom-1 left-1 bg-black/50 text-white rounded px-1.5 py-0.5 text-xs opacity-0 group-hover:opacity-100 transition-opacity">View</a>
						{#if imageTags?.[url]?.length > 0}
							<div class="absolute bottom-1 left-1 right-7 flex flex-wrap gap-0.5 pointer-events-none">
								{#each imageTags[url] as tag}<span class="bg-blue-600/80 text-white text-[10px] px-1 py-0.5 rounded">{tag}</span>{/each}
							</div>
						{/if}
						<div class="absolute bottom-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity text-white text-xs bg-black/50 rounded px-1.5 py-0.5">⠿</div>
					</div>
				{/each}
			</div>
		</div>
	{/if}
</div>
