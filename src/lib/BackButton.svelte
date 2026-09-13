<script lang="ts">
	import { goto } from '$app/navigation';

	let { fallback = '/' } = $props();

	function goBack(e: MouseEvent) {
		e.preventDefault();
		if (window.history.length > 1) window.history.back();
		else goto(fallback);
	}
</script>

<a
	href={fallback}
	onclick={goBack}
	class="absolute left-0 w-10 h-10 rounded-xl bg-white ring-1 ring-black/[0.06] hover:bg-gray-50 flex items-center justify-center text-gray-700 cursor-pointer"
	aria-label="Go back"
>
	<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" /></svg>
</a>
