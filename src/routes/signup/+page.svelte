<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';

	onMount(() => {
		goto('/login/');
	});
</script>

<svelte:head><title>Sign up · U-DO</title></svelte:head>

<div class="min-h-screen flex items-center justify-center">
	<p class="text-gray-600">Redirecting to sign in...</p>
</div>
