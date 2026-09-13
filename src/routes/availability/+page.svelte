<script lang="ts">
	import { onMount } from 'svelte';
	import API_BASE from '$lib/api';

	const USER_ID = '694d8d3a37070a1a20678d63';

	const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
	const MONTHS = [
		'Jan',
		'Feb',
		'Mar',
		'Apr',
		'May',
		'Jun',
		'Jul',
		'Aug',
		'Sep',
		'Oct',
		'Nov',
		'Dec'
	];

	type Slot = { id: string; range: string; price?: number; discount?: number };
	type SlotGroup = { title: string; discount?: boolean; slots: Slot[] };

	const SLOT_GROUPS: SlotGroup[] = [
		{
			title: '3-hour windows',
			discount: false,
			slots: [
				{ id: '3h-1', range: '7:00 AM – 10:00 AM' },
				{ id: '3h-2', range: '10:00 AM – 1:00 PM' },
				{ id: '3h-3', range: '1:00 PM – 4:00 PM' },
				{ id: '3h-4', range: '4:00 PM – 7:00 PM' },
				{ id: '3h-5', range: '7:00 PM – 10:00 PM' }
			]
		},
		{
			title: '1-hour windows',
			discount: true,
			slots: [
				{ id: '1h-1', range: '5:00 PM – 6:00 PM', price: 2.99, discount: 2.0 },
				{ id: '1h-2', range: '6:00 PM – 7:00 PM', price: 2.99, discount: 2.0 },
				{ id: '1h-3', range: '7:00 PM – 8:00 PM', price: 2.99, discount: 2.0 },
				{ id: '1h-4', range: '8:00 PM – 9:00 PM', price: 2.99, discount: 2.0 }
			]
		}
	];

	const dates = Array.from({ length: 7 }, (_, i) => {
		const d = new Date();
		d.setDate(d.getDate() + i);
		d.setHours(0, 0, 0, 0);
		return d;
	});

	let start = $state(0);
	let visibleCount = $state(4);

	let selected = $state<Set<string>>(new Set()); // key: `${idx}:${slotId}`
	// per-slot capacity override; key `${idx}:${slotId}`, value int | null (use default)
	let capacities = $state<Map<string, number | null>>(new Map());
	let defaultCapacity = $state(1);
	let booked = $state<Map<string, number>>(new Map()); // key `${dateKey}:${slotId}` -> booked count
	let loading = $state(true);
	let saving = $state(false);
	let savedMsg = $state('');

	function key(idx: number, slotId: string) {
		return `${idx}:${slotId}`;
	}
	function toggle(idx: number, slotId: string) {
		const k = key(idx, slotId);
		const next = new Set(selected);
		if (next.has(k)) next.delete(k);
		else next.add(k);
		selected = next;
	}
	function setCapacity(idx: number, slotId: string, value: number | null) {
		const next = new Map(capacities);
		next.set(key(idx, slotId), value);
		capacities = next;
	}
	function updateVisibleCount() {
		const w = window.innerWidth;
		if (w < 640) visibleCount = 1;
		else if (w < 768) visibleCount = 2;
		else if (w < 1024) visibleCount = 3;
		else visibleCount = 4;
	}
	const maxStart = $derived(Math.max(0, dates.length - visibleCount));
	const visibleDates = $derived(dates.slice(start, start + visibleCount));
	function goPrev() {
		start = Math.max(0, start - visibleCount);
	}
	function goNext() {
		start = Math.min(maxStart, start + visibleCount);
	}
	function dateKey(d: Date) {
		const y = d.getFullYear();
		const m = String(d.getMonth() + 1).padStart(2, '0');
		const day = String(d.getDate()).padStart(2, '0');
		return `${y}-${m}-${day}`;
	}
	function parseTimes(range: string) {
		const m = range.match(/(\d{1,2}):(\d{2}) (AM|PM) – (\d{1,2}):(\d{2}) (AM|PM)/);
		if (!m) return { startTime: '', endTime: '' };
		const conv = (h: string, min: string, ap: string) => {
			let hh = Number(h);
			if (ap === 'PM' && hh < 12) hh += 12;
			if (ap === 'AM' && hh === 12) hh = 0;
			return `${String(hh).padStart(2, '0')}:${min}`;
		};
		return { startTime: conv(m[1], m[2], m[3]), endTime: conv(m[4], m[5], m[6]) };
	}
	function dayLabel(d: Date) {
		return `${DAY_NAMES[d.getDay()]}, ${MONTHS[d.getMonth()]} ${d.getDate()}`;
	}
	function shortDay(d: Date) {
		return `${MONTHS[d.getMonth()].slice(0, 3)} ${d.getDate()}`;
	}

	onMount(() => {
		updateVisibleCount();
		window.addEventListener('resize', updateVisibleCount);
		(async () => {
			try {
				const res = await fetch(API_BASE + `availabilities?userId=${USER_ID}`);
				if (res.ok) {
					const data = await res.json();
					const next = new Set<string>();
					const nextCaps = new Map<string, number | null>();
					if (Array.isArray(data)) {
						for (const a of data) {
							const di = dates.findIndex((d) => dateKey(d) === a.date);
							if (di >= 0) {
								next.add(key(di, a.slotId));
								if (a.maxCapacity) nextCaps.set(key(di, a.slotId), a.maxCapacity);
							}
						}
					}
					selected = next;
					capacities = nextCaps;
				}
			} catch {
			} finally {
				loading = false;
			}
			try {
				// Load booked counts so the driver can see capacity usage per slot.
				// available-slots returns only slots with remaining capacity, so a
				// configured slot absent from that response has no spots left = FULL.
				const res = await fetch(API_BASE + `available-slots?userId=${USER_ID}`);
				const remainingByKey = new Map<string, { maxCapacity: number; remaining: number }>();
				if (res.ok) {
					const data = await res.json();
					if (Array.isArray(data)) {
						for (const a of data) {
							const di = dates.findIndex((d) => dateKey(d) === a.date);
							if (di >= 0 && a.maxCapacity && a.remaining !== undefined) {
								remainingByKey.set(key(di, a.slotId), {
									maxCapacity: a.maxCapacity,
									remaining: a.remaining
								});
							}
						}
					}
				}
				const nextBooked = new Map<string, number>();
				selected.forEach((k) => {
					const rem = remainingByKey.get(k);
					if (rem) {
						nextBooked.set(k, Math.max(0, rem.maxCapacity - rem.remaining));
					} else {
						nextBooked.set(k, capacities.get(k) ?? defaultCapacity);
					}
				});
				booked = nextBooked;
			} catch {}
		})();
		return () => window.removeEventListener('resize', updateVisibleCount);
	});

	async function save() {
		saving = true;
		savedMsg = '';
		try {
			const items: {
				date: string;
				slotId: string;
				startTime: string;
				endTime: string;
				maxCapacity: number;
			}[] = [];
			dates.forEach((d, idx) => {
				SLOT_GROUPS.forEach((g) =>
					g.slots.forEach((s) => {
						if (selected.has(key(idx, s.id))) {
							const t = parseTimes(s.range);
							const cap = capacities.get(key(idx, s.id)) ?? defaultCapacity;
							items.push({
								date: dateKey(d),
								slotId: s.id,
								startTime: t.startTime,
								endTime: t.endTime,
								maxCapacity: cap > 0 ? cap : 1
							});
						}
					})
				);
			});
			const res = await fetch(API_BASE + 'availabilities', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ userId: USER_ID, items })
			});
			savedMsg = res.ok ? 'Availability saved to DB' : 'Failed to save availability';
		} catch {
			savedMsg = 'Failed to save availability';
		} finally {
			saving = false;
		}
	}

	const summary = $derived(() => {
		const list: string[] = [];
		dates.forEach((d, idx) => {
			SLOT_GROUPS.forEach((g) =>
				g.slots.forEach((s) => {
					if (selected.has(key(idx, s.id))) list.push(`${dayLabel(d)} · ${s.range}`);
				})
			);
		});
		return list;
	});
</script>

<svelte:head><title>Availability · U-DO</title></svelte:head>

<div class="min-h-screen bg-gray-50">
	<header class="sticky top-0 z-10 border-b border-gray-200 bg-white">
		<div class="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
			<div>
				<div class="flex items-center gap-3">
					<h1 class="text-2xl font-bold text-gray-900">Delivery Availability</h1>
					<div class="hidden items-center gap-1.5 sm:flex">
						<button
							onclick={goPrev}
							disabled={start === 0}
							class="flex h-8 w-8 items-center justify-center rounded-full border border-gray-200 text-gray-600 transition hover:border-gray-300 hover:bg-gray-50 active:scale-90 disabled:cursor-not-allowed disabled:opacity-40"
							aria-label="Previous days"
							><svg
								class="h-4 w-4"
								fill="none"
								stroke="currentColor"
								viewBox="0 0 24 24"
								stroke-width="2"
								><path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7" /></svg
							></button
						>
						<button
							onclick={goNext}
							disabled={start === maxStart}
							class="flex h-8 w-8 items-center justify-center rounded-full border border-gray-200 text-gray-600 transition hover:border-gray-300 hover:bg-gray-50 active:scale-90 disabled:cursor-not-allowed disabled:opacity-40"
							aria-label="Next days"
							><svg
								class="h-4 w-4"
								fill="none"
								stroke="currentColor"
								viewBox="0 0 24 24"
								stroke-width="2"
								><path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7" /></svg
							></button
						>
					</div>
				</div>
				<p class="text-sm text-gray-500">Select multiple time slots across different days.</p>
			</div>
			<div class="flex items-center gap-3">
				<label class="flex items-center gap-2 text-sm text-gray-700">
					<span class="font-medium whitespace-nowrap">Default max/slot:</span>
					<input
						type="number"
						min="1"
						bind:value={defaultCapacity}
						class="w-16 rounded-lg border border-gray-300 px-2 py-1.5 text-sm focus:ring-2 focus:ring-orange-400 focus:outline-none"
					/>
				</label>
				{#if summary().length > 0}
					<span class="rounded-full bg-orange-100 px-3 py-1 text-sm font-semibold text-orange-700"
						>{summary().length} selected</span
					>
				{/if}
				<button
					onclick={save}
					disabled={saving || loading}
					class="cursor-pointer rounded-lg bg-orange-500 px-5 py-2 text-sm font-semibold text-white hover:bg-orange-600 disabled:opacity-50"
					>{saving ? 'Saving...' : 'Save'}</button
				>
			</div>
		</div>
		{#if savedMsg}
			<div class="mx-auto max-w-6xl px-6 pb-3 text-sm text-emerald-600">{savedMsg}</div>
		{/if}
	</header>

	<main class="mx-auto max-w-6xl px-6 py-8">
		{#if loading}
			<div class="py-16 text-center text-gray-400">Loading saved availability…</div>
		{:else}
			{#if summary().length > 0}
				<div class="mb-6 rounded-2xl border border-gray-200 bg-white p-5">
					<p class="mb-3 text-sm font-bold text-gray-900">Selected slots ({summary().length})</p>
					<div class="flex flex-wrap gap-2">
						{#each summary() as item}
							<span
								class="rounded-full border border-orange-200 bg-orange-50 px-3 py-1.5 text-xs font-medium text-orange-700"
								>{item}</span
							>
						{/each}
					</div>
				</div>
			{/if}

			<div class="grid gap-5" style="grid-template-columns: repeat({visibleCount}, minmax(0,1fr));">
				{#each visibleDates as d, vIdx}
					{@const idx = start + vIdx}
					<div class="rounded-2xl border border-gray-200 bg-white p-4">
						<p class="text-sm font-bold text-gray-900">{dayLabel(d)}</p>
						<p class="mt-0.5 text-xs text-gray-400">Pick any time slots</p>

						{#each SLOT_GROUPS as group}
							<div class="mt-4">
								<p class="flex items-center gap-2 text-xs font-semibold text-gray-600">
									{group.title}
									{#if group.discount}
										<span class="rounded bg-red-600 px-1.5 py-0.5 text-[10px] text-white">SALE</span
										>
									{/if}
								</p>
								<div class="mt-2 space-y-2">
									{#each group.slots as slot}
										{@const isSel = selected.has(key(idx, slot.id))}
										{@const bCount = booked.get(key(idx, slot.id)) ?? 0}
										{@const effCap = capacities.get(key(idx, slot.id)) ?? defaultCapacity}
										<div
											class="rounded-xl border-2 transition ${isSel
												? 'border-orange-500 bg-orange-500 text-white'
												: 'border-gray-200 bg-white text-gray-700 hover:border-orange-300'}"
										>
											<div class="flex items-center gap-2 px-3 py-2">
												<button
													onclick={() => toggle(idx, slot.id)}
													class={`min-w-0 flex-1 cursor-pointer truncate text-left text-sm font-medium transition ${isSel ? 'text-white' : 'text-gray-700'}`}
												>
													{slot.range}
												</button>
												{#if slot.price}
													<span
														class="shrink-0 text-xs ${isSel ? 'text-white/90' : 'text-gray-400'}"
														>${slot.price.toFixed(2)}</span
													>
												{/if}
												{#if bCount >= effCap}
													<span
														class="shrink-0 rounded px-1.5 py-0.5 text-[10px] font-bold ${isSel
															? 'bg-white/20 text-white'
															: 'bg-red-100 text-red-600'}">FULL</span
													>
												{:else if bCount > 0}
													<span
														class="shrink-0 rounded px-1.5 py-0.5 text-[10px] font-bold ${isSel
															? 'bg-white/20 text-white'
															: 'bg-amber-100 text-amber-700'}">{bCount}/{effCap} booked</span
													>
												{/if}
												<label
													for={`cap-${idx}-${slot.id}`}
													class="shrink-0 text-[11px] ${isSel
														? 'text-orange-100'
														: 'text-gray-400'}">:</label
												>
												<input
													id={`cap-${idx}-${slot.id}`}
													type="number"
													min="1"
													value={capacities.get(key(idx, slot.id)) ?? ''}
													placeholder={String(defaultCapacity)}
													oninput={(e) => {
														const v = (e.currentTarget as HTMLInputElement).value;
														setCapacity(idx, slot.id, v === '' ? null : Number(v));
													}}
													class={`w-12 shrink-0 rounded border px-1.5 py-0.5 text-xs focus:ring-1 focus:ring-orange-400 focus:outline-none ${isSel ? 'border-white/30 bg-white/20 text-white' : 'border-gray-300 bg-white text-gray-700'}`}
												/>
											</div>
										</div>
									{/each}
								</div>
							</div>
						{/each}
					</div>
				{/each}
			</div>
		{/if}
	</main>
</div>
