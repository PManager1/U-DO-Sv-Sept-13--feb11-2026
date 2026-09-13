<script lang="ts">
	import { onMount } from 'svelte';
	import API_BASE from '$lib/api';
	import AdminCard from '$lib/AdminCard.svelte';
	import EndpointRow from '$lib/EndpointRow.svelte';
	import ResponseBox from '$lib/ResponseBox.svelte';

	let expandedCard = $state<string | null>(null);
	let responseBoxes = $state<Record<string, any>>({});
	let pushTitle = $state('');
	let pushMessage = $state('');
	let pushStatus = $state<{ type: string; text: string } | null>(null);
	let icMinVersion = $state('');
	let ipMinVersion = $state('');
	let acMinVersion = $state('');
	let apMinVersion = $state('');
	let versionStatus = $state<{ type: string; text: string } | null>(null);
	let searchQuery = $state('');

	onMount(() => {
		fetch(API_BASE + 'app-version')
			.then((r) => r.json())
			.then((data: any) => {
				if (data.ic_min_version) icMinVersion = data.ic_min_version;
				if (data.ip_min_version) ipMinVersion = data.ip_min_version;
				if (data.ac_min_version) acMinVersion = data.ac_min_version;
				if (data.ap_min_version) apMinVersion = data.ap_min_version;
			})
			.catch(() => {});
	});

	async function saveAppVersion() {
		if (!icMinVersion && !ipMinVersion && !acMinVersion && !apMinVersion) {
			versionStatus = { type: 'warn', text: '⚠️ Enter at least one version.' };
			return;
		}
		versionStatus = { type: 'saving', text: 'Saving…' };
		try {
			const res = await fetch(API_BASE + 'admin/app-version', {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					ic_min_version: icMinVersion || '0.0.0',
					ip_min_version: ipMinVersion || '0.0.0',
					ac_min_version: acMinVersion || '0.0.0',
					ap_min_version: apMinVersion || '0.0.0'
				})
			});
			const data = await res.json();
			if (res.ok && data.success) {
				const ic = data.ic_min_version || icMinVersion;
				const ip = data.ip_min_version || ipMinVersion;
				const ac = data.ac_min_version || acMinVersion;
				const ap = data.ap_min_version || apMinVersion;
				versionStatus = { type: 'success', text: `✅ Saved! IC: ${ic} · IP: ${ip} · AC: ${ac} · AP: ${ap}` };
			} else {
				versionStatus = { type: 'warn', text: `⚠️ ${data.message || data.error || 'Failed to save'}` };
			}
		} catch (err) {
			versionStatus = { type: 'warn', text: `❌ Network error: ${(err as Error).message}` };
		}
	}

	function toggleCard(id: string) {
		expandedCard = expandedCard === id ? null : id;
	}

	function visible(...texts: string[]) {
		if (!searchQuery.trim()) return true;
		const q = searchQuery.toLowerCase();
		return texts.join(' ').toLowerCase().includes(q);
	}

	const showMainSection = $derived(
		visible('Users Management') ||
		visible('Add Food Item') ||
		visible('Food Categories') ||
		visible('Restaurant Owners') ||
		visible('Categories') ||
		visible('Restaurants') ||
		visible('Grocery Stores') ||
		visible('All Services') ||
		visible('Brands')
	);
	const showSecondarySection = $derived(
		visible('Customer Service') ||
		visible('Fin Models') ||
		visible('Push Notifications') ||
		visible('Search Overlay API') ||
		visible('Profile Images') ||
		visible('Early Access') ||
		visible('Search Overlay Items') ||
		visible('Min App Version')
	);
	const showQuickLinks = $derived(
		visible('Dashboard') || visible('Home Page') || visible('Login') || visible('Signup') || visible('Profiles') || visible('Food Delivery')
	);
	const hasAnyMatch = $derived(showMainSection || showSecondarySection || showQuickLinks);

	async function tryEndpoint(method: string, path: string, key: string) {
		if (responseBoxes[key]?.open) {
			responseBoxes = { ...responseBoxes, [key]: { ...responseBoxes[key], open: false } };
			return;
		}
		responseBoxes = { ...responseBoxes, [key]: { open: true, loading: true } };
		try {
			const url = API_BASE + path.replace(/^\//, '');
			const res = await fetch(url, { method });
			const contentType = res.headers.get('content-type') || '';
			let body;
			try {
				body = await res.json();
			} catch {
				body = await res.text();
			}
			responseBoxes = {
				...responseBoxes,
				[key]: { open: true, loading: false, status: res.status, ok: res.ok, body, method, path }
			};
		} catch (err) {
			responseBoxes = {
				...responseBoxes,
				[key]: { open: true, loading: false, error: (err as Error).message }
			};
		}
	}

	async function sendPushNotification() {
		if (!pushTitle && !pushMessage) {
			pushStatus = { type: 'warn', text: '⚠️ Please enter a title or message before sending.' };
			return;
		}
		pushStatus = { type: 'sending', text: 'Sending notification to all devices…' };
		try {
			const res = await fetch(API_BASE + 'admin/test-send-push-notification', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					target: 'iClient',
					title: pushTitle || 'Hello from Birdy!',
					message: pushMessage || 'A new update is available!'
				})
			});
			const data = await res.json();
			if (res.ok && data.success) {
				pushStatus = { type: 'success', text: `✅ Sent to ${data.sent} devices! "${pushTitle || 'Hello from Birdy!'}" — ${pushMessage || 'Update'}` };
			} else {
				pushStatus = { type: 'warn', text: `⚠️ ${data.message || data.error || 'Failed to send notification'}` };
			}
		} catch (err) {
			pushStatus = { type: 'warn', text: `❌ Network error: ${(err as Error).message}` };
		}
	}

	function rb(path: string, method: string) {
		return responseBoxes[`${path}-${method}`];
	}

	function statusColorClass(t: string) {
		if (t === 'success') return 'bg-green-50 text-green-700';
		if (t === 'warn') return 'bg-yellow-50 text-yellow-700';
		return 'bg-blue-50 text-blue-700';
	}
</script>

{#snippet iconUsers()}<svg class="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" /></svg>{/snippet}
{#snippet iconPlus()}<svg class="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>{/snippet}
{#snippet iconTag()}<svg class="w-6 h-6 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" /></svg>{/snippet}
{#snippet iconPeople()}<svg class="w-6 h-6 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>{/snippet}
{#snippet iconBuilding()}<svg class="w-6 h-6 text-rose-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>{/snippet}
{#snippet iconList()}<svg class="w-6 h-6 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 10h16M4 14h16M4 18h16" /></svg>{/snippet}
{#snippet iconVioletBuilding()}<svg class="w-6 h-6 text-violet-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>{/snippet}
{#snippet iconClipboard()}<svg class="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg>{/snippet}
{#snippet iconWallet()}<svg class="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" /></svg>{/snippet}
{#snippet iconPin()}<svg class="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>{/snippet}
{#snippet iconMap()}<svg class="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>{/snippet}
{#snippet iconSupport()}<svg class="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z" /></svg>{/snippet}
{#snippet iconMoney()}<svg class="w-6 h-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>{/snippet}
{#snippet iconBell()}<svg class="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>{/snippet}
{#snippet iconSearch()}<svg class="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>{/snippet}
{#snippet iconPhoto()}<svg class="w-6 h-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>{/snippet}
{#snippet iconMail()}<svg class="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>{/snippet}
{#snippet iconVersion()}<svg class="w-6 h-6 text-cyan-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" /></svg>{/snippet}

<div class="min-h-screen bg-gray-50">
	<header class="bg-white border-b border-gray-200">
		<div class="max-w-6xl mx-auto px-6 py-6">
			<div class="flex items-center gap-3">
				<div class="w-10 h-10 bg-orange-500 rounded-xl flex items-center justify-center">
					<svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
				</div>
				<div>
					<h1 class="text-2xl font-bold text-gray-900">UDO Admin Dashboard</h1>
					<p class="text-sm text-gray-500">All admin tools & management pages in one place</p>
				</div>
			</div>
			<div class="mt-4 relative max-w-md">
				<svg class="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
				<input type="text" value={searchQuery} oninput={(e) => (searchQuery = (e.currentTarget as HTMLInputElement).value)} placeholder="Search admin tools..." class="w-full pl-10 pr-10 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent bg-gray-50 placeholder-gray-400" />
				{#if searchQuery}
					<button onclick={() => (searchQuery = '')} class="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" /></svg></button>
				{/if}
			</div>
		</div>
	</header>

	<main class="max-w-6xl mx-auto px-6 py-8">
		<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
			<AdminCard id="users" title="Users Management" description="CRUD operations for users and profiles." hidden={!visible('Users Management', 'CRUD operations for users and profiles.')} linkTo="/admin/users" linkLabel="Open Users Page →" icon={iconUsers} iconBg="bg-blue-100" {expandedCard} onToggle={toggleCard}>
				<div class="space-y-2">
					<EndpointRow method="GET" path="/admin/users" tryable onTry={(m, p) => tryEndpoint(m, p, '/admin/users-GET')} />
					<ResponseBox box={rb('/admin/users', 'GET')} />
					<EndpointRow method="POST" path="/admin/users" label="Needs body" onTry={tryEndpoint} />
					<EndpointRow method="GET" path={'/admin/users/{id}/profile'} label="Needs ID" onTry={tryEndpoint} />
					<EndpointRow method="PUT" path={'/admin/users/{id}/profile-image'} label="Needs body" onTry={tryEndpoint} />
				</div>
			</AdminCard>

			<AdminCard id="add-food" title="Add Food Item" description="Add new food items to restaurant menus with images and pricing." hidden={!visible('Add Food Item', 'Add new food items to restaurant menus with images and pricing.', 'PAGE')} badge="PAGE" badgeColor="text-orange-600" badgeBg="bg-orange-50" linkHref="/AddFoodItem/" linkLabel="Open Page →" icon={iconPlus} iconBg="bg-orange-100" {expandedCard} onToggle={toggleCard}></AdminCard>

			<AdminCard id="food-categories" title="Food Categories" description="Manage shared food categories that appear on /addfooditem. Edit, delete, and toggle on/off." hidden={!visible('Food Categories', 'Manage shared food categories that appear on /addfooditem. Edit, delete, and toggle on/off.', 'PAGE')} badge="PAGE" badgeColor="text-amber-600" badgeBg="bg-amber-50" linkHref="/foodcategories/" linkLabel="Open Admin Page →" icon={iconTag} iconBg="bg-amber-100" {expandedCard} onToggle={toggleCard}>
				<div class="space-y-2">
					<EndpointRow method="GET" path="/food-categories" label="(public)" tryable onTry={(m, p) => tryEndpoint(m, p, '/food-categories-GET')} />
					<ResponseBox box={rb('/food-categories', 'GET')} />
					<EndpointRow method="POST" path="/rest/food-categories" label="Needs body" onTry={tryEndpoint} />
					<EndpointRow method="PUT" path={'/rest/food-categories/{id}'} label="Needs body + ID" onTry={tryEndpoint} />
					<EndpointRow method="DELETE" path={'/rest/food-categories/{id}'} label="Needs ID" onTry={tryEndpoint} />
					<EndpointRow method="PATCH" path={'/rest/food-categories/{id}/toggle'} label="Needs body" onTry={tryEndpoint} />
				</div>
			</AdminCard>

			<AdminCard id="restaurant-owners" title="Restaurant Owners" description="View all users and their linked restaurants. Click to expand restaurant details." hidden={!visible('Restaurant Owners', 'View all users and their linked restaurants. Click to expand restaurant details.', 'PAGE')} badge="PAGE" badgeColor="text-teal-600" badgeBg="bg-teal-50" linkTo="/admin/restaurant-owners/" linkLabel="Open Restaurant Owners →" icon={iconPeople} iconBg="bg-teal-100" {expandedCard} onToggle={toggleCard}></AdminCard>

			<AdminCard id="categories" title="Categories" description="Manage service categories with toggle on/off." hidden={!visible('Categories', 'Manage service categories with toggle on/off.')} icon={iconTag} iconBg="bg-yellow-100" {expandedCard} onToggle={toggleCard}>
				<div class="space-y-2">
					<EndpointRow method="GET" path="/admin/categories" tryable onTry={(m, p) => tryEndpoint(m, p, '/admin/categories-GET')} />
					<ResponseBox box={rb('/admin/categories', 'GET')} />
					<EndpointRow method="POST" path="/admin/categories" label="Needs body" onTry={tryEndpoint} />
					<EndpointRow method="PATCH" path={'/admin/categories/{id}/toggle'} label="Needs body" onTry={tryEndpoint} />
					<EndpointRow method="GET" path="/categories" tryable onTry={(m, p) => tryEndpoint(m, p, '/categories-GET')} />
					<ResponseBox box={rb('/categories', 'GET')} />
				</div>
			</AdminCard>

			<AdminCard id="restaurants" title="Restaurants" description="Browse and filter restaurants by category." hidden={!visible('Restaurants', 'Browse and filter restaurants by category.', 'API')} badge="API" badgeColor="text-blue-600" badgeBg="bg-blue-50" icon={iconBuilding} iconBg="bg-rose-100" {expandedCard} onToggle={toggleCard}>
				<div class="space-y-2">
					<EndpointRow method="GET" path="/restaurants" label="(public)" tryable onTry={(m, p) => tryEndpoint(m, p, '/restaurants-GET')} />
					<ResponseBox box={rb('/restaurants', 'GET')} />
					<EndpointRow method="GET" path="/restaurants?category=fast-food" label="(filter)" tryable onTry={(m, p) => tryEndpoint(m, p, '/restaurants?category=fast-food-GET')} />
					<ResponseBox box={rb('/restaurants?category=fast-food', 'GET')} />
					<EndpointRow method="GET" path={'/restaurants/{id}'} label="Needs ID" onTry={tryEndpoint} />
				</div>
			</AdminCard>

			<AdminCard id="all-services" title="All Services" description="View, enable & disable all service categories available on the platform." hidden={!visible('All Services', 'View, enable & disable all service categories available on the platform.', 'PAGE')} badge="PAGE" badgeColor="text-emerald-600" badgeBg="bg-emerald-50" linkTo="/admin/services" linkLabel="Open Services Page →" icon={iconList} iconBg="bg-emerald-100" {expandedCard} onToggle={toggleCard}></AdminCard>

			<AdminCard id="chain-brands" title="Brands" description="Manage enterprise brands — Pizza Hut, Safeway, Taco Bell. Brands, locations, menus & catalogs." hidden={!visible('Brands', 'Manage enterprise brands — Pizza Hut, Safeway, Taco Bell. Brands, locations, menus & catalogs.', 'PAGE')} badge="PAGE" badgeColor="text-violet-600" badgeBg="bg-violet-50" linkTo="/admin/brands" linkLabel="Open Brands →" linkTo2="/admin/brandinfo" linkLabel2="open BrandInfo" icon={iconVioletBuilding} iconBg="bg-violet-100" {expandedCard} onToggle={toggleCard}></AdminCard>

			<AdminCard id="orders" title="Orders" description="View all brand orders — grocery, restaurant, pharmacy, and convenience store orders with status tracking." hidden={!visible('Orders', 'View all brand orders — grocery, restaurant, pharmacy, and convenience store orders with status tracking.', 'PAGE')} badge="PAGE" badgeColor="text-orange-600" badgeBg="bg-orange-50" linkTo="/admin/orders" linkLabel="Open Orders →" icon={iconClipboard} iconBg="bg-orange-100" {expandedCard} onToggle={toggleCard}></AdminCard>

			<AdminCard id="appdata" title="AppData" description="User analytics, referral tracking, and campus logistics." hidden={!visible('AppData', 'App Data', 'Rewards', 'User analytics, referral tracking, and campus logistics.', 'PAGE')} badge="PAGE" badgeColor="text-yellow-600" badgeBg="bg-yellow-50" linkTo="/admin/rewards" linkLabel="Open Rewards →" linkTo2="/admin/appdata" linkLabel2="Open AppData →" icon={iconWallet} iconBg="bg-yellow-100" {expandedCard} onToggle={toggleCard}></AdminCard>

			<AdminCard id="downloads" title="📍 Downloads" description="View where users opened the app after download." hidden={!visible('Downloads', 'View where users opened the app after download.')} badge="PAGE" badgeColor="text-blue-600" badgeBg="bg-blue-50" linkTo="/admin/downloads" linkLabel="Open Downloads →" icon={iconPin} iconBg="bg-blue-100" {expandedCard} onToggle={toggleCard}></AdminCard>

			<AdminCard id="zone-interests" title="📋 Zone Interests" description="View user signups for neighborhoods not yet in delivery zones." hidden={!visible('Zone Interests', 'View user signups for neighborhoods not yet in delivery zones.')} badge="PAGE" badgeColor="text-purple-600" badgeBg="bg-purple-50" linkTo="/admin/zone-interests" linkLabel="Open Zone Interests →" icon={iconMap} iconBg="bg-purple-100" {expandedCard} onToggle={toggleCard}></AdminCard>
		</div>

		{#if showSecondarySection}
			<h2 class="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2"><span class="w-2 h-2 bg-blue-500 rounded-full inline-block"></span>Secondary Links</h2>
		{/if}
		<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
			<AdminCard id="customer-service" title="Customer Service" description="Customer service management and support tools." hidden={!visible('Customer Service', 'Customer service management and support tools.', 'PAGE')} badge="PAGE" badgeColor="text-green-600" badgeBg="bg-green-50" linkHref="/customerService" linkLabel="Open Customer Service →" icon={iconSupport} iconBg="bg-green-100" {expandedCard} onToggle={toggleCard}></AdminCard>

			<AdminCard id="fin-models" title="Fin Models" description="Internal financial modeling — DD comparison, profit calculator, driver perspective." hidden={!visible('Fin Models', 'Internal financial modeling — DD comparison, profit calculator, driver perspective.', 'PAGE')} badge="PAGE" badgeColor="text-indigo-600" badgeBg="bg-indigo-50" linkHref="/Model-Internal" linkLabel="Open Internal Model →" icon={iconMoney} iconBg="bg-indigo-100" {expandedCard} onToggle={toggleCard}>
				<div class="space-y-2">
					<a href="/Model-Internal" target="_blank" rel="noopener noreferrer" class="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-50 text-sm text-gray-700"><span class="text-base">📊</span> Internal Model (DD vs U-DO)</a>
					<a href="/Model-driver/" target="_blank" rel="noopener noreferrer" class="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-50 text-sm text-gray-700"><span class="text-base">🚗</span> Driver Model</a>
					<a href="/Model-RO/" target="_blank" rel="noopener noreferrer" class="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-50 text-sm text-gray-700"><span class="text-base">🏪</span> Restaurant Owner Model</a>
				</div>
			</AdminCard>

			<AdminCard id="push" title="Push Notifications" description="Send push notifications to iOS users." hidden={!visible('Push Notifications', 'Send push notifications to iOS users.')} icon={iconBell} iconBg="bg-red-100" {expandedCard} onToggle={toggleCard}>
				<div class="space-y-3" onclick={(e) => e.stopPropagation()}>
					<div>
						<label class="block text-xs font-semibold text-gray-600 mb-1">Title</label>
						<input type="text" value={pushTitle} oninput={(e) => (pushTitle = (e.currentTarget as HTMLInputElement).value)} placeholder="e.g. New feature available!" class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" />
					</div>
					<div>
						<label class="block text-xs font-semibold text-gray-600 mb-1">Message</label>
						<textarea value={pushMessage} oninput={(e) => (pushMessage = (e.currentTarget as HTMLTextAreaElement).value)} rows={3} placeholder="Type the notification message…" class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 resize-none"></textarea>
					</div>
					<button onclick={sendPushNotification} class="w-full bg-orange-500 hover:bg-orange-600 text-white font-semibold text-sm py-2.5 px-4 rounded-lg transition flex items-center justify-center gap-2">
						<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
						Send Push Notification
					</button>
					{#if pushStatus}
						<div class={`p-3 rounded-lg text-sm ${statusColorClass(pushStatus.type)}`}>{pushStatus.text}</div>
					{/if}
					<div class="pt-3 border-t border-gray-100 space-y-2">
						<p class="text-[10px] uppercase tracking-wider text-gray-400 font-bold mb-2">API Endpoint</p>
						<EndpointRow method="POST" path="/admin/test-send-push-notification" label="Needs body" onTry={tryEndpoint} />
					</div>
				</div>
			</AdminCard>

			<AdminCard id="search-api" title="Search Overlay API" description="CRUD + toggle for search overlay items." hidden={!visible('Search Overlay API', 'CRUD + toggle for search overlay items.')} icon={iconSearch} iconBg="bg-purple-100" {expandedCard} onToggle={toggleCard}>
				<div class="space-y-2">
					<EndpointRow method="GET" path="/admin/search-overlay-items" tryable onTry={(m, p) => tryEndpoint(m, p, '/admin/search-overlay-items-GET-card2')} />
					<ResponseBox box={rb('/admin/search-overlay-items', 'GET')} />
					<EndpointRow method="GET" path="/search-overlay-items" label="(public)" tryable onTry={(m, p) => tryEndpoint(m, p, '/search-overlay-items-GET')} />
					<ResponseBox box={rb('/search-overlay-items', 'GET')} />
					<EndpointRow method="PATCH" path={'/admin/search-overlay-items/{id}/toggle'} label="Needs body" onTry={tryEndpoint} />
				</div>
			</AdminCard>

			<AdminCard id="profile-images" title="Profile Images" description="Update provider profile images." hidden={!visible('Profile Images', 'Update provider profile images.')} icon={iconPhoto} iconBg="bg-indigo-100" {expandedCard} onToggle={toggleCard}>
				<div class="space-y-2">
					<EndpointRow method="PUT" path={'/admin/users/{id}/profile-image'} label="Needs body + ID" onTry={tryEndpoint} />
				</div>
			</AdminCard>

			<AdminCard id="early-access" title="Early Access Signups" description="View all teaser signups from the /t landing page." hidden={!visible('Early Access Signups', 'View all teaser signups from the /t landing page.', 'PAGE')} badge="PAGE" badgeColor="text-orange-600" badgeBg="bg-orange-50" linkTo="/admin/early-access/" linkLabel="Open Signups Page →" icon={iconMail} iconBg="bg-orange-100" {expandedCard} onToggle={toggleCard}>
				<div class="space-y-2">
					<EndpointRow method="GET" path="/early-access" label="(signups)" tryable onTry={(m, p) => tryEndpoint(m, p, '/early-access-GET')} />
					<ResponseBox box={rb('/early-access', 'GET')} />
					<EndpointRow method="POST" path="/early-access" label="Needs body" onTry={tryEndpoint} />
				</div>
			</AdminCard>

			<AdminCard id="search-overlay" title="Search Overlay Items" description="Toggle search suggestions on/off. Manage recent, popular & trending items." hidden={!visible('Search Overlay Items', 'Toggle search suggestions on/off. Manage recent, popular & trending items.', 'LIVE')} badge="LIVE" badgeColor="text-purple-600" badgeBg="bg-purple-50" linkTo="/searchOverlayAdmin/" linkLabel="Open Admin Page →" icon={iconSearch} iconBg="bg-purple-100" {expandedCard} onToggle={toggleCard}>
				<div class="space-y-2">
					<EndpointRow method="GET" path="/admin/search-overlay-items" tryable onTry={(m, p) => tryEndpoint(m, p, '/admin/search-overlay-items-GET')} />
					<ResponseBox box={rb('/admin/search-overlay-items', 'GET')} />
					<EndpointRow method="PATCH" path={'/admin/search-overlay-items/{id}/toggle'} label="Needs body" onTry={tryEndpoint} />
				</div>
			</AdminCard>

			<AdminCard id="app-version" title="Min App Version" description="Force users to update when their app version is below the minimum." hidden={!visible('Min App Version', 'Force users to update when their app version is below the minimum.')} icon={iconVersion} iconBg="bg-cyan-100" {expandedCard} onToggle={toggleCard}>
				<div class="space-y-3" onclick={(e) => e.stopPropagation()}>
					<div>
						<label class="block text-xs font-semibold text-gray-600 mb-1">iClient Min Version</label>
						<input type="text" value={icMinVersion} oninput={(e) => (icMinVersion = (e.currentTarget as HTMLInputElement).value)} placeholder="e.g. 1.2.0" class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" />
					</div>
					<div>
						<label class="block text-xs font-semibold text-gray-600 mb-1">iPro Min Version</label>
						<input type="text" value={ipMinVersion} oninput={(e) => (ipMinVersion = (e.currentTarget as HTMLInputElement).value)} placeholder="e.g. 1.0.0" class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" />
					</div>
					<div>
						<label class="block text-xs font-semibold text-gray-600 mb-1">AClient Min Version</label>
						<input type="text" value={acMinVersion} oninput={(e) => (acMinVersion = (e.currentTarget as HTMLInputElement).value)} placeholder="e.g. 1.0.0" class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" />
					</div>
					<div>
						<label class="block text-xs font-semibold text-gray-600 mb-1">APro Min Version</label>
						<input type="text" value={apMinVersion} oninput={(e) => (apMinVersion = (e.currentTarget as HTMLInputElement).value)} placeholder="e.g. 1.0.0" class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" />
					</div>
					<button onclick={saveAppVersion} class="w-full bg-cyan-600 hover:bg-cyan-700 text-white font-semibold text-sm py-2.5 px-4 rounded-lg transition flex items-center justify-center gap-2">
						<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" /></svg>
						Save Versions
					</button>
					{#if versionStatus}
						<div class={`p-3 rounded-lg text-sm ${statusColorClass(versionStatus.type)}`}>{versionStatus.text}</div>
					{/if}
					<div class="pt-3 border-t border-gray-100 space-y-2">
						<p class="text-[10px] uppercase tracking-wider text-gray-400 font-bold mb-2">API Endpoints</p>
						<EndpointRow method="GET" path="/app-version" label="(public)" tryable onTry={(m, p) => tryEndpoint(m, p, '/app-version-GET')} />
						<ResponseBox box={rb('/app-version', 'GET')} />
						<EndpointRow method="PUT" path="/admin/app-version" label="Needs body" onTry={tryEndpoint} />
					</div>
				</div>
			</AdminCard>
		</div>

		{#if !hasAnyMatch && searchQuery.trim()}
			<div class="text-center py-12">
				<svg class="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
				<h3 class="text-lg font-semibold text-gray-500 mb-1">No results found</h3>
				<p class="text-sm text-gray-400">No admin tools match "<span class="text-gray-600 font-medium">{searchQuery}</span>". Try a different search term.</p>
				<button onclick={() => (searchQuery = '')} class="mt-3 text-sm text-orange-600 hover:text-orange-700 font-medium">Clear search</button>
			</div>
		{/if}

		{#if showQuickLinks}
			<h2 class="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2"><span class="w-2 h-2 bg-green-500 rounded-full inline-block"></span>Quick Links</h2>
		{/if}
		{#if showQuickLinks}
			<div class="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3 mb-8">
				{#each [{ to: '/dashboard/', emoji: '📊', label: 'Dashboard' }, { to: '/', emoji: '🏠', label: 'Home Page' }, { to: '/login/', emoji: '🔐', label: 'Login' }, { to: '/signup/', emoji: '📝', label: 'Signup' }, { to: '/profiles-list/', emoji: '👥', label: 'Profiles' }, { to: '/food-delivery/', emoji: '🍔', label: 'Food Delivery' }] as link}
					{#if visible(link.label)}
						<a href={link.to} class="bg-white border border-gray-200 rounded-lg p-3 text-center hover:border-orange-400 transition">
							<div class="text-2xl mb-1">{link.emoji}</div>
							<div class="text-xs font-medium text-gray-700">{link.label}</div>
						</a>
					{/if}
				{/each}
			</div>
		{/if}

		<div class="text-center text-xs text-gray-400 py-6 border-t border-gray-100">
			UDO Admin Dashboard · Backend API at <code class="bg-gray-100 px-1 rounded">localhost:3030</code>
		</div>
	</main>
</div>
