<script lang="ts">
	import type { Snippet } from 'svelte';
	import StorefrontHeader from './StorefrontHeader.svelte';
	import StorefrontSidebar from './StorefrontSidebar.svelte';
	import CartDrawer from './CartDrawer.svelte';
	import { ui, toggleSidebar, toggleCart, closeSidebar, closeCart } from './ui.svelte';

	let { home = false, pageBg = 'bg-white', children }: { home?: boolean; pageBg?: string; children: Snippet } = $props();
</script>

<div class={`${pageBg} min-h-dvh flex flex-col text-gray-900 transition-[padding-right] duration-300 pb-[env(safe-area-inset-bottom)] ${ui.cartOpen ? 'sm:pr-[420px]' : ''}`}>
	<StorefrontHeader onToggleSidebar={toggleSidebar} onToggleCart={toggleCart} {home} />

	<div class="flex flex-1">
		<StorefrontSidebar collapsed={!ui.sidebarOpen} onClose={closeSidebar} />

		<main class={`flex-1 w-full min-w-0 transition-[margin-left] duration-300 ${ui.sidebarOpen ? 'md:ml-56' : 'md:ml-0'}`}>
			{@render children()}
		</main>
	</div>
</div>
<CartDrawer open={ui.cartOpen} onClose={closeCart} />
