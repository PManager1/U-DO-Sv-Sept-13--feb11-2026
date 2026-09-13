<script lang="ts">
	import { storePath } from '$lib/storePath';

	let { store }: { store: any } = $props();
</script>

<a href={storePath(store)} class="flex items-center gap-3 p-3 rounded-xl border border-gray-100 bg-white hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 active:scale-[0.98]">
	<div class="w-16 h-16 rounded-xl overflow-hidden flex-shrink-0 bg-gray-100">
		{#if store.logo}
			<img src={store.logo} alt={store.name} class="w-full h-full object-contain object-center bg-white" />
		{:else}
			<div class="w-full h-full flex items-center justify-center text-2xl font-bold text-gray-400">
				{store.name.charAt(0)}
			</div>
		{/if}
	</div>

	<div class="flex-1 min-w-0">
		<h3 class="text-sm font-bold text-gray-900 truncate">{store.name}</h3>
		<div class="flex items-center gap-2 text-xs text-gray-500 mt-0.5">
			<span>{store.eta}</span>
		</div>
		{#if store.badges && store.badges.length > 0}
			<div class="flex gap-1 mt-1">
				{#each store.badges as badge}
					<span class="text-[10px] font-semibold bg-orange-50 text-orange-600 px-1.5 py-0.5 rounded-full">{badge}</span>
				{/each}
			</div>
		{/if}
	</div>
</a>
