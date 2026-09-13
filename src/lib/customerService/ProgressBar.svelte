<script lang="ts">
	let { stage }: { stage: string } = $props();

	const stages = ['ordered', 'preparing', 'in-transit', 'delivered'];
	const idx = stages.indexOf(stage);
</script>

<div class="flex items-center gap-1">
	{#each stages as s, i}
		<div class="flex-1 flex items-center gap-1">
			<div class={`h-2 flex-1 rounded-full ${i <= idx ? 'bg-green-500' : 'bg-gray-200'}`} title={s}></div>
		</div>
	{/each}
	<span class="text-[10px] text-gray-500 ml-1 uppercase font-semibold">{stage}</span>
</div>
