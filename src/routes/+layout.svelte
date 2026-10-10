<script lang="ts">
	import './layout.css';
	import favicon from '$lib/assets/favicon.svg';
	import SignInModal from '$lib/SignInModal.svelte';
	import SignUpModal from '$lib/SignUpModal.svelte';
	import { onMount } from 'svelte';
	import API_BASE from '$lib/api';
	import tokenManager from '$lib/tokenManager';

	let { children } = $props();

	// Before any child page fetches: send the login token to udo3 on every API call.
	tokenManager.installAuthFetch(API_BASE);

	onMount(async () => {
		const { registerSupabaseSessionHandler } = await import('$lib/authBridge');
		registerSupabaseSessionHandler();
	});
</script>

<svelte:head><link rel="icon" href={favicon} /></svelte:head>
{@render children()}
<SignInModal />
<SignUpModal />
