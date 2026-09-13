<script lang="ts">
	let {
		method,
		path,
		label = '',
		tryable = false,
		onTry
	}: {
		method: string;
		path: string;
		label?: string;
		tryable?: boolean;
		onTry?: (...args: any[]) => void;
	} = $props();

	const methodColors: Record<string, string> = {
		GET: 'bg-blue-100 text-blue-800',
		POST: 'bg-green-100 text-green-800',
		PUT: 'bg-yellow-100 text-yellow-800',
		PATCH: 'bg-purple-100 text-purple-800',
		DELETE: 'bg-red-100 text-red-800'
	};
</script>

<div class="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50">
	<span class={`text-[10px] font-bold tracking-wider px-2 py-0.5 rounded min-w-[52px] text-center ${methodColors[method] || 'bg-gray-100 text-gray-700'}`}>{method}</span>
	<code class="text-xs text-gray-600 flex-1 truncate">{path}</code>
	{#if label}<span class="text-[10px] text-gray-400 ml-1">{label}</span>{/if}
	{#if tryable}
		<button onclick={(e) => { e.stopPropagation(); onTry?.(method, path); }} class="text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-1 rounded-lg font-medium transition">Try It</button>
	{/if}
</div>
