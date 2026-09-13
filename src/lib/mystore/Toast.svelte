<script lang="ts">
	let { message, type = 'success' }: { message: string; type?: string } = $props();
	const bg = type === 'error' ? 'bg-red-600' : type === 'success' ? 'bg-gray-900' : 'bg-gray-700';
</script>

<div class="fixed bottom-4 right-4 z-[200]">
	<div class={`${bg} text-white px-6 py-3 rounded-lg shadow-lg flex items-center gap-3`}>
		{#if type === 'success'}
			<svg class="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" /></svg>
		{/if}
		{#if type === 'error'}
			<svg class="w-5 h-5 text-red-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
		{/if}
		<span class="text-sm font-medium">{message}</span>
	</div>
</div>
