<script lang="ts">
	let {
		items,
		filters,
		sort,
		onApply
	}: {
		items: any[];
		filters: { brand: string[]; dietary: string[]; flavor: string[] };
		sort: string;
		onApply: (next: { sort: string; filters: { brand: string[]; dietary: string[]; flavor: string[] } }) => void;
	} = $props();

	let openChip = $state<string | null>(null);

	// --- Anchoring refs & state (desktop measured positioning) ---
	let chipRefs = $state<Record<string, HTMLElement>>({});
	let barRef = $state<HTMLDivElement>();
	let popoverLeft = $state<number>(0);

	function measureChip() {
		if (!openChip) return;
		const chipEl = chipRefs[openChip];
		const barEl = barRef;
		if (!chipEl || !barEl) return;
		if (!window.matchMedia('(min-width: 640px)').matches) return;
		const barRect = barEl.getBoundingClientRect();
		const chipRect = chipEl.getBoundingClientRect();
		const left = chipRect.left - barRect.left;
		const panelWidth = 320; // sm:w-80 = 20rem
		popoverLeft = Math.max(0, Math.min(left, barRect.width - panelWidth));
	}

	const text = (it: any) => `${it.name || ''} ${it.description || ''}`.toLowerCase();

	// --- Derive option lists from the current result dataset ---
	const brandOptions = $derived.by(() => {
		const counts = new Map<string, number>();
		for (const it of items) {
			const words = (it.name || '').trim().split(/\s+/);
			if (words.length < 2) continue;
			// treat as branded only when the first word is capitalized
			const first = words[0];
			if (!/^[A-Z]/.test(first)) continue;
			if (/^(fresh|mini|organic|whole|large|small|ripe|green|raw|boneless)/i.test(first)) continue;
			const token = words.slice(0, 2).join(' ');
			counts.set(token, (counts.get(token) || 0) + 1);
		}
		return Array.from(counts.entries())
			.sort((a, b) => b[1] - a[1])
			.map(([name]) => name)
			.slice(0, 20);
	});

	const dietaryOptions = $derived(
		items.some((it) => /organic/i.test(text(it))) ? ['Organic'] : []
	);

	const FLAVOR_KEYWORDS = [
		'chocolate', 'choc', 'peanut butter', 'peanut', 'vanilla', 'strawberry',
		'almond', 'blueberry', 'raspberry', 'mango', 'coffee', 'caramel',
		'lemon', 'lime', 'orange', 'coconut', 'maple', 'cherry', 'grape',
		'banana', 'pumpkin', 'cinnamon', 'honey', 'oatmeal', 'apple', 'salted caramel'
	];
	const flavorOptions = $derived(
		FLAVOR_KEYWORDS.filter((f) => items.some((it) => text(it).includes(f)))
	);

	const appliedCount = $derived(
		filters.brand.length + filters.dietary.length + filters.flavor.length
	);

	// --- Draft state (local to each open popover; grid updates on Apply) ---
	let draft = $state<{ sort: string; brand: string[]; dietary: string[]; flavor: string[] }>({
		sort: 'relevance', brand: [], dietary: [], flavor: []
	});

	function beginDraft() {
		draft = { sort, brand: [...filters.brand], dietary: [...filters.dietary], flavor: [...filters.flavor] };
	}

	function isDraftChanged() {
		const d = draft;
		return (
			d.sort !== sort ||
			d.brand.length !== filters.brand.length ||
			d.brand.some((v) => !filters.brand.includes(v)) ||
			d.dietary.length !== filters.dietary.length ||
			d.dietary.some((v) => !filters.dietary.includes(v)) ||
			d.flavor.length !== filters.flavor.length ||
			d.flavor.some((v) => !filters.flavor.includes(v))
		);
	}

	const canApply = $derived.by(() => isDraftChanged());

	const chipMeta = $derived([
		{ id: 'sort', label: 'Sort', applied: sort !== 'relevance', count: sort !== 'relevance' ? 1 : 0 },
		{ id: 'brand', label: 'Brand', applied: filters.brand.length > 0, count: filters.brand.length },
		{ id: 'dietary', label: 'Dietary', applied: filters.dietary.length > 0, count: filters.dietary.length },
		{ id: 'flavor', label: 'Flavor', applied: filters.flavor.length > 0, count: filters.flavor.length }
	]);

	function toggleChip(id: string) {
		if (openChip === id) {
			openChip = null;
			popoverLeft = 0;
			return;
		}
		openChip = id;
		beginDraft();
		measureChip();
	}

	function resetDraft() {
		draft = { sort: 'relevance', brand: [], dietary: [], flavor: [] };
		if (openChip === 'sort') draft.sort = 'relevance';
	}

	function applyDraft() {
		onApply({ sort: draft.sort, filters: { brand: draft.brand, dietary: draft.dietary, flavor: draft.flavor } });
		openChip = null;
	}

	function toggleDraftMulti(list: 'brand' | 'dietary' | 'flavor', value: string) {
		draft = {
			...draft,
			[list]: draft[list].includes(value) ? draft[list].filter((v) => v !== value) : [...draft[list], value]
		};
	}

	function setDraftSort(value: string) {
		draft = { ...draft, sort: value };
	}

	// close on Escape / click-outside; recompute anchor on resize while open
	$effect(() => {
		if (!openChip) return;
		const onKey = (e: KeyboardEvent) => {
			if (e.key === 'Escape') {
				openChip = null;
				popoverLeft = 0;
			}
		};
		window.addEventListener('keydown', onKey);
		window.addEventListener('resize', measureChip);
		return () => {
			window.removeEventListener('keydown', onKey);
			window.removeEventListener('resize', measureChip);
		};
	});

	const SORT_OPTIONS = [
		{ value: 'relevance', label: 'Relevance' },
		{ value: 'price-asc', label: 'Price: Low to High' },
		{ value: 'price-desc', label: 'Price: High to Low' },
		{ value: 'name', label: 'Name A-Z' }
	];
</script>

<div bind:this={barRef} class="relative">
	<!-- Backdrop to catch outside clicks while a popover is open (desktop + mobile) -->
	{#if openChip}
		<div
			class="fixed inset-0 z-30"
			onclick={() => (openChip = null)}
			oncontextmenu={(e) => e.preventDefault()}
		></div>
	{/if}

	<div class="relative z-40 flex items-center gap-2 mb-4 overflow-x-auto scrollbar-none py-1">
		{#each chipMeta as chip}
			<button
				bind:this={chipRefs[chip.id]}
				onclick={() => toggleChip(chip.id)}
				class={`flex-shrink-0 inline-flex items-center gap-1.5 px-3.5 py-2 text-sm font-medium rounded-full border transition min-h-[38px] ${
					openChip === chip.id
						? 'bg-gray-200 text-gray-900 border-gray-300'
						: chip.applied
							? 'bg-gray-900 text-white border-gray-900'
							: 'bg-white text-gray-700 border-gray-200 hover:border-gray-400 hover:text-gray-900'
				}`}
			>
				{chip.label}
				{#if chip.count > 0}
					<span class={`text-xs font-bold px-1.5 py-0.5 rounded-full ${chip.applied ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-600'}`}>{chip.count}</span>
				{/if}
				<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7" /></svg>
			</button>
		{/each}
	</div>

	<!-- Popover / Sheet panel -->
	{#if openChip}
		{@const meta = chipMeta.find((c) => c.id === openChip)}
		<div
			class="fixed inset-x-0 bottom-0 z-50 sm:absolute sm:inset-auto sm:top-full sm:mt-2 sm:w-80 sm:z-40"
			style="left:{popoverLeft}px"
			onclick={(e) => e.stopPropagation()}
		>
			<div class="bg-white w-full sm:rounded-2xl rounded-t-2xl shadow-2xl border sm:border-gray-100 border-t border-gray-200 overflow-hidden sm:max-h-[70vh] flex flex-col animate-[sheetUp_0.2s_ease-out] sm:animate-none">
				<!-- Title header -->
				<div class="flex items-center justify-between px-4 py-3 border-b border-gray-100">
					<h3 class="text-base font-bold text-gray-900 capitalize">{openChip === 'sort' ? 'Sort By' : meta?.label}</h3>
					<button onclick={() => (openChip = null)} class="w-7 h-7 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-600 flex items-center justify-center" aria-label="Close">
						<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
					</button>
				</div>

				<!-- Option list -->
				<div class="overflow-y-auto py-1 max-h-[45vh] sm:max-h-[50vh]">
					{#if openChip === 'sort'}
						<ul>
							{#each SORT_OPTIONS as opt}
								<li>
									<button
										onclick={() => setDraftSort(opt.value)}
										class="w-full flex items-center gap-2.5 px-4 py-2.5 text-left text-sm hover:bg-gray-50 transition"
									>
										<span class={`w-4 h-4 rounded-full border flex items-center justify-center flex-shrink-0 ${draft.sort === opt.value ? 'border-gray-900' : 'border-gray-300'}`}>
											{#if draft.sort === opt.value}
												<span class="w-2 h-2 rounded-full bg-gray-900"></span>
											{/if}
										</span>
										<span class="text-gray-800">{opt.label}</span>
									</button>
								</li>
							{/each}
						</ul>
					{:else}
						{@const list = openChip === 'brand' ? brandOptions : openChip === 'dietary' ? dietaryOptions : flavorOptions}
						{@const draftKey = openChip === 'brand' ? 'brand' : openChip === 'dietary' ? 'dietary' : 'flavor'}
						{#if list.length === 0}
							<div class="px-4 py-6 text-sm text-gray-500 text-center">No options available for this search.</div>
						{:else}
							<ul>
								{#each list as option}
									{@const checked = draft[draftKey].includes(option)}
									<li>
										<button
											onclick={() => toggleDraftMulti(draftKey, option)}
											class="w-full flex items-center gap-2.5 px-4 py-2.5 text-left text-sm hover:bg-gray-50 transition"
										>
											<span class={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 transition ${checked ? 'bg-gray-900 border-gray-900' : 'border-gray-300'}`}>
												{#if checked}
													<svg class="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="3"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" /></svg>
												{/if}
											</span>
											<span class="text-gray-800">{option}</span>
										</button>
									</li>
								{/each}
							</ul>
						{/if}
					{/if}
				</div>

				<!-- Bottom action bar -->
				<div class="sticky bottom-0 bg-white border-t border-gray-100 px-4 py-3 flex items-center gap-3">
					<button
						onclick={resetDraft}
						class="flex-1 px-4 py-2.5 rounded-full border border-gray-200 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition"
					>Reset</button>
					<button
						onclick={applyDraft}
						disabled={!canApply}
						class={`flex-1 px-4 py-2.5 rounded-full text-sm font-semibold transition ${canApply ? 'bg-gray-900 text-white hover:bg-gray-800' : 'bg-gray-100 text-gray-400 cursor-not-allowed'}`}
					>Show results</button>
				</div>
			</div>
		</div>
	{/if}
</div>

<style>
	@keyframes sheetUp {
		from { transform: translateY(100%); }
		to { transform: translateY(0); }
	}
</style>
