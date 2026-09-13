<script lang="ts">
	import { onMount } from 'svelte';
	import API_BASE from '$lib/api';

	let { value = '', onChange, placeholder = 'Type to add tags...' } = $props();

	let allTags = $state<string[]>([]);
	let inputValue = $state('');
	let showDropdown = $state(false);
	let filtered = $state<string[]>([]);
	let highlightIdx = $state(-1);

	const tags = $derived(value ? value.split(',').map((s) => s.trim()).filter(Boolean) : []);

	onMount(() => {
		fetch(API_BASE + 'admin/brand-tags')
			.then((r) => r.json())
			.then((data: any) => {
				if (Array.isArray(data)) allTags = [...new Set((data as string[]).map(String))];
				else if (Array.isArray(data.values)) allTags = [...new Set((data.values as string[]).map(String))];
				else if (Array.isArray(data.tags)) allTags = [...new Set((data.tags as string[]).map(String))];
			})
			.catch(() => {});
	});

	$effect(() => {
		const q = inputValue.trim().toLowerCase();
		if (!q) {
			filtered = [];
			showDropdown = false;
			return;
		}
		const fromAll = allTags.filter((t) => t.toLowerCase().includes(q));
		const current = value ? value.split(',').map((s) => s.trim().toLowerCase()).filter(Boolean) : [];
		const extra = current.filter((t) => t.includes(q) && !fromAll.includes(t));
		filtered = [...fromAll, ...extra];
		showDropdown = fromAll.length > 0 || extra.length > 0;
		highlightIdx = -1;
	});

	function addTag(tag: string) {
		const newTags = [...tags, tag];
		onChange(newTags.join(', '));
		inputValue = '';
		showDropdown = false;
	}

	function removeTag(tag: string) {
		onChange(tags.filter((t) => t !== tag).join(', '));
	}

	function handleInput(e: Event) {
		const val = (e.currentTarget as HTMLInputElement).value;
		if (val.endsWith(',')) {
			const newTag = val.slice(0, -1).trim();
			if (newTag) addTag(newTag);
		} else {
			inputValue = val;
		}
	}

	function handleKeyDown(e: KeyboardEvent) {
		if (e.key === 'Enter') {
			e.preventDefault();
			if (showDropdown && filtered[highlightIdx]) addTag(filtered[highlightIdx]);
			else if (inputValue.trim()) addTag(inputValue.trim());
		} else if (e.key === 'Tab' && showDropdown && filtered[highlightIdx]) {
			e.preventDefault();
			addTag(filtered[highlightIdx]);
		} else if (e.key === 'Escape') {
			showDropdown = false;
		} else if (e.key === 'ArrowDown') {
			e.preventDefault();
			highlightIdx = Math.min(highlightIdx + 1, filtered.length - 1);
		} else if (e.key === 'ArrowUp') {
			e.preventDefault();
			highlightIdx = Math.max(highlightIdx - 1, -1);
		} else if (e.key === 'Backspace' && !inputValue && tags.length > 0) {
			removeTag(tags[tags.length - 1]);
		}
	}
</script>

<div class="relative">
	{#if tags.length > 0}
		<div class="flex flex-wrap gap-1.5 mb-2">
			{#each tags as tag}
				<span class="inline-flex items-center gap-1 bg-violet-100 text-violet-700 text-xs font-medium px-2.5 py-1 rounded-full">
					{tag}
					<button type="button" onclick={() => removeTag(tag)} class="hover:text-violet-900 font-bold leading-none">&times;</button>
				</span>
			{/each}
		</div>
	{/if}
	<input
		type="text"
		value={inputValue}
		oninput={handleInput}
		onkeydown={handleKeyDown}
		onfocus={() => { if (filtered.length > 0) showDropdown = true; }}
		onblur={() => { setTimeout(() => (showDropdown = false), 150); }}
		placeholder={placeholder}
		class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400"
	/>
	{#if showDropdown}
		<div class="absolute z-50 left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
			{#each filtered as tag, i}
				<button type="button" onmousedown={(e) => { e.preventDefault(); addTag(tag); }} class={`w-full text-left px-3 py-2 text-sm transition-colors ${i === highlightIdx ? 'bg-violet-50 text-violet-700' : 'text-gray-700 hover:bg-gray-50'}`}>{tag}</button>
			{/each}
		</div>
	{/if}
</div>
