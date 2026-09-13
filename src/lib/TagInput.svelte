<script lang="ts">
	let { value, onValueChange, onAdd, tags = [], placeholder = '' }: {
		value: string;
		onValueChange: (v: string) => void;
		onAdd: (tag: string) => void;
		tags?: string[];
		placeholder?: string;
	} = $props();

	let open = $state(false);

	const q = $derived(value.trim().toLowerCase());
	const filtered = $derived(q ? tags.filter((t) => t.toLowerCase().includes(q)).slice(0, 6) : []);
	const canCreate = $derived(q !== '' && !tags.some((t) => t.toLowerCase() === q));
</script>

<div class="relative">
	<input
		type="text"
		value={value}
		oninput={(e) => onValueChange((e.currentTarget as HTMLInputElement).value)}
		onfocus={() => (open = true)}
		onblur={() => setTimeout(() => (open = false), 150)}
		onkeydown={(e) => {
			if (e.key === 'Enter') {
				e.preventDefault();
				if (value.trim()) onAdd(value.trim());
			}
		}}
		placeholder={placeholder}
		class="w-full border border-gray-300 rounded px-2 py-1 text-xs"
	/>
	{#if open && (filtered.length > 0 || canCreate)}
		<div class="absolute z-30 left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-40 overflow-y-auto">
			{#each filtered as t}
				<button type="button" onclick={(e) => { e.preventDefault(); onAdd(t); }} class="w-full text-left px-3 py-1.5 text-xs hover:bg-gray-100">{t}</button>
			{/each}
			{#if canCreate}
				<button type="button" onclick={(e) => { e.preventDefault(); onAdd(value.trim()); }} class="w-full text-left px-3 py-1.5 text-xs text-violet-600 hover:bg-violet-50">+ Create "{value.trim()}"</button>
			{/if}
		</div>
	{/if}
</div>
