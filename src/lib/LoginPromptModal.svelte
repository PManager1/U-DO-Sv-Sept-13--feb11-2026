<script lang="ts">
	import { openSignIn } from './authModal.svelte';

	let { open, onClose }: { open: boolean; onClose: () => void } = $props();

	$effect(() => {
		if (!open) return;
		const onKey = (e: KeyboardEvent) => {
			if (e.key === 'Escape') onClose();
		};
		window.addEventListener('keydown', onKey);
		return () => window.removeEventListener('keydown', onKey);
	});
</script>

{#if open}
	<div class="fixed inset-0 z-[100] flex items-center justify-center p-4">
		<div class="absolute inset-0 bg-black/40 backdrop-blur-sm" onclick={onClose}></div>
		<div class="relative w-full max-w-sm bg-white rounded-3xl shadow-2xl overflow-hidden p-6 text-center animate-[fadeIn_0.2s_ease-out]">
			<div class="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
				<svg class="w-8 h-8 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" /></svg>
			</div>
			<h3 class="text-xl font-bold text-gray-900 mb-2">Login required</h3>
			<p class="text-gray-600 text-sm mb-6">Please log in to save your favorite brands.</p>
			<button onclick={() => { onClose(); openSignIn(); }} class="block w-full bg-orange-500 hover:bg-orange-600 text-white font-semibold py-3 rounded-xl transition">Login</button>
			<button onclick={onClose} class="mt-3 w-full text-gray-600 hover:text-gray-800 font-medium text-sm py-2 transition">
				Not now
			</button>
		</div>
	</div>
{/if}
