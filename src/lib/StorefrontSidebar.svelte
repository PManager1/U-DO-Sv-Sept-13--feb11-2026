<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import tokenManager from './tokenManager';
	import API_BASE from './api';
	import { openSignIn } from './authModal.svelte';

	let { collapsed, onClose } = $props<{ collapsed: boolean; onClose: () => void }>();

	let accountOpen = $state(false);
	let userName = $state('User');
	let userEmail = $state('');
	let userInitials = $state('U');
	let userAvatar = $state('');

	const navItems = [
		{ label: 'Home', icon: '🏠', category: 'home', path: '/' },
		{ label: 'Grocery', icon: '🛒', category: 'grocery', path: '/grocery' },
		{ label: 'Retail', icon: '🛍️', category: 'retail', path: '/' },
		{ label: 'Convenience', icon: '⏱️', category: 'convenience', path: '/' },
		{ label: 'Browse All', icon: '🔍', category: 'all', path: '/' }
	];

	const isLoggedIn = tokenManager.hasValidToken();

	const accountLinks = [
		{ label: 'Orders & Reorders', icon: '📦', href: '/orders/' },
		{ label: 'Payment Methods / Wallet', icon: '💳', href: '/settings/#payment' },
		// { label: 'Saved Addresses', icon: '📍', href: '/settings/#addresses' },
		// { label: 'Offers & Promo Codes', icon: '🏷️', href: '/settings/#offers' }
	];

	const secondaryLinks = [
		{ label: 'Account Settings', icon: '⚙️', href: '/settings/' },
		{ label: 'Help & Support', icon: '❓', href: '/help/' }
	];

	let accountRef: HTMLElement | null = $state(null);

	onMount(() => {
		const onKey = (e: KeyboardEvent) => {
			if (e.key === 'Escape') accountOpen = false;
		};
		const onDown = (e: MouseEvent) => {
			if (accountRef && !accountRef.contains(e.target as Node)) {
				accountOpen = false;
			}
		};

		const headers = tokenManager.getHeaders();
		if (headers.Authorization) {
			fetch(API_BASE + 'me', { headers })
				.then((r) => r.json())
				.then((data) => {
					const user = data.user || data;
					const first = user.firstName || '';
					const last = user.lastName || '';
					const full = [first, last].filter(Boolean).join(' ') || 'User';
					userName = full;
					userEmail = user.email || '';
					userAvatar = user.profileImage || user.profileImageUrl || '';
					const ini = [first, last].filter(Boolean).map((n: string) => n.charAt(0).toUpperCase()).join('');
					if (ini) userInitials = ini;
				})
				.catch(() => {});
		}

		document.addEventListener('keydown', onKey);
		document.addEventListener('mousedown', onDown);
		return () => {
			document.removeEventListener('keydown', onKey);
			document.removeEventListener('mousedown', onDown);
		};
	});

	const activeCategory = $derived(
		page.url.pathname === '/' ? 'home' : page.url.pathname.split('/')[2] || 'home'
	);

	function go(path: string) {
		window.location.href = path;
		onClose();
	}

	async function handleSignOut() {
		accountOpen = false;
		onClose();
		tokenManager.clearAllTokens();
		try {
			const { supabase } = await import('./supabase');
			await supabase.auth.signOut();
		} catch {
			// Supabase not configured — fall back to backend token clear only
		}
		await goto('/login/');
	}
</script>

{#snippet sidebarContent()}
	<div class="md:hidden flex items-center justify-end p-3 border-b border-gray-100">
		<button onclick={onClose} class="p-1 text-gray-500">
			<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" /></svg>
		</button>
	</div>

	<nav class="flex-1 py-4 px-3 space-y-1">
		{#each navItems as item}
			{@const isActive = activeCategory === item.category}
			<button
				onclick={() => go(item.path)}
				class={`w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-lg transition ${
					isActive ? 'bg-red-50 text-red-600' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
				}`}
			>
				<span class="text-lg">{item.icon}</span>
				<span>{item.label}</span>
			</button>
		{/each}
	</nav>

	<div class="p-4 border-t border-gray-100 relative">
		{#if isLoggedIn}
			<div bind:this={accountRef} class="relative">
				<button
					onclick={() => (accountOpen = !accountOpen)}
					class="w-full flex items-center justify-between gap-2 text-sm font-medium text-gray-600 hover:text-orange-500 transition rounded-lg px-1 py-1"
					aria-haspopup="true"
					aria-expanded={accountOpen}
				>
					<span class="flex items-center gap-2 min-w-0">
						<svg class="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
						<span class="truncate">My Account</span>
					</span>
					<svg class={`w-3.5 h-3.5 text-gray-400 flex-shrink-0 transition-transform duration-200 ${accountOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7" /></svg>
				</button>

				{#if accountOpen}
					<div role="menu" class="account-flyout">
						<!-- User header -->
						<div class="flyout-user-header">
							{#if userAvatar}
								<img src={userAvatar} alt={userName} class="w-10 h-10 rounded-full object-cover flex-shrink-0" />
							{:else}
								<div class="w-10 h-10 rounded-full bg-orange-500 flex items-center justify-center text-white font-semibold text-sm flex-shrink-0">{userInitials}</div>
							{/if}
							<div class="min-w-0">
								<p class="text-sm font-semibold text-gray-900 truncate">{userName}</p>
								<p class="text-xs text-gray-500 truncate">{userEmail || 'Signed in'}</p>
							</div>
						</div>

						<!-- Primary links -->
						<div class="flyout-group">
							{#each accountLinks as link}
								<a href={link.href} role="menuitem" onclick={() => { accountOpen = false; onClose(); }} class="flyout-item">
									<span class="flyout-icon">{link.icon}</span>
									<span class="truncate">{link.label}</span>
								</a>
							{/each}
						</div>

						<!-- Secondary links -->
						<div class="flyout-group flyout-group-border">
							{#each secondaryLinks as link}
								<a href={link.href} role="menuitem" onclick={() => { accountOpen = false; onClose(); }} class="flyout-item">
									<span class="flyout-icon">{link.icon}</span>
									<span class="truncate">{link.label}</span>
								</a>
							{/each}
						</div>

						<!-- Sign out -->
						<div class="flyout-group-border">
							<button onclick={handleSignOut} role="menuitem" class="flyout-item logout w-full text-left">
								<span class="flyout-icon">🚪</span>
								<span>Sign Out</span>
							</button>
						</div>
					</div>
				{/if}
			</div>
		{:else}
			<a href="/login/" onclick={(e) => { e.preventDefault(); onClose(); openSignIn(); }} class="flex items-center gap-2 text-sm font-medium text-orange-600 hover:text-orange-700 transition">
				<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" /></svg>
				Sign in or Sign up
			</a>
		{/if}
	</div>
{/snippet}

{#if !collapsed}
	<div class="fixed inset-0 bg-black/40 z-[90] md:hidden" onclick={onClose}></div>
{/if}

<aside
	class={`fixed top-0 left-0 bottom-0 w-64 bg-white border-r border-gray-200 z-[95] flex flex-col transition-transform duration-300 md:hidden pb-[env(safe-area-inset-bottom)] ${
		collapsed ? '-translate-x-full' : 'translate-x-0'
	}`}
>
	{@render sidebarContent()}
</aside>

<aside
	class={`hidden md:flex w-56 bg-white border-r border-gray-200 flex-col flex-shrink-0 fixed left-0 top-16 bottom-0 z-10 transition-transform duration-300 ${
		collapsed ? '-translate-x-full' : 'translate-x-0'
	}`}
>
	{@render sidebarContent()}
</aside>

<style>
	.account-flyout {
		position: absolute;
		bottom: 0;
		left: 100%;
		margin-left: 12px;
		width: 280px;
		max-width: calc(100vw - 2rem);
		background: #ffffff;
		border-radius: 16px;
		box-shadow: 0px 20px 25px -5px rgba(0, 0, 0, 0.1), 0px 8px 10px -6px rgba(0, 0, 0, 0.05);
		border: 1px solid #f1f5f9;
		padding: 16px;
		z-index: 100;

		animation: flyoutIn 0.2s cubic-bezier(0.16, 1, 0.3, 1);
	}

	@keyframes flyoutIn {
		from {
			opacity: 0;
			transform: translateX(-10px) scale(0.98);
		}
		to {
			opacity: 1;
			transform: translateX(0) scale(1);
		}
	}

	.flyout-user-header {
		display: flex;
		align-items: center;
		gap: 12px;
		padding-bottom: 12px;
		margin-bottom: 8px;
		border-bottom: 1px solid #f1f5f9;
	}

	.flyout-group {
		display: flex;
		flex-direction: column;
	}

	.flyout-group-border {
		margin-top: 6px;
		padding-top: 6px;
		border-top: 1px solid #f1f5f9;
	}

	.flyout-item {
		display: flex;
		align-items: center;
		gap: 12px;
		padding: 10px 12px;
		border-radius: 8px;
		font-size: 14px;
		font-weight: 500;
		color: #334155;
		cursor: pointer;
		transition: background-color 0.15s ease;
	}

	.flyout-item:hover {
		background-color: #f8fafc;
		color: #0f172a;
	}

	.flyout-icon {
		width: 18px;
		flex-shrink: 0;
		text-align: center;
	}

	.flyout-item.logout {
		color: #ef4444;
	}

	.flyout-item.logout:hover {
		background-color: #fef2f2;
	}

	/* Mobile: render the flyout as a bottom sheet that stays within the
	   mobile drawer (the drawer's translate-x transform makes `fixed`
	   resolve against the 256px sidebar), sliding up instead of to the right. */
	@media (max-width: 767px) {
		.account-flyout {
			position: fixed;
			left: 12px;
			right: 12px;
			bottom: 12px;
			width: auto;
			max-width: none;
			margin-left: 0;
			transform-origin: bottom center;
			animation-name: flyoutInMobile;
		}

		@keyframes flyoutInMobile {
			from {
				opacity: 0;
				transform: translateY(12px) scale(0.98);
			}
			to {
				opacity: 1;
				transform: translateY(0) scale(1);
			}
		}
	}
</style>
