<script lang="ts">
	import { goto } from '$app/navigation';
</script>

<div class="min-h-screen bg-[#f9f7f5]">
	<header class="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-200 shadow-sm">
		<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center gap-4">
			<button onclick={() => goto('/mystore')} class="p-2 text-gray-500 hover:text-orange-500 hover:bg-gray-100 rounded-lg transition">
				<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" /></svg>
			</button>
			<h1 class="text-2xl font-bold text-gray-900">⭐ Reviews</h1>
		</div>
	</header>
	<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center text-gray-400">
		<p class="text-lg font-medium">Coming soon</p>
	</div>
</div>
