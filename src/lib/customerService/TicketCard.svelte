<script lang="ts">
	import ProgressBar from './ProgressBar.svelte';
	import CloseTicketModal from './CloseTicketModal.svelte';

	const statusColors: Record<string, { bg: string; text: string; border: string }> = {
		critical: { bg: 'bg-red-100', text: 'text-red-700', border: 'border-red-300' },
		urgent: { bg: 'bg-orange-100', text: 'text-orange-700', border: 'border-orange-300' },
		'in-progress': { bg: 'bg-blue-100', text: 'text-blue-700', border: 'border-blue-300' },
		pending: { bg: 'bg-gray-100', text: 'text-gray-600', border: 'border-gray-300' },
		closed: { bg: 'bg-gray-100', text: 'text-gray-500', border: 'border-gray-200' }
	};

	const actionColors: Record<string, string> = {
		red: 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100',
		orange: 'bg-orange-50 text-orange-700 border-orange-200 hover:bg-orange-100',
		blue: 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100',
		gray: 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
	};

	let { ticket, isClosed, onClose, onOpenChat }: {
		ticket: any;
		isClosed: boolean;
		onClose: (id: string, resolution: { reason: string; notes: string }) => void;
		onOpenChat: (chatWith: any, ticket: any) => void;
	} = $props();

	let showCloseModal = $state(false);
	const sc = isClosed ? statusColors.closed : (statusColors[ticket.status] || statusColors.pending);
</script>

<div class={`bg-white rounded-xl border ${sc.border} shadow-sm overflow-hidden transition ${isClosed ? 'opacity-60' : ''}`}>
	<div class={`px-5 py-3 flex items-center justify-between ${sc.bg} border-b ${sc.border}`}>
		<div class="flex items-center gap-2">
			<span class="text-lg">{ticket.categoryIcon}</span>
			<span class={`text-xs font-bold px-2 py-0.5 rounded-full ${sc.bg} ${sc.text} border ${sc.border}`}>{isClosed ? '✓ CLOSED' : ticket.statusLabel}</span>
			<span class="text-sm font-bold text-gray-900">#{ticket.id}</span>
			{#if ticket._source === 'api'}
				<span class="text-[10px] font-semibold text-green-600 bg-green-50 border border-green-200 px-1.5 py-0.5 rounded">LIVE</span>
			{/if}
		</div>
		<div class="flex items-center gap-3">
			{#if !isClosed}
				<span class={`text-sm font-bold ${ticket.minutesAgo > 30 ? 'text-orange-600' : 'text-gray-600'}`}>{ticket.minutesAgo}m ago</span>
			{/if}
			{#if !isClosed}
				<button onclick={() => (showCloseModal = true)} class="text-xs font-bold px-3 py-1 rounded-lg bg-gray-800 text-white hover:bg-gray-700 transition">Close Ticket</button>
			{/if}
		</div>
	</div>

	<div class="p-5 space-y-4">
		<p class="text-sm text-gray-700 font-medium">{ticket.issue}</p>

		{#if isClosed && ticket._resolution}
			<div class="bg-green-50 border border-green-200 rounded-lg px-4 py-3">
				<div class="flex items-center gap-2 mb-1">
					<span class="text-green-600 text-sm">✓</span>
					<span class="text-xs font-bold text-green-700">Resolved: {ticket._resolution.reason}</span>
				</div>
				{#if ticket._resolution.notes}<p class="text-xs text-green-600 ml-5">{ticket._resolution.notes}</p>{/if}
			</div>
		{/if}

		<div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
			<div class="flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-2">
				<span class="text-base">👤</span>
				<div class="flex-1 min-w-0">
					<p class="text-xs font-semibold text-gray-900 truncate">{ticket.customer.name}</p>
					<p class="text-[10px] text-gray-500">{ticket.customer.rating}⭐</p>
				</div>
				<div class="flex gap-1">
					<button class="w-6 h-6 rounded bg-white border border-gray-200 flex items-center justify-center text-[10px] hover:bg-green-50" title="Call">📞</button>
					<button onclick={() => onOpenChat({ name: ticket.customer.name, role: 'customer' }, ticket)} class="w-6 h-6 rounded bg-white border border-gray-200 flex items-center justify-center text-[10px] hover:bg-blue-50" title="Chat">💬</button>
				</div>
			</div>
			<div class="flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-2">
				<span class="text-base">🍕</span>
				<div class="flex-1 min-w-0">
					<p class="text-xs font-semibold text-gray-900 truncate">{ticket.merchant.name}</p>
					<p class="text-[10px] text-gray-500">[{ticket.merchant.tier}]</p>
				</div>
				<button onclick={() => onOpenChat({ name: ticket.merchant.name, role: 'merchant' }, ticket)} class="w-6 h-6 rounded bg-white border border-gray-200 flex items-center justify-center text-[10px] hover:bg-blue-50" title="Chat">💬</button>
			</div>
			<div class="flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-2">
				<span class="text-base">🚗</span>
				<div class="flex-1 min-w-0">
					<p class="text-xs font-semibold text-gray-900 truncate">{ticket.driver.name}</p>
					<p class="text-[10px] text-gray-500">{ticket.driver.lang}</p>
				</div>
				<div class="flex gap-1">
					<button class="w-6 h-6 rounded bg-white border border-gray-200 flex items-center justify-center text-[10px] hover:bg-green-50" title="Call">📞</button>
					<button onclick={() => onOpenChat({ name: ticket.driver.name, role: 'driver' }, ticket)} class="w-6 h-6 rounded bg-white border border-gray-200 flex items-center justify-center text-[10px] hover:bg-blue-50" title="Chat">💬</button>
				</div>
			</div>
		</div>

		<div class="space-y-2">
			<ProgressBar stage={ticket.stage} />
			<p class="text-xs text-gray-600">{ticket.lastSeen}</p>
			<p class="text-xs text-gray-500"><span class="font-semibold">Items:</span> {ticket.items}</p>
		</div>

		<div class="flex items-center gap-3">
			<span class="text-lg font-bold text-gray-900">${ticket.totalValue.toFixed(2)}</span>
			<span class="text-xs font-semibold text-green-700 bg-green-100 border border-green-200 px-2 py-0.5 rounded-full">Saved ${ticket.udoSaved.toFixed(2)}</span>
		</div>

		{#if !isClosed}
			<div class="flex flex-wrap gap-2 pt-2 border-t border-gray-100">
				{#each ticket.actions as action, i}
					<button class={`text-xs font-semibold px-3 py-1.5 rounded-lg border transition ${actionColors[action.color]}`}>{action.label}</button>
				{/each}
			</div>
		{/if}
	</div>
</div>

{#if showCloseModal}
	<CloseTicketModal
		ticket={ticket}
		onConfirm={(resolution) => { showCloseModal = false; onClose(ticket.id, resolution); }}
		onCancel={() => (showCloseModal = false)}
	/>
{/if}
