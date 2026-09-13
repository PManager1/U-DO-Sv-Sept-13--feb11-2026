<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';

	const navItems = [
		{ label: 'Getting Started', icon: '🚀', path: '/mystore', query: '?onboarding=1' },
		{ label: 'Menu Items', icon: '🍔', path: '/mystore' },
		{ label: 'Orders', icon: '📋', path: '/mystore/orders' },
		{ label: 'Analytics', icon: '📊', path: '/mystore/analytics' },
		{ label: 'Reviews', icon: '⭐', path: '/mystore/reviews' },
		{ label: 'Profit Calculator', icon: '💰', path: '/mystore/profit-calculator' }
	];

	const sidebarActions = [
		{ label: 'Store Information', icon: '🏪', path: '/mystore/store-info' },
		{ label: 'Marketing Flyer', icon: '📄', path: '/mystore/marketing-flyer' },
		{ label: 'Settings', icon: '⚙️', path: '/mystore/settings' }
	];

	let { collapsed, onCollapse, showOnboardingBadge = false }: {
		collapsed: boolean;
		onCollapse: () => void;
		showOnboardingBadge?: boolean;
	} = $props();

	const currentPath = $derived(page.url.pathname);
	const hasSearch = $derived(page.url.search.length > 0);

	function handleNav(path: string) {
		goto(path);
		onCollapse();
	}
</script>

{#snippet sidebarContent()}
	<button onclick={onCollapse} class="p-3 flex items-center justify-center hover:bg-gray-100 transition border-b border-gray-100" title="Close sidebar">
		<svg class="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 19l-7-7 7-7M19 19l-7-7 7-7" /></svg>
	</button>

	<nav class="py-2">
		{#each navItems as item}
			{@const isOnboardingItem = !!item.query}
			{@const isActive = !isOnboardingItem && currentPath === item.path && !hasSearch}
			<button onclick={() => handleNav(item.query ? `${item.path}${item.query}` : item.path)} class={`w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium transition ${isActive ? 'bg-orange-50 text-orange-600 border-r-2 border-orange-500' : isOnboardingItem ? 'text-orange-600 hover:bg-orange-50 hover:text-orange-700 font-semibold' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'}`} title={item.label}>
				<span class="text-lg flex-shrink-0">{item.icon}</span>
				<span>{item.label}</span>
				{#if isOnboardingItem && showOnboardingBadge}
					<span class="ml-auto text-[10px] bg-orange-500 text-white px-1.5 py-0.5 rounded-full animate-pulse">New</span>
				{/if}
			</button>
		{/each}
	</nav>

	<div class="py-2 border-t border-gray-100">
		{#each sidebarActions as item}
			<button onclick={() => handleNav(item.path)} class="w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium transition text-gray-600 hover:bg-gray-50 hover:text-gray-900" title={item.label}>
				<span class="text-lg flex-shrink-0">{item.icon}</span>
				<span>{item.label}</span>
			</button>
		{/each}
	</div>

	<div class="p-3 border-t border-gray-100">
		<label class="flex items-center gap-2 px-3 py-2 text-sm text-gray-500 hover:text-orange-500 hover:bg-orange-50 rounded-lg cursor-pointer transition">
			<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
			Upload Menu
			<input type="file" accept=".pdf,.jpg,.jpeg,.png" class="hidden" />
		</label>
	</div>
{/snippet}

<!-- Mobile overlay sidebar -->
{#if !collapsed}
	<div class="fixed inset-0 bg-black/40 z-[90] md:hidden" onclick={onCollapse}></div>
{/if}
<aside class={`fixed top-0 left-0 h-full w-64 bg-white border-r border-gray-200 z-[95] flex flex-col transition-transform duration-300 md:hidden ${collapsed ? '-translate-x-full' : 'translate-x-0'}`}>
	{@render sidebarContent()}
</aside>

<!-- Desktop collapsed open button -->
{#if collapsed}
	<button onclick={() => onCollapse()} class="hidden md:block fixed top-0 left-0 z-[100] p-3 bg-white hover:bg-gray-100 border-r border-b border-gray-200 transition" title="Open sidebar">
		<svg class="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 5l7 7-7 7M5 5l7 7-7 7" /></svg>
	</button>
{/if}

<!-- Desktop inline sidebar -->
{#if !collapsed}
	<aside class="hidden md:flex w-56 bg-white border-r border-gray-200 flex-col transition-all duration-300 flex-shrink-0">
		{@render sidebarContent()}
	</aside>
{/if}
