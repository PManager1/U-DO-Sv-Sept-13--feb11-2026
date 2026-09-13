<script lang="ts">
	const resolutionReasons = [
		'Refunded',
		'Replacement Sent',
		'Resolved via Chat',
		'Duplicate Ticket',
		'No Action Needed',
		'Customer Unreachable',
		'Escalated to Management'
	];

	let { ticket, onConfirm, onCancel }: {
		ticket: any;
		onConfirm: (resolution: { reason: string; notes: string }) => void;
		onCancel: () => void;
	} = $props();

	let reason = $state('');
	let notes = $state('');
</script>

<div class="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onclick={onCancel}>
	<div class="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden" onclick={(e) => e.stopPropagation()}>
		<div class="bg-gray-800 px-5 py-4 flex items-center justify-between">
			<div>
				<p class="text-sm font-bold text-white">Close Ticket #{ticket.id}</p>
				<p class="text-xs text-gray-400 mt-0.5">{ticket.issue}</p>
			</div>
			<button onclick={onCancel} class="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white text-sm transition">✕</button>
		</div>
		<div class="p-5 space-y-4">
			<div>
				<label class="block text-xs font-bold text-gray-700 mb-1.5">Resolution Reason *</label>
				<select value={reason} onchange={(e) => (reason = (e.currentTarget as HTMLSelectElement).value)} class="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white">
					<option value="">— Select a reason —</option>
					{#each resolutionReasons as r}<option value={r}>{r}</option>{/each}
				</select>
			</div>
			<div>
				<label class="block text-xs font-bold text-gray-700 mb-1.5">Notes (optional)</label>
				<textarea value={notes} oninput={(e) => (notes = (e.currentTarget as HTMLTextAreaElement).value)} rows={3} placeholder="Add any internal notes..." class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none"></textarea>
			</div>
			<div class="flex gap-3 pt-2">
				<button onclick={onCancel} class="flex-1 px-4 py-2.5 rounded-lg border border-gray-300 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition">Cancel</button>
				<button onclick={() => { if (!reason) return; onConfirm({ reason, notes }); }} disabled={!reason} class={`flex-1 px-4 py-2.5 rounded-lg text-sm font-bold text-white transition ${reason ? 'bg-green-600 hover:bg-green-700' : 'bg-gray-300 cursor-not-allowed'}`}>✓ Close Ticket</button>
			</div>
		</div>
	</div>
</div>
