<script lang="ts">
	import './layout.css';
	import favicon from '$lib/assets/favicon.svg';
	import SignInModal from '$lib/SignInModal.svelte';
	import SignUpModal from '$lib/SignUpModal.svelte';
	import { onMount } from 'svelte';

	let { children } = $props();

	onMount(async () => {
		const { registerSupabaseSessionHandler } = await import('$lib/authBridge');
		registerSupabaseSessionHandler();
	});
</script>

<svelte:head><link rel="icon" href={favicon} /></svelte:head>
{@render children()}
<SignInModal />
<SignUpModal />
