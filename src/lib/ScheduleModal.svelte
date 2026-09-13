<script lang="ts">
	import API_BASE from '$lib/api';

	const USER_ID = '694d8d3a37070a1a20678d63';

	let { open, onClose, onSelect, notice = '' }: { open: boolean; onClose: () => void; onSelect: (label: string, meta?: { date: string; slotId: string; startTime: string; endTime: string } | null) => void; notice?: string } = $props();

	type Slot = { id: string; range: string; price?: number; discount?: number; startTime?: string; endTime?: string };
	type SlotGroup = { title: string; discount?: boolean; slots: Slot[] };

	const SLOT_GROUPS: SlotGroup[] = [
		{
			title: '3-hour windows',
			slots: [
				{ id: '3h-1', range: '7:00 AM – 10:00 AM', startTime: '07:00', endTime: '10:00' },
				{ id: '3h-2', range: '10:00 AM – 1:00 PM', startTime: '10:00', endTime: '13:00' },
				{ id: '3h-3', range: '1:00 PM – 4:00 PM', startTime: '13:00', endTime: '16:00' },
				{ id: '3h-4', range: '4:00 PM – 7:00 PM', startTime: '16:00', endTime: '19:00' },
				{ id: '3h-5', range: '7:00 PM – 10:00 PM', startTime: '19:00', endTime: '22:00' }
			]
		},
		{
			title: '1-hour windows',
			discount: true,
			slots: [
				{ id: '1h-1', range: '5:00 PM – 6:00 PM', price: 2.99, discount: 2.0, startTime: '17:00', endTime: '18:00' },
				{ id: '1h-2', range: '6:00 PM – 7:00 PM', price: 2.99, discount: 2.0, startTime: '18:00', endTime: '19:00' },
				{ id: '1h-3', range: '7:00 PM – 8:00 PM', price: 2.99, discount: 2.0, startTime: '19:00', endTime: '20:00' },
				{ id: '1h-4', range: '8:00 PM – 9:00 PM', price: 2.99, discount: 2.0, startTime: '20:00', endTime: '21:00' }
			]
		}
	];

	let selectedDate = $state<number | null>(null);
	let selectedSlot = $state<string | null>(null);
	let days = $state<Date[]>([]);
	let avail = $state<Set<string>>(new Set()); // `${dateKey}:${slotId}`
	let remaining = $state<Map<string, number>>(new Map()); // `${dateKey}:${slotId}` -> remaining count

	$effect(() => {
		if (!open) return;
		const onKey = (e: KeyboardEvent) => {
			if (e.key === 'Escape') onClose();
		};
		window.addEventListener('keydown', onKey);
		return () => window.removeEventListener('keydown', onKey);
	});

	$effect(() => {
		if (!open) return;
		const out: Date[] = [];
		const now = new Date();
		now.setHours(0, 0, 0, 0);
		for (let i = 0; i <= 6; i++) {
			const d = new Date(now);
			d.setDate(d.getDate() + i);
			out.push(d);
		}
		days = out;
		selectedDate = null;
		selectedSlot = null;
		avail = new Set();
		remaining = new Map();
		// Net availability: only slots with remaining capacity are returned.
		fetch(API_BASE + `available-slots?userId=${USER_ID}`)
			.then((r) => (r.ok ? r.json() : []))
			.then((data) => {
				const next = new Set<string>();
				const nextRemaining = new Map<string, number>();
				if (Array.isArray(data)) {
					for (const a of data) {
						next.add(`${a.date}:${a.slotId}`);
						if (a.remaining !== undefined) nextRemaining.set(`${a.date}:${a.slotId}`, a.remaining);
					}
				}
				avail = next;
				remaining = nextRemaining;
			})
			.catch(() => {});
	});

	function dateKey(d: Date) {
		const y = d.getFullYear();
		const m = String(d.getMonth() + 1).padStart(2, '0');
		const day = String(d.getDate()).padStart(2, '0');
		return `${y}-${m}-${day}`;
	}

	function dayLabel(d: Date) {
		const today = new Date();
		today.setHours(0, 0, 0, 0);
		const tmr = new Date(today);
		tmr.setDate(tmr.getDate() + 1);
		if (d.getTime() === today.getTime()) return 'Today';
		if (d.getTime() === tmr.getTime()) return 'Tomorrow';
		return d.toLocaleDateString('en-US', { weekday: 'short' });
	}

	function dateSub(d: Date) {
		return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
	}

	const availableDates = $derived(
		days.filter((d) => {
			const dk = dateKey(d);
			return SLOT_GROUPS.some((g) => g.slots.some((s) => avail.has(`${dk}:${s.id}`)));
		})
	);

	const availableSlotsForDate = $derived.by(() => {
		const set = new Set<string>();
		if (selectedDate === null) return set;
		const d = days.find((x) => x.getTime() === selectedDate);
		if (!d) return set;
		const dk = dateKey(d);
		SLOT_GROUPS.forEach((g) => g.slots.forEach((s) => { if (avail.has(`${dk}:${s.id}`)) set.add(s.id); }));
		return set;
	});

	const canConfirm = $derived(selectedDate !== null && selectedSlot !== null);

	const selectedDateKey = $derived.by(() => {
		if (selectedDate === null) return null;
		const d = days.find((x) => x.getTime() === selectedDate);
		return d ? dateKey(d) : null;
	});

	$effect(() => {
		if (!open) return;
		if (availableDates.length > 0 && selectedDate === null) {
			selectedDate = availableDates[0].getTime();
			selectedSlot = null;
		}
	});

	function handleConfirm() {
		if (!canConfirm) return;
		const dateObj = days.find((d) => d.getTime() === selectedDate);
		if (!dateObj) return;
		const dateStr = dateObj.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
		const allSlots = SLOT_GROUPS.flatMap((g) => g.slots);
		const slotObj = allSlots.find((s) => s.id === selectedSlot);
		const label = slotObj ? `${dateStr} • ${slotObj.range}` : dateStr;
		const meta = slotObj
			? {
					date: dateKey(dateObj),
					slotId: slotObj.id,
					startTime: slotObj.startTime || '',
					endTime: slotObj.endTime || ''
			  }
			: null;
		onSelect(label, meta);
		onClose();
	}
</script>

{#if open}
	<div class="fixed inset-0 z-[100] flex items-center justify-center p-4">
		<div class="absolute inset-0 bg-black/40 backdrop-blur-sm" onclick={onClose}></div>
		<div class="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden animate-[fadeIn_0.2s_ease-out]">
			<div class="flex items-center justify-between px-6 py-4 border-b border-gray-100">
				<h3 class="text-xl font-extrabold text-black">Schedule Delivery</h3>
				<button onclick={onClose} class="w-9 h-9 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-900 transition cursor-pointer">
					<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
				</button>
			</div>

			{#if notice}
				<div class="px-4 py-3 bg-amber-50 border-b border-amber-200 flex items-center gap-2">
					<svg class="w-4 h-4 text-amber-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/></svg>
					<p class="text-sm font-semibold text-amber-800">{notice}</p>
				</div>
			{/if}

			<div class="max-h-[70vh] overflow-y-auto">
				{#if availableDates.length === 0}
					<div class="px-6 py-12 text-center text-sm text-gray-500">No availability found for this user.</div>
				{:else}
					<div class="px-6 pt-5">
						<div class="flex gap-2 overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden pb-1 -mx-1 px-1">
							{#each availableDates as d}
								{@const active = selectedDate === d.getTime()}
								<button
									onclick={() => { selectedDate = d.getTime(); selectedSlot = null; }}
									class={`min-w-[88px] py-3 px-4 rounded-2xl border text-center transition flex-shrink-0 cursor-pointer ${
										active ? 'border-2 border-black bg-white shadow-sm' : 'border border-gray-200 hover:border-gray-400'
									}`}
								>
									<p class={`text-sm font-semibold ${active ? 'text-black' : 'text-gray-900'}`}>{dayLabel(d)}</p>
									<p class="text-sm font-semibold text-black mt-0.5">{dateSub(d)}</p>
								</button>
							{/each}
						</div>
					</div>

					<div class="px-6 py-4">
						{#each SLOT_GROUPS as group}
							{@const availSlots = group.slots.filter((s) => availableSlotsForDate.has(s.id))}
							{#if availSlots.length > 0}
								<div>
									<p class="text-sm font-bold text-black mt-4 mb-1">{group.title}</p>
									<div>
										{#each availSlots as slot}
											{@const active = selectedSlot === slot.id}
											{@const rem = selectedDateKey ? remaining.get(`${selectedDateKey}:${slot.id}`) : undefined}
											<button onclick={() => (selectedSlot = slot.id)} class="w-full flex items-center justify-between py-3.5 border-b border-gray-100 text-left cursor-pointer">
												<span class="flex items-center gap-2">
													<span class="text-[15px] font-semibold text-black">{slot.range}</span>
													{#if slot.discount}
														<span class="bg-emerald-50 px-2 py-0.5 rounded-md text-emerald-600 font-semibold text-xs">-${slot.discount.toFixed(2)}</span>
													{/if}
													{#if rem === 1}
														<span class="bg-amber-100 px-2 py-0.5 rounded-md text-amber-700 font-semibold text-xs">1 left</span>
													{/if}
												</span>
												<span class={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition ${active ? 'border-orange-500' : 'border-gray-300'}`}>
													{#if active}<span class="w-2.5 h-2.5 rounded-full bg-orange-500"></span>{/if}
												</span>
											</button>
										{/each}
									</div>
								</div>
							{/if}
						{/each}
					</div>
				{/if}
			</div>

			<div class="px-6 py-4 border-t border-gray-100 sticky bottom-0 bg-white">
				{#if selectedDate === null}
					<p class="text-xs font-medium text-orange-600 text-center mb-2">Please select a date to continue</p>
				{:else if selectedSlot === null}
					<p class="text-xs font-medium text-orange-600 text-center mb-2">Please select a time window to continue</p>
				{/if}
				<button
					disabled={!canConfirm}
					onclick={handleConfirm}
					class="w-full h-12 rounded-xl bg-[#B7410E] hover:bg-[#9A360B] text-white font-semibold text-sm transition disabled:bg-gray-300 disabled:cursor-not-allowed cursor-pointer"
				>Confirm</button>
			</div>
		</div>
	</div>
{/if}
