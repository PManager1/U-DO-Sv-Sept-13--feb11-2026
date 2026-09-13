<script lang="ts">
	import { onMount } from 'svelte';
	import API_BASE from '$lib/api';

	let brands = $state<any[]>([]);
	let loading = $state(true);
	let loadingMore = $state(false);
	let hasMore = $state(true);
	let page = $state(1);
	let searchQuery = $state('');
	let activeTypes = $state(new Set<string>());
	let sortBy = $state<string | null>(null);
	let typeCounts = $state<Record<string, number>>({});
	let status = $state<{ type: string; text: string } | null>(null);
	let showCreateModal = $state(false);

	let hydrated = false;
	let lastSavedSnapshot = '';

	function snapshot() {
		return JSON.stringify({ s: sortBy, t: [...activeTypes].sort() });
	}

	$effect(() => {
		const s = sortBy;
		const t = activeTypes;
		const snap = snapshot();
		if (!hydrated || snap === lastSavedSnapshot) return;
		lastSavedSnapshot = snap;
		fetch(API_BASE + 'admin/personalize', {
			method: 'PUT',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ adminBrands: { sortBy: s, activeTypes: [...t].sort() } })
		}).catch(() => {});
	});

	$effect(() => {
		if (!showCreateModal) return;
		const onKey = (e: KeyboardEvent) => {
			if (e.key === 'Escape') resetCreateForm();
		};
		window.addEventListener('keydown', onKey);
		return () => window.removeEventListener('keydown', onKey);
	});
	let brokenLogos = $state(new Set<string>());
	let togglingOnline = $state(new Set<string>());
	let togglingBot = $state(new Set<string>());
	let brandsWithMenuOnline = $state(new Set<string>());
	let editingAutomation = $state<string | null>(null);

	let newBrand = $state({
		name: '',
		brandType: 'restaurant',
		logoUrl: '',
		description: '',
		notes: '',
		tags: [] as string[],
		tagsString: '',
		companyLink: ''
	});
	let formLogoFile: File | null = $state(null);
	let formLogoPreview: string | null = $state(null);
	let uploading = $state(false);
	let creating = $state(false);

	const brandTypes = [
		{
			key: 'restaurant',
			label: '🍕 Restaurant',
			activeColor: 'bg-orange-600 text-white border-orange-600'
		},
		{
			key: 'grocery',
			label: '🛒 Grocery',
			activeColor: 'bg-green-600 text-white border-green-600'
		},
		{
			key: 'convenience',
			label: '🏪 Convenience',
			activeColor: 'bg-blue-600 text-white border-blue-600'
		},
		{
			key: 'pharmacy',
			label: '💊 Pharmacy',
			activeColor: 'bg-purple-600 text-white border-purple-600'
		},
		{
			key: 'retail',
			label: '🏬 Retail',
			activeColor: 'bg-yellow-600 text-white border-yellow-600'
		},
		{
			key: 'localBusiness',
			label: '🏪 Local Business',
			activeColor: 'bg-teal-600 text-white border-teal-600'
		}
	];

	const typeLabels: Record<string, string> = {
		restaurant: 'Restaurant',
		grocery: 'Grocery',
		convenience: 'Convenience',
		pharmacy: 'Pharmacy',
		retail: 'Retail',
		localBusiness: 'Local Business'
	};

	const typeBadgeColors: Record<string, string> = {
		restaurant: 'bg-orange-100 text-orange-700',
		grocery: 'bg-green-100 text-green-700',
		convenience: 'bg-blue-100 text-blue-700',
		pharmacy: 'bg-purple-100 text-purple-700',
		localBusiness: 'bg-teal-100 text-teal-700',
		retail: 'bg-yellow-100 text-yellow-700'
	};

	function id(b: any) {
		return b.id || b._id;
	}

	function buildParams(pg: number) {
		const params = new URLSearchParams();
		params.set('page', String(pg));
		params.set('limit', '16');
		if (searchQuery) params.set('search', searchQuery);
		if (sortBy) params.set('sortBy', sortBy);
		if (activeTypes.size > 0) params.set('type', [...activeTypes].join(','));
		return params;
	}

	async function checkMenuOnline(brandId: string) {
		try {
			const res = await fetch(API_BASE + `brands/${brandId}/menuOnline`);
			if (!res.ok) return false;
			const data = await res.json();
			return data.menu?.length > 0;
		} catch {
			return false;
		}
	}

	async function checkAllMenuOnline(list: any[]) {
		const results = await Promise.all(
			list.map((b) => checkMenuOnline(id(b)).then((ok) => (ok ? id(b) : null)))
		);
		brandsWithMenuOnline = new Set([...brandsWithMenuOnline, ...results.filter(Boolean)]);
	}

	async function fetchBrands() {
		loading = true;
		try {
			const res = await fetch(API_BASE + 'admin/brands?' + buildParams(1).toString());
			const data = await res.json();
			const list = Array.isArray(data.brands) ? data.brands : [];
			brands = list;
			typeCounts = data.typeCounts || {};
			hasMore = 1 < (data.totalPages || 1);
			page = 1;
			brandsWithMenuOnline = new Set();
			checkAllMenuOnline(list);
		} catch (err) {
			console.error('Failed to fetch brands:', err);
		} finally {
			loading = false;
		}
	}

	async function loadMore() {
		if (loadingMore || !hasMore) return;
		loadingMore = true;
		const nextPage = page + 1;
		try {
			const res = await fetch(API_BASE + 'admin/brands?' + buildParams(nextPage).toString());
			const data = await res.json();
			const list = Array.isArray(data.brands) ? data.brands : [];
			brands = [...brands, ...list];
			typeCounts = data.typeCounts || {};
			hasMore = nextPage < (data.totalPages || 1);
			page = nextPage;
			checkAllMenuOnline(list);
		} catch (err) {
			console.error('Failed to load more:', err);
		} finally {
			loadingMore = false;
		}
	}

	function toggleType(key: string) {
		const next = new Set(activeTypes);
		if (next.has(key)) next.delete(key);
		else next.add(key);
		activeTypes = next;
		fetchBrands();
	}

	async function toggleOnlineOrders(brand: any) {
		const brandId = id(brand);
		const newValue = !brand.acceptOnlineOrders;
		togglingOnline = new Set([...togglingOnline, brandId]);
		try {
			const res = await fetch(API_BASE + `admin/brands/${brandId}`, {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ acceptOnlineOrders: newValue })
			});
			if (res.ok) {
				brands = brands.map((b) =>
					id(b) === brandId ? { ...b, acceptOnlineOrders: newValue } : b
				);
			}
		} catch (err) {
			console.error('Failed to toggle online orders:', err);
		} finally {
			const next = new Set(togglingOnline);
			next.delete(brandId);
			togglingOnline = next;
		}
	}

	async function toggleBotOrdering(brand: any) {
		const brandId = id(brand);
		const newValue = !brand.botOrdering;
		togglingBot = new Set([...togglingBot, brandId]);
		try {
			const res = await fetch(API_BASE + `admin/brands/${brandId}`, {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ botOrdering: newValue })
			});
			if (res.ok) {
				brands = brands.map((b) => (id(b) === brandId ? { ...b, botOrdering: newValue } : b));
			}
		} catch (err) {
			console.error('Failed to toggle bot ordering:', err);
		} finally {
			const next = new Set(togglingBot);
			next.delete(brandId);
			togglingBot = next;
		}
	}

	async function updateAutomationStatus(brandId: string, s: string, notes: string) {
		try {
			const res = await fetch(API_BASE + `admin/brands/${brandId}/automation-status`, {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ status: s, notes })
			});
			if (res.ok) {
				editingAutomation = null;
				fetchBrands();
			}
		} catch (err) {
			console.error('Failed to update automation status:', err);
		}
	}

	function statusDot(s: string | undefined) {
		const map: Record<string, string> = {
			green: 'bg-green-500',
			yellow: 'bg-yellow-400',
			red: 'bg-red-500'
		};
		return (s && map[s]) || 'bg-gray-300';
	}

	function statusText(s: string | undefined) {
		if (s === 'green') return 'Working';
		if (s === 'yellow') return 'Issues';
		if (s === 'red') return 'BROKEN';
		return 'Not Verified';
	}

	function resetCreateForm() {
		newBrand = {
			name: '',
			brandType: 'restaurant',
			logoUrl: '',
			description: '',
			notes: '',
			tags: [],
			tagsString: '',
			companyLink: ''
		};
		formLogoFile = null;
		formLogoPreview = null;
		showCreateModal = false;
	}

	function onLogoFile(e: Event) {
		const input = e.currentTarget as HTMLInputElement;
		const file = input.files?.[0];
		if (file) {
			formLogoFile = file;
			formLogoPreview = URL.createObjectURL(file);
		}
		input.value = '';
	}

	function onBrandLogoFile(brand: any, e: Event) {
		const input = e.currentTarget as HTMLInputElement;
		const file = input.files?.[0];
		if (file) handleLogoUpload(brand, file);
		input.value = '';
	}

	async function handleLogoUpload(brand: any, file: File) {
		const brandId = id(brand);
		uploading = true;
		status = { type: 'info', text: '⏳ Uploading logo...' };
		try {
			const formData = new FormData();
			formData.append('image', file);
			const res = await fetch(API_BASE + `admin/brands/${brandId}/logo`, {
				method: 'POST',
				body: formData
			});
			const data = await res.json();
			if (res.ok) {
				status = { type: 'success', text: '🖼️ Logo uploaded!' };
				fetchBrands();
			} else {
				status = { type: 'error', text: `Upload failed: ${data.message || 'Unknown error'}` };
			}
		} catch (err: any) {
			status = { type: 'error', text: `Upload error: ${err.message}` };
		} finally {
			uploading = false;
		}
	}

	async function createBrand(e: SubmitEvent) {
		e.preventDefault();
		if (creating) return;
		creating = true;
		try {
			const res = await fetch(API_BASE + 'admin/brands', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(newBrand)
			});
			if (res.ok) {
				const data = await res.json();
				const brandId = data.id || data._id;
				if (formLogoFile && brandId) {
					uploading = true;
					status = { type: 'info', text: '⏳ Uploading logo...' };
					const formData = new FormData();
					formData.append('image', formLogoFile);
					const logoRes = await fetch(API_BASE + `admin/brands/${brandId}/logo`, {
						method: 'POST',
						body: formData
					});
					status = logoRes.ok
						? { type: 'success', text: `✅ Created "${newBrand.name}" with logo!` }
						: { type: 'success', text: `✅ Created "${newBrand.name}" but logo upload failed.` };
					uploading = false;
				} else {
					status = { type: 'success', text: `✅ Created "${newBrand.name}" successfully!` };
				}
				resetCreateForm();
				fetchBrands();
			} else {
				const data = await res.json();
				status = {
					type: 'error',
					text: `⚠️ ${data.message || data.error || 'Failed to create brand'}`
				};
			}
		} catch (err: any) {
			status = { type: 'error', text: `❌ Network error: ${err.message}` };
		} finally {
			creating = false;
		}
	}

	function setTagsString(val: string) {
		newBrand = {
			...newBrand,
			tagsString: val,
			tags: val
				.split(',')
				.map((s) => s.trim().toLowerCase().replace(/\s+/g, '_'))
				.filter(Boolean)
		};
	}

	function onSentinel(node: HTMLElement) {
		const observer = new IntersectionObserver(
			(entries) => {
				if (entries[0].isIntersecting && hasMore && !loading && !loadingMore) {
					loadMore();
				}
			},
			{ threshold: 0.1 }
		);
		observer.observe(node);
		return {
			destroy() {
				observer.disconnect();
			}
		};
	}

	onMount(async () => {
		try {
			const res = await fetch(API_BASE + 'admin/personalize');
			if (res.ok) {
				const data = await res.json();
				const prefs = data.adminBrands || {};
				if (prefs.sortBy) sortBy = prefs.sortBy;
				if (Array.isArray(prefs.activeTypes) && prefs.activeTypes.length)
					activeTypes = new Set(prefs.activeTypes);
			}
		} catch (e) {
			console.error('Failed to load personalize:', e);
		}
		lastSavedSnapshot = snapshot();
		hydrated = true;
		fetchBrands();
	});
</script>

<svelte:head><title>Admin · Brands</title></svelte:head>

<div class="min-h-screen bg-gray-50">
	<header class="border-b border-gray-200 bg-white">
		<div class="mx-auto max-w-5xl px-6 py-5">
			<a href="/admin/" class="text-sm font-medium text-orange-500 hover:text-orange-600"
				>← Back to Admin Dashboard</a
			>
			<div class="mt-3 flex items-center justify-between">
				<div>
					<h1 class="text-2xl font-bold text-gray-900">Brands</h1>
					<p class="text-sm text-gray-500">
						Manage enterprise brands — Pizza Hut, Safeway, Taco Bell, etc.
					</p>
				</div>
				<div class="flex items-center gap-3">

					<a
						href="/admin/globalimagesync"
						class="rounded-lg bg-emerald-500 px-4 py-2 text-sm font-medium text-white hover:bg-amber-600"
						>Global Image Sync</a
					>

					<a
						href="/admin/globalgrocerytagmgmt"
						class="rounded-lg bg-amber-500 px-4 py-2 text-sm font-medium text-white hover:bg-amber-600"
						>Global Grocery Tags</a
					>
					<a
						href="/admin/services-control"
						class="rounded-lg bg-cyan-600 px-4 py-2 text-sm font-medium text-white hover:bg-cyan-700"
						>Services</a
					>
					<a
						href="/admin/activate-brands"
						class="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
						>ActivateBrands</a
					>
					<button
						onclick={() => {
							newBrand = { ...newBrand, brandType: 'restaurant' };
							showCreateModal = true;
						}}
						class="rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-700"
						>+ Add Brand</button
					>
				</div>
			</div>
		</div>
	</header>

	<main class="mx-auto max-w-5xl px-6 py-6">
		<!-- Brand Type Toggles -->
		<div class="mb-4 flex flex-wrap gap-2">
			{#each brandTypes as bt}
				<button
					onclick={() => toggleType(bt.key)}
					class={`rounded-lg border-2 px-4 py-2 text-sm font-medium transition-all ${activeTypes.has(bt.key) ? bt.activeColor + ' shadow-sm' : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:bg-gray-50'}`}
				>
					{bt.label}
					{typeCounts[bt.key] !== undefined ? `(${typeCounts[bt.key]})` : ''}
				</button>
			{/each}
			{#if activeTypes.size > 0}
				<button
					onclick={() => {
						activeTypes = new Set();
						fetchBrands();
					}}
					class="rounded-lg px-3 py-2 text-xs font-medium text-gray-400 transition hover:bg-gray-100 hover:text-gray-600"
					>✕ Clear</button
				>
			{/if}
			<div class="ml-auto flex items-center gap-1">
				{#each [{ key: 'newest', label: 'Newest' }, { key: 'oldest', label: 'Oldest' }, { key: 'recentlyModified', label: 'Recent' }] as opt}
					<button
						onclick={() => {
							sortBy = opt.key;
							fetchBrands();
						}}
						class={`rounded-lg px-3 py-2 text-xs font-medium transition ${sortBy === opt.key ? 'bg-violet-100 text-violet-700' : 'text-gray-500 hover:bg-violet-50 hover:text-violet-600'}`}
						>{opt.label}</button
					>
				{/each}
				<button
					onclick={() => {
						sortBy = null;
						activeTypes = new Set();
						fetchBrands();
					}}
					class="ml-2 rounded-lg px-3 py-2 text-xs font-medium text-red-400 transition hover:bg-red-50 hover:text-red-600"
					>Reset</button
				>
			</div>
		</div>

		<!-- Search -->
		<div class="relative mb-4">
			<input
				type="text"
				placeholder="Search brands..."
				bind:value={searchQuery}
				oninput={() => {
					clearTimeout((window as any).__brandsSearchTimer);
					(window as any).__brandsSearchTimer = setTimeout(() => fetchBrands(), 350);
				}}
				class="w-full rounded-lg border border-gray-300 px-3 py-2 pr-8 text-sm focus:ring-2 focus:ring-violet-400 focus:outline-none"
			/>
			{#if searchQuery}
				<button
					onclick={() => {
						searchQuery = '';
						fetchBrands();
					}}
					class="absolute top-1/2 right-2 z-10 flex h-5 w-5 -translate-y-1/2 items-center justify-center rounded-full bg-white text-lg leading-none text-gray-400 hover:text-gray-600"
					>✕</button
				>
			{/if}
		</div>

		<!-- Status -->
		{#if status}
			<div
				class={`mb-4 rounded-lg p-3 text-sm ${status.type === 'success' ? 'bg-green-50 text-green-700' : status.type === 'error' ? 'bg-red-50 text-red-700' : 'bg-blue-50 text-blue-700'}`}
			>
				<div class="flex items-center justify-between">
					<span>{status.text}</span>
					<button
						onclick={() => (status = null)}
						class="ml-2 text-current opacity-50 hover:opacity-100">✕</button
					>
				</div>
			</div>
		{/if}

		<!-- Brand List -->
		{#if loading}
			<div class="py-12 text-center text-gray-400">Loading brands...</div>
		{:else if brands.length === 0}
			<div class="py-12 text-center text-gray-400">No brands found. Create your first brand!</div>
		{:else}
			<div class="space-y-3">
				{#each brands as brand (id(brand))}
					<div
						class="rounded-xl border border-gray-200 bg-white p-5 transition-shadow hover:shadow-md"
					>
						<div class="flex flex-wrap items-center justify-between gap-4">
							<div class="flex items-center gap-4">
								<!-- Logo -->
								<label
									class="group relative inline-flex h-12 w-12 flex-shrink-0 cursor-pointer overflow-hidden rounded-lg border border-gray-100"
								>
									{#if (brand.logo_url || brand.logoUrl) && !brokenLogos.has(id(brand))}
										
										<img
												src={brand.logo_url || brand.logoUrl}
												alt={brand.name}
												class="h-full w-full object-cover"
												onerror={() => (brokenLogos = new Set([...brokenLogos, id(brand)]))}
											/>
										<div
											class="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition group-hover:opacity-100"
										>
											<span class="text-[10px] font-semibold text-white">Change</span>
										</div>
									{:else}
										<div
											class="flex h-full w-full items-center justify-center bg-violet-100 text-xl font-bold text-violet-600 transition group-hover:bg-violet-200"
										>
											<span>{brand.name?.charAt(0)}</span>
										</div>
									{/if}
									<input
										type="file"
										accept="image/*"
										class="hidden"
										onchange={(e) => onBrandLogoFile(brand, e)}
									/>
								</label>

								<div>
									<div class="flex flex-wrap items-center gap-2">
										<a href={`/admin/brands/${id(brand)}`}>
											<h3
												class="flex cursor-pointer items-center gap-1 font-semibold text-gray-900 hover:text-violet-600"
											>
												{brand.name}
												{#if brandsWithMenuOnline.has(id(brand))}<span>✅</span>{/if}
											</h3>
										</a>
										<span
											class={`rounded-full px-2 py-0.5 text-xs font-medium ${typeBadgeColors[brand.brandType] || 'bg-gray-100 text-gray-700'}`}
										>
											{typeLabels[brand.brandType] || brand.brandType}
										</span>
										<span
											class={`rounded-full px-2 py-0.5 text-xs font-medium ${brand.isActive ? 'bg-emerald-50 text-emerald-600' : 'bg-gray-100 text-gray-500'}`}
										>
											{brand.isActive ? 'Active' : 'Inactive'}
										</span>
										<button
											onclick={() => toggleOnlineOrders(brand)}
											class={`cursor-pointer rounded-full px-2 py-0.5 text-xs font-medium transition-all select-none ${togglingOnline.has(id(brand)) ? 'pointer-events-none opacity-50' : 'hover:ring-2 hover:ring-offset-1'} ${brand.acceptOnlineOrders ? 'bg-sky-100 text-sky-700 hover:ring-sky-400' : 'bg-gray-100 text-gray-500 hover:ring-gray-400'}`}
										>
											{brand.acceptOnlineOrders
												? 'OnlineOrders ● Active'
												: 'OnlineOrders ○ Inactive'}
										</button>
										<button
											onclick={() => toggleBotOrdering(brand)}
											class={`cursor-pointer rounded-full px-2 py-0.5 text-xs font-medium transition-all select-none ${togglingBot.has(id(brand)) ? 'pointer-events-none opacity-50' : 'hover:ring-2 hover:ring-offset-1'} ${brand.botOrdering ? 'bg-yellow-100 text-yellow-700 hover:ring-yellow-400' : 'bg-gray-100 text-gray-500 hover:ring-gray-400'}`}
										>
											Bot Ordering: {brand.botOrdering ? 'Yes' : 'No'}
										</button>
									</div>
								</div>
							</div>

							<!-- Automation -->
							<div
								class="flex cursor-pointer items-center gap-2"
								onclick={() => (editingAutomation = id(brand))}
							>
								<span
									class={`inline-block h-3 w-3 rounded-full ${statusDot(brand.automationStatus)}`}
								></span>
								<div class="text-right">
									<div class="text-xs font-medium text-gray-700">
										{statusText(brand.automationStatus)}
									</div>
									{#if brand.automationNotes}
										<div class="max-w-48 truncate text-xs text-gray-400">
											{brand.automationNotes}
										</div>
									{/if}
								</div>
							</div>
						</div>

						<!-- Actions -->
						<div class="mt-3 flex flex-wrap gap-2 border-t border-gray-100 pt-3">
							<a
								href={`/admin/brands/${id(brand)}`}
								class="rounded-lg bg-violet-50 px-3 py-1.5 text-xs font-medium text-violet-700 hover:bg-violet-100"
								>View Details →</a
							>
							<a
								href={`/admin/brands/${id(brand)}?tab=locations`}
								class="rounded-lg bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-700 hover:bg-blue-100"
								>📍 {brand.locationCount ?? 0} Locations</a
							>
							<a
								href={`https://www.google.com/search?tbm=isch&q=${encodeURIComponent(brand.name)}`}
								target="_blank"
								rel="noopener noreferrer"
								class="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-gray-200 bg-white text-xs font-bold text-gray-500 hover:bg-gray-100"
								title="Search Google Images">G</a
							>
							{#if brand.brandType === 'restaurant'}
								<a
									href={`/admin/brands/${id(brand)}?tab=menu`}
									class="rounded-lg bg-orange-50 px-3 py-1.5 text-xs font-medium text-orange-700 hover:bg-orange-100"
									>🍕 Menu</a
								>
							{/if}
							{#if brand.brandType === 'grocery'}
								<a
									href={`/admin/brands/${id(brand)}?tab=catalog`}
									class="rounded-lg bg-green-50 px-3 py-1.5 text-xs font-medium text-green-700 hover:bg-green-100"
									>🛒 Catalog</a
								>
								<a
									href={`/admin/GU/${id(brand)}`}
									class="rounded-lg bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-700 hover:bg-emerald-100"
									>🛒 Store Aisles</a
								>
							{/if}
						</div>

						<!-- Automation Editor -->
						{#if editingAutomation === id(brand)}
							<div class="mt-3 rounded-lg border-t border-gray-100 bg-gray-50 p-3 pt-3">
								<p class="mb-2 text-xs font-medium text-gray-700">Update Automation Status</p>
								<div class="flex flex-wrap items-center gap-2">
									{#each ['green', 'yellow', 'red'] as s}
										<button
											onclick={() =>
												updateAutomationStatus(id(brand), s, brand.automationNotes || '')}
											class={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium ${brand.automationStatus === s ? 'border-gray-400 bg-white shadow-sm' : 'border-gray-200 bg-white hover:bg-gray-50'}`}
										>
											<span class={`inline-block h-3 w-3 rounded-full ${statusDot(s)}`}></span>
											{s.charAt(0).toUpperCase() + s.slice(1)}
										</button>
									{/each}
									<button
										onclick={() => (editingAutomation = null)}
										class="ml-auto text-xs text-gray-400 hover:text-gray-600">Cancel</button
									>
								</div>
								{#if brand.automationNotes}
									<p class="mt-2 text-xs text-gray-500">📝 {brand.automationNotes}</p>
								{/if}
							</div>
						{/if}
					</div>
				{/each}
				{#if loadingMore}
					<div class="py-4 text-center text-sm text-gray-400">Loading more brands...</div>
				{/if}
			</div>
		{/if}
		<div use:onSentinel class="h-1"></div>

		<!-- Create Brand Modal -->
		{#if showCreateModal}
			<div
				class="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
				onclick={resetCreateForm}
			>
				<div
					class="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl"
					onclick={(e) => e.stopPropagation()}
				>
					<div class="mb-4 flex items-center justify-between">
						<h2 class="text-lg font-bold text-gray-900">Create Brand</h2>
						<button
							type="button"
							onclick={resetCreateForm}
							class="text-gray-400 transition-colors hover:text-gray-700">✕</button
						>
					</div>
					<form onsubmit={createBrand} class="space-y-3">
						<div>
							<label class="text-xs font-medium text-gray-600">Brand Name *</label>
							<input
								type="text"
								required
								bind:value={newBrand.name}
								class="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
								placeholder="e.g. Pizza Hut"
							/>
						</div>
						<div>
							<label class="text-xs font-medium text-gray-600">Brand Type *</label>
							<select
								bind:value={newBrand.brandType}
								class="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
							>
								<option value="restaurant">Restaurant (Pizza Hut, Taco Bell)</option>
								<option value="grocery">Grocery (Safeway, Whole Foods)</option>
								<option value="convenience">Convenience (7-Eleven)</option>
								<option value="pharmacy">Pharmacy (CVS, Walgreens)</option>
								<option value="localBusiness">Local Business</option>
								<option value="retail">Retail</option>
							</select>
						</div>
						<div>
							<label class="mb-1 block text-xs font-semibold text-gray-600">Brand Logo</label>
							<div class="flex items-start gap-4">
								<label
									class="group relative flex h-24 w-24 flex-shrink-0 cursor-pointer flex-col items-center justify-center overflow-hidden rounded-xl border-2 border-dashed border-gray-300 transition hover:border-violet-400"
								>
									{#if formLogoPreview}
										<img
											src={formLogoPreview}
											alt="Preview"
											class="absolute inset-0 h-full w-full object-cover"
										/>
									{:else}
										<span class="text-[10px] font-medium text-gray-500">Upload</span>
									{/if}
									<input type="file" accept="image/*" class="hidden" onchange={onLogoFile} />
								</label>
								<div class="flex-1 space-y-2">
									<p class="text-xs text-gray-500">Upload an image or paste a URL below.</p>
									<input
										type="text"
										value={newBrand.logoUrl}
										oninput={(e) => {
											const v = (e.currentTarget as HTMLInputElement).value;
											newBrand = { ...newBrand, logoUrl: v };
											if (v && !formLogoFile) formLogoPreview = v;
										}}
										placeholder="https://... (paste logo URL)"
										class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-violet-400 focus:outline-none"
									/>
									{#if formLogoFile}
										<button
											type="button"
											onclick={() => {
												formLogoFile = null;
												formLogoPreview = newBrand.logoUrl || null;
											}}
											class="text-xs text-red-500 hover:text-red-700">Remove uploaded file</button
										>
									{/if}
								</div>
							</div>
						</div>
						<div>
							<label class="text-xs font-medium text-gray-600">Company Link</label>
							<input
								type="text"
								bind:value={newBrand.companyLink}
								class="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
								placeholder="https://www.company.com"
							/>
						</div>
						<div>
							<label class="text-xs font-medium text-gray-600">Description</label>
							<textarea
								bind:value={newBrand.description}
								rows={2}
								class="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
								placeholder="World-famous pizza..."></textarea>
						</div>
						<div>
							<label class="text-xs font-medium text-gray-600">Tags</label>
							<input
								type="text"
								value={newBrand.tagsString}
								oninput={(e) => setTagsString((e.currentTarget as HTMLInputElement).value)}
								class="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
								placeholder="e.g. pizza, italian, fast-food"
							/>
						</div>
						<div>
							<label class="text-xs font-medium text-gray-600">Notes</label>
							<textarea
								bind:value={newBrand.notes}
								rows={3}
								class="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
								placeholder="Internal notes about this brand..."></textarea>
						</div>
						<div class="flex gap-2 pt-2">
							<button
								type="submit"
								disabled={creating || uploading}
								class="flex-1 rounded-lg bg-violet-600 py-2 text-sm font-medium text-white hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-50"
							>
								{creating ? 'Creating...' : uploading ? '⏳ Uploading...' : 'Create Brand'}
							</button>
							<button
								type="button"
								onclick={resetCreateForm}
								class="flex-1 rounded-lg bg-gray-100 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200"
								>Cancel</button
							>
						</div>
					</form>
				</div>
			</div>
		{/if}

		<div class="mt-8 border-t border-gray-100 py-6 text-center text-xs text-gray-400">
			UDO Admin · Brands
		</div>
	</main>
</div>
