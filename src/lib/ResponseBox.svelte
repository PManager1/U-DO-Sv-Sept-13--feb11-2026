<script lang="ts">
	let { box }: { box: any } = $props();

	function syntaxHighlight(json: string) {
		return json.replace(
			/(\"(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\\"])*\"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g,
			(match: string) => {
				let cls = 'text-amber-600';
				if (/^\"/.test(match)) {
					cls = /:$/.test(match) ? 'text-sky-700' : 'text-green-600';
				} else if (/true|false/.test(match)) {
					cls = 'text-purple-600';
				} else if (/null/.test(match)) {
					cls = 'text-gray-400';
				}
				return `<span class="${cls}">${match}</span>`;
			}
		);
	}
</script>

{#if !box || !box.open}
{:else if box.loading}
	<div class="mt-2 p-3 bg-gray-50 rounded-lg border border-gray-200">
		<div class="flex items-center gap-2 text-sm text-gray-500">
			<svg class="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path></svg>
			Calling {box.method || ''}...
		</div>
	</div>
{:else if box.error}
	<div class="mt-2 p-3 bg-red-50 rounded-lg border border-red-200">
		<div class="text-xs font-bold text-red-600 mb-1">Request Failed</div>
		<div class="text-xs text-red-500">{box.error}</div>
	</div>
{:else}
	{@const statusColor = box.ok ? 'text-green-600' : 'text-red-600'}
	{@const statusBg = box.ok ? 'bg-green-50' : 'bg-red-50'}
	{@const formatted = typeof box.body === 'string' ? box.body : syntaxHighlight(JSON.stringify(box.body, null, 2))}
	<div class="mt-2 rounded-lg border border-gray-200 overflow-hidden">
		<div class={`flex items-center justify-between px-3 py-2 ${statusBg} border-b border-gray-200`}>
			<div class="flex items-center gap-2">
				<span class={`text-xs font-bold ${statusColor}`}>HTTP {box.status}</span>
				<span class="text-xs text-gray-500">{box.method} {box.path}</span>
			</div>
			<button onclick={() => navigator.clipboard.writeText(typeof box.body === 'string' ? box.body : JSON.stringify(box.body, null, 2))} class="text-xs text-gray-500 hover:text-gray-700 flex items-center gap-1">
				<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
				Copy
			</button>
		</div>
		<pre class="p-3 text-xs overflow-x-auto bg-white max-h-64 overflow-y-auto"><code>{@html formatted}</code></pre>
	</div>
{/if}
