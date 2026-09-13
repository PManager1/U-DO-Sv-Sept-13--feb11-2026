<script lang="ts">
	let {
		store,
		menu,
		query = '',
		showStateB = false,
		suggestions = [],
		onSelect,
		onClose
	}: {
		store: any;
		menu: any[];
		query?: string;
		showStateB?: boolean;
		suggestions?: any[];
		onSelect: (term: string) => void;
		onClose: () => void;
	} = $props();

	const allItems = $derived(menu.flatMap((s: any) => s.items || []).filter(Boolean));

	const thumb = $derived((it: any) =>
		(it.images || []).find((img: any) => img.size === '400')?.url ||
		(it.images && it.images.length > 0 ? it.images[it.images.length - 1].url : '') ||
		it.raw_image_url ||
		''
	);

	const isAvailable = (it: any) => it.available !== false;

	// --- State A: derived topics / popular / categories ---
	const suggestedTopics = $derived.by(() => {
		const topics = new Set<string>();
		for (const s of menu) {
			if (s.category) topics.add(s.category);
		}
		const freq: Record<string, number> = {};
		for (const it of allItems) {
			if (!it.name) continue;
			const first = (it.name.split(' ')[0] || '').toLowerCase();
			if (first.length > 2) freq[first] = (freq[first] || 0) + 1;
		}
		Object.entries(freq)
			.sort((a, b) => b[1] - a[1])
			.slice(0, 4)
			.forEach(([w]) => topics.add(w));
		return Array.from(topics).slice(0, 8);
	});

	const popularItems = $derived(
		allItems
			.filter(isAvailable)
			.slice(0, 6)
	);

	const categories = $derived(
		menu
			.map((s) => ({ name: s.category, items: (s.items || []).filter(isAvailable).slice(0, 4) }))
			.filter((c) => c.name && c.items.length > 0)
	);

	// --- State B: highlight helper ---
	function highlight(name: string) {
		const q = (query || '').trim();
		if (!q) return name;
		const idx = name.toLowerCase().indexOf(q.toLowerCase());
		if (idx === -1) return name;
		return [
			name.slice(0, idx),
			name.slice(idx, idx + q.length),
			name.slice(idx + q.length)
		];
	}
</script>

<div
	class="absolute left-0 right-0 top-full mt-2 bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden z-50 max-h-[min(70vh,560px)] flex flex-col"
	role="dialog"
	aria-label="Search suggestions"
>
	<div class="overflow-y-auto overscroll-contain">
		{#if showStateB}
			<!-- State B: live suggestions -->
			{#if suggestions.length === 0}
				<div class="px-5 py-6 text-sm text-gray-500 text-center">
					No suggestions for "<span class="font-medium text-gray-700">{query}</span>"
				</div>
			{:else}
				<ul class="divide-y divide-gray-50">
					{#each suggestions as it}
						{@const img = thumb(it)}
						{@const parts = highlight(it.name || '')}
						<li>
							<button
								onclick={() => onSelect(it.name)}
								class="cursor-pointer w-full flex items-center gap-3 px-4 py-2.5 hover:bg-orange-50/50 transition text-left"
							>
								<div class="w-9 h-9 rounded-lg bg-gray-100 flex items-center justify-center overflow-hidden flex-shrink-0">
									{#if img}
										<img src={img} alt={it.name} class="max-h-full max-w-full object-contain" loading="lazy" />
									{:else}
										<span class="text-base text-gray-300">🥟</span>
									{/if}
								</div>
								<span class="flex-1 text-sm text-gray-800 font-medium">
									{#if Array.isArray(parts)}
										{parts[0]}<span class="font-bold text-gray-900">{parts[1]}</span>{parts[2]}
									{:else}
										{parts}
									{/if}
								</span>
								<svg class="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-4.35-4.35M17 10.5a6.5 6.5 0 11-13 0 6.5 6.5 0 0113 0z" /></svg>
							</button>
						</li>
					{/each}
				</ul>
			{/if}
		{:else}
			<!-- State A: suggested topics / popular / categories -->
			{#if suggestedTopics.length > 0}
				<div class="px-4 pt-4">
					<p class="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2.5">Suggested topics</p>
					<div class="flex flex-wrap gap-2">
						{#each suggestedTopics as topic}
							<button
								onclick={() => onSelect(topic)}
								class="cursor-pointer px-3 py-1.5 rounded-full bg-gray-100 hover:bg-orange-50 hover:text-orange-700 hover:border-orange-200 border border-transparent text-sm text-gray-700 font-medium transition"
							>
								{topic}
							</button>
						{/each}
					</div>
				</div>
			{/if}

			{#if popularItems.length > 0}
				<div class="px-4 pt-5">
					<p class="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2.5">Popular in {store?.name}</p>
					<div class="grid grid-cols-2 gap-2.5">
						{#each popularItems as it}
							{@const img = thumb(it)}
							<button
								onclick={() => onSelect(it.name)}
								class="cursor-pointer flex items-center gap-2.5 bg-gray-50 hover:bg-orange-50 rounded-xl px-3 py-2 text-left transition"
							>
								<div class="w-10 h-10 rounded-lg bg-white border border-gray-100 flex items-center justify-center overflow-hidden flex-shrink-0">
									{#if img}
										<img src={img} alt={it.name} class="max-h-full max-w-full object-contain" loading="lazy" />
									{:else}
										<span class="text-lg text-gray-300">🥟</span>
									{/if}
								</div>
								<span class="text-sm text-gray-800 font-medium leading-snug line-clamp-2">{it.name}</span>
							</button>
						{/each}
					</div>
				</div>
			{/if}

			{#if categories.length > 0}
				<div class="px-4 pt-5 pb-5">
					<p class="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2.5">Categories & essentials</p>
					<div class="space-y-4">
						{#each categories as cat}
							<div>
								<p class="text-sm font-bold text-gray-900 mb-2">{cat.name}</p>
								<div class="grid grid-cols-2 gap-2.5">
									{#each cat.items as it}
										{@const img = thumb(it)}
										<button
											onclick={() => onSelect(it.name)}
											class="cursor-pointer flex items-center gap-2 rounded-xl px-1.5 py-1 text-left hover:bg-orange-50 transition"
										>
											<div class="w-9 h-9 rounded-lg bg-gray-100 flex items-center justify-center overflow-hidden flex-shrink-0">
												{#if img}
													<img src={img} alt={it.name} class="max-h-full max-w-full object-contain" loading="lazy" />
												{:else}
													<span class="text-base text-gray-300">🥟</span>
												{/if}
											</div>
											<span class="text-sm text-gray-700 font-medium leading-snug line-clamp-2">{it.name}</span>
										</button>
									{/each}
								</div>
							</div>
						{/each}
					</div>
				</div>
			{/if}
		{/if}
	</div>
</div>
