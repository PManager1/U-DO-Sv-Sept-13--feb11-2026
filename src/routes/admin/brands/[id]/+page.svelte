<script lang="ts">
	import API_BASE from '$lib/api';
	import TagAutocomplete from '$lib/TagAutocomplete.svelte';
	import ImageUpload from '$lib/ImageUpload.svelte';
	import LocationsTab from '$lib/LocationsTab.svelte';
	import DriverSettings from '$lib/DriverSettings.svelte';
	import MiscTab from '$lib/MiscTab.svelte';
	import MenuOnlineTab from '$lib/MenuOnlineTab.svelte';
	import { page } from '$app/state';

	let id = $derived(page.params.id); // brand id from route param

	let brand = $state<any>(null);
	let loading = $state(true);
	let activeTab = $state('overview');
	let toast = $state<{ type: string; text: string } | null>(null);
	let deleting = $state(false);
	let menuCount = $state<number | null>(null);
	let catalogCount = $state<number | null>(null);
	let menuOnlineExists = $state<boolean | null>(null);

	const tabs = [
		{ key: 'overview', label: 'Overview', icon: '📋' },
		{ key: 'locations', label: 'Locations', icon: '📍', showCount: true },
		{ key: 'menu', label: 'Menu', icon: '🍕', showCount: true },
		{ key: 'menuOnline', label: 'Menu Online', icon: '🌐' },
		{ key: 'catalog', label: 'Catalog', icon: '🛒', showCount: true },
		{ key: 'drivers', label: 'Drivers', icon: '🚚' },
		{ key: 'misc', label: 'Misc', icon: '🔧' }
	];

	function tabLabel(t: any) {
		if (t.key === 'menu' && menuCount != null) return `${menuCount} ${t.label}`;
		if (t.key === 'catalog' && catalogCount != null) return `${catalogCount} ${t.label}`;
		if (t.key === 'menuOnline' && menuOnlineExists != null) return `${t.label} ${menuOnlineExists ? '✅' : ''}`;
		if (t.showCount && brand?.locationCount != null) return `${brand.locationCount} ${t.label}`;
		return t.label;
	}

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

	const _DEBUG_LOCAL = 'http://localhost:3030/api/v1/';
	const _DEBUG_AWS = 'https://tcdlm857gf.execute-api.us-east-1.amazonaws.com/dev/api/v1/';
	const _DEBUG_ENDPOINTS = [
		{ label: 'Brand Info', path: `brands/${id}` },
		{ label: 'Catalog', path: `brands/${id}/catalog` },
		{ label: 'Menu', path: `brands/${id}/menu` },
		{ label: 'Nearest Store', path: `brands/${id}/nearest-store` },
		{ label: 'Locations', path: `brands/${id}/locations` },
		{ label: 'Nearby Locations', path: `brands/${id}/locations/nearby?lat=38.9&lng=-77.0` }
	];

	// ── Overview tab state ──
	let editing = $state(false);
	let saving = $state(false);
	let togglingStatus = $state(false);
	let form = $state<any>({
		name: '',
		brandType: '',
		description: '',
		isActive: true,
		carouselImagesText: '',
		imageTagsText: '{}',
		bannerUrl: '',
		logoUrl: '',
		videoUrl: ''
	});
	let savingTags = $state(false);
	let companyLink = $state('');
	let savingCompanyLink = $state(false);
	let companyLinkSaved = $state(false);
	let searchAliases = $state('');
	let savingSearchAliases = $state(false);
	let searchAliasesSaved = $state(false);
	let cityQuery = $state('');
	let bannerError = $state(false);
	let draggedImageUrl = $state<string | null>(null);
	let bannerDragOver = $state(false);
	let logoError = $state(false);
	let tagsInput = $state('');
	let tl = $state<Record<string, boolean>>({});

	function statusDot(s: string | undefined) {
		const map: Record<string, string> = { green: 'bg-green-500', yellow: 'bg-yellow-400', red: 'bg-red-500' };
		return (s && map[s]) || 'bg-gray-300';
	}
	function statusText(s: string | undefined) {
		if (s === 'green') return 'Working';
		if (s === 'yellow') return 'Issues';
		if (s === 'red') return 'BROKEN';
		return 'Not Verified';
	}

	async function loadBrand() {
		loading = true;
		try {
			fetch(API_BASE + `admin/brands/${id}/open`, { method: 'POST' }).catch(() => {});
			const res = await fetch(API_BASE + `brands/${id}`);
			const b = await res.json();
			brand = b && (b.id || b._id) ? b : null;
			companyLink = brand?.companyLink || '';
			searchAliases = (brand?.searchAliases || []).join(', ');
			tagsInput = (brand?.tags || []).join(', ');
			fetch(API_BASE + `brands/${id}/menu`).then((r) => r.json()).then((d) => (menuCount = d.items?.length ?? 0)).catch(() => (menuCount = 0));
			fetch(API_BASE + `brands/${id}/catalog`).then((r) => r.json()).then((d) => (catalogCount = d.items?.length ?? 0)).catch(() => (catalogCount = 0));
			fetch(API_BASE + `brands/${id}/menuOnline`).then((r) => r.json()).then((d) => (menuOnlineExists = d.menu?.length > 0)).catch(() => (menuOnlineExists = false));
			fetch(API_BASE + `brands/${id}/locations`).then((r) => r.json()).then((data) => {
				const locs = Array.isArray(data) ? data : [];
				if (locs.length > 0) {
					const parts = [locs[0].city, locs[0].state].filter(Boolean);
					if (parts.length > 0) cityQuery = parts.join(' ');
				}
			}).catch(() => {});
		} catch (err) {
			console.error('Failed to load brand:', err);
			brand = null;
		} finally {
			loading = false;
		}
	}

	async function putBrand(body: any) {
		const res = await fetch(API_BASE + `admin/brands/${id}`, {
			method: 'PUT',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(body)
		});
		if (!res.ok) {
			const data = await res.json().catch(() => ({}));
			throw new Error(data.message || data.error || 'Save failed');
		}
		const updated = await res.json();
		brand = updated;
		return updated;
	}

	async function toggleField(field: string) {
		const newVal = !(brand as any)[field];
		tl[field] = true;
		brand = { ...brand, [field]: newVal };
		try {
			await putBrand({ [field]: newVal });
		} catch (err: any) {
			brand = { ...brand, [field]: !newVal };
			alert('Failed to update: ' + err.message);
		} finally {
			tl[field] = false;
		}
	}

	async function toggleBrandStatus() {
		const newActive = !brand.isActive;
		brand = { ...brand, isActive: newActive };
		togglingStatus = true;
		try {
			await putBrand({ isActive: newActive });
		} catch (err: any) {
			brand = { ...brand, isActive: !newActive };
			alert('Failed to update status: ' + err.message);
		} finally {
			togglingStatus = false;
		}
	}

	function startEditing() {
		form = {
			name: brand.name || '',
			brandType: brand.brandType || 'restaurant',
			description: brand.description || '',
			isActive: brand.isActive,
			carouselImagesText: (brand.carouselImages || []).join('\n'),
			imageTagsText: JSON.stringify(brand.imageTags || {}, null, 2),
			bannerUrl: brand.bannerUrl || '',
			logoUrl: brand.logoUrl || '',
			videoUrl: brand.videoUrl || ''
		};
		editing = true;
	}

	async function saveBrand() {
		saving = true;
		let imageTags: any = {};
		try { imageTags = JSON.parse(form.imageTagsText); } catch { imageTags = {}; }
		try {
			await putBrand({
				name: form.name,
				brandType: form.brandType,
				description: form.description,
				isActive: form.isActive,
				carouselImages: form.carouselImagesText.split('\n').map((s: string) => s.trim()).filter(Boolean),
				imageTags,
				bannerUrl: form.bannerUrl,
				logoUrl: form.logoUrl,
				videoUrl: form.videoUrl
			});
			editing = false;
			toast = { type: 'success', text: 'Brand saved' };
			setTimeout(() => (toast = null), 3000);
		} catch (err: any) {
			alert('Failed to save: ' + err.message);
		} finally {
			saving = false;
		}
	}

	async function autoSaveTags(v: string) {
		savingTags = true;
		const parsed = v.split(',').map((s) => s.trim().toLowerCase().replace(/\s+/g, '_')).filter(Boolean);
		try {
			await putBrand({ tags: parsed });
		} catch (err) {
			console.error('Failed to save tags:', err);
		} finally {
			savingTags = false;
		}
	}

	async function saveCompanyLink() {
		savingCompanyLink = true;
		try {
			await putBrand({ companyLink });
			companyLinkSaved = true;
			setTimeout(() => (companyLinkSaved = false), 2000);
		} catch (err) {
			console.error('Failed to save company link:', err);
		} finally {
			savingCompanyLink = false;
		}
	}

	async function saveSearchAliases() {
		savingSearchAliases = true;
		const aliases = searchAliases.split(',').map((s) => s.trim()).filter(Boolean);
		try {
			await putBrand({ searchAliases: aliases });
			searchAliasesSaved = true;
			setTimeout(() => (searchAliasesSaved = false), 2000);
		} catch (err) {
			console.error('Failed to save search aliases:', err);
		} finally {
			savingSearchAliases = false;
		}
	}

	function uploadBannerFile(file: File) {
		const formData = new FormData();
		formData.append('image', file);
		fetch(API_BASE + `admin/brands/${id}/banner`, { method: 'POST', body: formData })
			.then((r) => { if (!r.ok) throw new Error('Upload failed: ' + r.status); return r.json(); })
			.then(() => loadBrand())
			.catch((err) => alert('Banner upload failed: ' + err.message));
	}

	async function setBannerUrl(url: string) {
		if (!url) return;
		try {
			await putBrand({ bannerUrl: url });
			loadBrand();
		} catch (err: any) {
			alert('Failed to set banner URL: ' + err.message);
		}
	}

	function handleBannerDrop(e: DragEvent) {
		e.preventDefault();
		e.stopPropagation();
		bannerDragOver = false;
		const html = e.dataTransfer?.getData('text/html') || '';
		const url =
			(e.dataTransfer?.getData('text/uri-list') || html.match(/href="([^"]+)"/)?.[1] || '').trim() ||
			draggedImageUrl ||
			'';
		draggedImageUrl = null;
		if (!url) return;
		setBannerUrl(url.trim());
	}

	function uploadVideoFile(file: File) {
		const formData = new FormData();
		formData.append('video', file);
		fetch(API_BASE + `admin/brands/${id}/video`, { method: 'POST', body: formData })
			.then((r) => { if (!r.ok) throw new Error('Upload failed: ' + r.status); return r.json(); })
			.then(() => loadBrand())
			.catch((err) => alert('Video upload failed: ' + err.message));
	}

	async function setVideoUrl(url: string) {
		if (!url) return;
		try {
			await putBrand({ videoUrl: url });
			loadBrand();
		} catch (err: any) {
			alert('Failed to set video URL: ' + err.message);
		}
	}

	async function saveCarousel(text: string) {
		try {
			await putBrand({ carouselImages: text.split('\n').map((s) => s.trim()).filter(Boolean) });
		} catch (err) {
			console.error('Failed to save carousel:', err);
		}
	}

	function uploadLogoFile(file: File) {
		logoError = false;
		const formData = new FormData();
		formData.append('image', file);
		fetch(API_BASE + `admin/brands/${id}/logo`, { method: 'POST', body: formData })
			.then((r) => { if (!r.ok) throw new Error('Upload failed: ' + r.status); return r.json(); })
			.then((data) => { brand = { ...brand, logoUrl: data.url }; })
			.catch((err) => { console.error('Logo upload failed:', err); alert('Logo upload failed: ' + err.message); });
	}

	async function deleteBrand() {
		if (!confirm(`Are you sure you want to delete "${brand?.name}"?`)) return;
		deleting = true;
		try {
			const res = await fetch(API_BASE + `admin/brands/${id}`, { method: 'DELETE' });
			if (res.ok) window.location.href = '/admin/brands';
			else { const d = await res.json(); alert('Failed to delete: ' + (d.message || d.error || res.status)); }
		} catch (err: any) {
			alert('Network error: ' + err.message);
		} finally {
			deleting = false;
		}
	}

	function setTab(key: string) {
		activeTab = key;
		saveTabPref(key);
	}

	function isValidTab(key: string) {
		return tabs.some((x) => x.key === key);
	}

	async function loadTabPref() {
		const bid = id;
		if (!bid) return;
		try {
			const res = await fetch(API_BASE + 'admin/personalize');
			if (!res.ok) return;
			const data = await res.json();
			const saved = data.brandDetailPrefs?.[bid]?.activeTab;
			const q = page.url.searchParams.get('tab');
			const candidate = q && isValidTab(q) ? q : saved && isValidTab(saved) ? saved : null;
			if (candidate) activeTab = candidate;
		} catch {
			/* ignore */
		}
	}

	function saveTabPref(key: string) {
		const bid = id;
		if (!bid) return;
		fetch(API_BASE + 'admin/personalize', {
			method: 'PUT',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ brandDetailPrefs: { [bid]: { activeTab: key } } })
		}).catch(() => {});
	}

	$effect(() => {
		loadBrand();
		loadTabPref();
	});
	$effect(() => {
		const t = page.url.searchParams.get('tab');
		if (t && tabs.some((x) => x.key === t)) activeTab = t;
	});
</script>

<svelte:head><title>Admin · {brand?.name || 'Brand'}</title></svelte:head>

<div class="min-h-screen bg-gray-50">
	<header class="bg-white border-b border-gray-200">
		<div class="max-w-5xl mx-auto px-6 py-4">
			<a href="/admin/brands" class="text-orange-500 hover:text-orange-600 text-sm font-medium">← Back to Brands</a>

			{#if loading}
				<div class="text-center py-8 text-gray-400">Loading brand...</div>
			{:else if !brand}
				<div class="text-center py-8">
					<p class="text-gray-900">Brand not found</p>
					<a href="/admin/brands" class="text-orange-500 font-medium text-sm inline-block mt-2">Back to Brands</a>
				</div>
			{:else}
			<div class="flex items-center gap-4 mt-3">
				<!-- Logo — clickable to upload -->
				<label class="inline-flex w-14 h-14 rounded-xl overflow-hidden cursor-pointer relative group flex-shrink-0 border border-gray-100">
					{#if brand.logoUrl && !logoError}
						<img src={brand.logoUrl} alt={brand.name} class="w-full h-full object-cover" onerror={() => (logoError = true)} />
						<div class="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
							<span class="text-white text-xs font-semibold">Change</span>
						</div>
					{:else}
						<div class="w-full h-full bg-violet-100 flex items-center justify-center text-violet-600 text-2xl font-bold group-hover:bg-violet-200 transition">
							<span class="group-hover:hidden">{brand.name?.charAt(0)}</span>
							<span class="hidden group-hover:inline text-sm">📷</span>
						</div>
					{/if}
					<input type="file" accept="image/*" class="hidden" onchange={(e) => { const f = (e.currentTarget as HTMLInputElement).files?.[0]; if (f) uploadLogoFile(f); }} />
				</label>
				<div>
					<div class="flex items-center gap-2">
						<h1 class="text-2xl font-bold text-gray-900">
							{brand.name}
							{#if brand.manualLocationCount > 0}<span class="text-xs text-gray-400 ml-1">({brand.manualLocationCount.toLocaleString('en-US')})</span>{/if}
						</h1>
						<span class={`text-xs px-2 py-0.5 rounded-full font-medium ${typeBadgeColors[brand.brandType] || 'bg-gray-100 text-gray-700'}`}>{typeLabels[brand.brandType] || brand.brandType}</span>
					</div>
					<p class="text-sm text-gray-500">{brand.description || 'No description set'}</p>
				</div>
				<div class="ml-auto flex items-center gap-2">
					<a href="/admin/brands" class="bg-violet-600 text-white px-4 py-2 rounded-lg hover:bg-violet-700 text-sm font-medium">+ Add Brand</a>
					<label class="cursor-pointer bg-gray-100 hover:bg-gray-200 text-gray-600 px-3 py-1.5 rounded-lg text-xs font-medium transition flex items-center gap-1.5">
						📷 {brand.logoUrl && !logoError ? 'Change Logo' : 'Upload Logo'}
						<input type="file" accept="image/*" class="hidden" onchange={(e) => { const f = (e.currentTarget as HTMLInputElement).files?.[0]; if (f) uploadLogoFile(f); }} />
					</label>
				</div>
			</div>
		{/if}
	</div>
</header>

	{#if toast}
		<div class="fixed bottom-6 right-6 z-50 px-4 py-3 rounded-lg shadow-lg text-sm font-medium {toast.type === 'success' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'}">{toast.text}</div>
	{/if}

	<main class="max-w-5xl mx-auto px-6 py-6">
		{#if brand}
			<!-- Tabs -->
			<div class="flex border-b border-gray-200 mb-6 overflow-x-auto">
				{#each tabs as t}
					<button
						onclick={() => setTab(t.key)}
						class={`px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${activeTab === t.key ? 'border-violet-600 text-violet-700' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
					>
						{t.icon} {tabLabel(t)}
					</button>
				{/each}
					<a
						href={`/admin/GU/${id}`}
						class="ml-3 self-center inline-flex items-center gap-1.5 px-4 py-3 text-sm font-medium border-b-2 border-transparent text-gray-500 whitespace-nowrap transition-colors hover:text-gray-700 hover:border-gray-300"
					>🛒 Store Aisles</a>
			</div>
		{/if}
		{#if brand && activeTab === 'overview'}
			<div class="space-y-6">
				<!-- Brand Info Card -->
				<div class="bg-white rounded-xl border border-gray-200 p-5">
					<div class="flex items-center justify-between mb-3">
						<h3 class="font-semibold text-gray-900">Brand Information</h3>
						{#if !editing}
							<button onclick={startEditing} class="text-xs text-violet-600 hover:text-violet-700 font-medium">Edit</button>
						{:else}
							<div class="flex gap-2">
								<button onclick={saveBrand} disabled={saving} class="text-xs bg-violet-600 text-white px-3 py-1 rounded-lg hover:bg-violet-700 disabled:opacity-50 font-medium">{saving ? 'Saving...' : 'Save'}</button>
								<button onclick={() => (editing = false)} class="text-xs text-gray-400 hover:text-gray-600">Cancel</button>
							</div>
						{/if}
					</div>

					{#if !editing}
						<div class="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
							<div><span class="text-gray-400 text-xs">Name</span><br /><span class="font-medium">{brand.name}</span></div>
							<div><span class="text-gray-400 text-xs">Type</span><br /><span class="font-medium">{typeLabels[brand.brandType] || brand.brandType}</span></div>
							<div>
								<span class="text-gray-400 text-xs">Status</span><br />
								<button onclick={toggleBrandStatus} disabled={togglingStatus} class={`mt-0.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 min-w-[130px] whitespace-nowrap ${brand.isActive ? 'bg-green-100 text-green-700 hover:bg-green-200' : 'bg-red-100 text-red-700 hover:bg-red-200'} ${togglingStatus ? 'opacity-50 cursor-wait scale-95' : 'cursor-pointer'}`}>
									{brand.isActive ? '🟢 Active' : '🔴 Inactive'}
								</button>
							</div>
							<div>
								<span class="text-gray-400 text-xs">Brand ID</span><br />
								<div class="flex items-center gap-4 mt-1 whitespace-nowrap">
									<code class="text-xs bg-gray-50 px-1.5 py-0.5 rounded">{brand.id || brand._id}</code>
									<label class="flex items-center gap-1 cursor-pointer text-xs"><input type="checkbox" checked={!!brand.doorDashEnabled} onchange={() => toggleField('doorDashEnabled')} class="rounded border-gray-300 text-orange-500 focus:ring-orange-400" disabled={tl.doorDashEnabled} /> Door</label>
									<a href={`https://www.google.com/search?q=doordash+${encodeURIComponent(brand.name)}+in+${encodeURIComponent(cityQuery)}`} target="_blank" rel="noopener noreferrer" class="text-[11px] font-bold text-gray-400 hover:text-blue-600 transition shrink-0" title={`Search doordash ${brand.name}`}>G</a>
									<label class="flex items-center gap-1 cursor-pointer text-xs"><input type="checkbox" checked={!!brand.uberEatsEnabled} onchange={() => toggleField('uberEatsEnabled')} class="rounded border-gray-300 text-green-500 focus:ring-green-400" disabled={tl.uberEatsEnabled} /> UE</label>
									<a href={`https://www.google.com/search?q=uber+eats+${encodeURIComponent(brand.name)}+in+${encodeURIComponent(cityQuery)}`} target="_blank" rel="noopener noreferrer" class="text-[11px] font-bold text-gray-400 hover:text-blue-600 transition shrink-0" title={`Search uber eats ${brand.name}`}>G</a>
									<label class="flex items-center gap-1 cursor-pointer text-xs"><input type="checkbox" checked={!!brand.deliveryPlatformNone} onchange={() => toggleField('deliveryPlatformNone')} class="rounded border-gray-300 text-gray-500 focus:ring-gray-400" disabled={tl.deliveryPlatformNone} /> None</label>
									<a href={`https://www.google.com/search?q=instagram+${encodeURIComponent(brand.name)}`} target="_blank" rel="noopener noreferrer" class="text-[11px] font-bold text-gray-400 hover:text-pink-600 transition shrink-0" title={`Search instagram ${brand.name}`}>IG</a>
								</div>
								<div class="flex items-center gap-4 mt-1 whitespace-nowrap">
									<label class="flex items-center gap-1 cursor-pointer text-xs"><input type="checkbox" checked={!!brand.moreWorkNeeded} onchange={() => toggleField('moreWorkNeeded')} class="rounded border-gray-300 text-red-500 focus:ring-red-400" disabled={tl.moreWorkNeeded} /> More Work</label>
									<label class="flex items-center gap-1 cursor-pointer text-xs"><input type="checkbox" checked={!!brand.acceptOnlineOrders} onchange={() => toggleField('acceptOnlineOrders')} class="rounded border-gray-300 text-sky-500 focus:ring-sky-400" disabled={tl.acceptOnlineOrders} /> Online</label>
									<label class="flex items-center gap-1 cursor-pointer text-xs"><input type="checkbox" checked={!!brand.orderOnlineNotAvailable} onchange={() => toggleField('orderOnlineNotAvailable')} class="rounded border-gray-300 text-red-500 focus:ring-red-400" disabled={tl.orderOnlineNotAvailable} /> No Online</label>
									<label class="flex items-center gap-1 cursor-pointer text-xs"><input type="checkbox" checked={!!brand.botOrdering} onchange={() => toggleField('botOrdering')} class="rounded border-gray-300 text-yellow-500 focus:ring-yellow-400" disabled={tl.botOrdering} /> Bot</label>
									<label class="flex items-center gap-1 cursor-pointer text-xs"><input type="checkbox" checked={!!brand.checkoutIssues} onchange={() => toggleField('checkoutIssues')} class="rounded border-gray-300 text-red-500 focus:ring-red-400" disabled={tl.checkoutIssues} /> Checkout Issues</label>
								</div>
							</div>
							<div class="col-span-2 md:col-span-3"><span class="text-gray-400 text-xs">Description</span><br /><span class="font-medium">{brand.description || '—'}</span></div>
							<div class="col-span-2 md:col-span-3">
								<span class="text-gray-400 text-xs">Tags</span>
								<div class="mt-1 flex items-center gap-2">
									<div class="flex-1">
										<TagAutocomplete value={(brand.tags || []).join(', ')} onChange={autoSaveTags} placeholder="Add tag and press Enter..." />
									</div>
									{#if savingTags}<span class="text-xs text-green-600 font-medium shrink-0">Saving...</span>{/if}
								</div>
							</div>
							<div class="col-span-2 md:col-span-3">
								<span class="text-gray-400 text-xs">Company Link</span>
								<div class="mt-1 flex items-center gap-2">
									<input type="text" bind:value={companyLink} onblur={saveCompanyLink} onkeydown={(e) => { if (e.key === 'Enter') saveCompanyLink(); }} placeholder="https://www.company.com" class="flex-1 border border-gray-300 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-violet-400" />
									{#if savingCompanyLink}<span class="text-xs text-gray-500">Saving...</span>{/if}
									{#if companyLinkSaved}<span class="text-xs text-green-600 font-medium">Saved ✓</span>{/if}
									{#if companyLink}<a href={companyLink} target="_blank" rel="noopener noreferrer" class="text-xs text-blue-600 hover:text-blue-800 hover:underline shrink-0">↗</a>{/if}
								</div>
							</div>
							<div class="col-span-2 md:col-span-3">
								<span class="text-gray-400 text-xs">Search Aliases</span>
								<div class="mt-1 flex items-center gap-2">
									<input type="text" bind:value={searchAliases} onblur={saveSearchAliases} onkeydown={(e) => { if (e.key === 'Enter') saveSearchAliases(); }} placeholder="Chicken + Whiskey, Chicken and Whiskey" class="flex-1 border border-gray-300 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-violet-400" />
									{#if savingSearchAliases}<span class="text-xs text-gray-500">Saving...</span>{/if}
									{#if searchAliasesSaved}<span class="text-xs text-green-600 font-medium">Saved ✓</span>{/if}
								</div>
							</div>
							<!-- Banner -->
							<div class="col-span-2 md:col-span-3">
								<span class="text-gray-400 text-xs">Banner Image</span>
								<div class="mt-1 flex flex-wrap items-start gap-3">
									{#if brand.bannerUrl && !bannerError}
										<div
											class={`relative group rounded-xl overflow-hidden border-2 transition-all ${bannerDragOver ? 'border-blue-500 bg-blue-50' : 'border-gray-200'}`}
											style="max-width:600px"
											ondragover={(e) => { e.preventDefault(); bannerDragOver = true; }}
											ondragleave={() => (bannerDragOver = false)}
											ondrop={handleBannerDrop}
										>
											<img src={brand.bannerUrl} alt="Brand banner" draggable="false" class="w-full object-cover rounded-xl" style="aspect-ratio:16/5" onerror={() => (bannerError = true)} />
											<label class="absolute inset-0 transition flex items-center justify-center cursor-pointer bg-black/40 opacity-0 group-hover:opacity-100">
												<span class="text-white text-sm font-semibold">{bannerDragOver ? 'Drop to set as banner' : 'Change Banner'}</span>
												<input type="file" accept="image/*" class="hidden" onchange={(e) => { const f = (e.currentTarget as HTMLInputElement).files?.[0]; if (f) uploadBannerFile(f); }} />
											</label>
										</div>
									{:else}
										<label
											class={`inline-flex items-center gap-2 cursor-pointer border-2 border-dashed rounded-xl px-6 py-4 text-sm transition ${bannerDragOver ? 'border-blue-500 bg-blue-50 text-blue-600' : 'border-gray-300 hover:border-gray-400 text-gray-400 hover:text-gray-500'}`}
											ondragover={(e) => { e.preventDefault(); bannerDragOver = true; }}
											ondragleave={() => (bannerDragOver = false)}
											ondrop={handleBannerDrop}
										>
											<span>🖼️</span>
											<span>{bannerDragOver ? 'Drop to set as banner' : 'Upload a banner image'}</span>
											<input type="file" accept="image/*" class="hidden" onchange={(e) => { const f = (e.currentTarget as HTMLInputElement).files?.[0]; if (f) uploadBannerFile(f); }} />
										</label>
									{/if}
									<div class="flex gap-2 items-center">
										<input type="text" id="banner-url-input" placeholder="Or paste image URL..." class="w-64 border border-gray-300 rounded-lg px-3 py-1.5 text-xs" />
										<button onclick={() => { const el = document.getElementById('banner-url-input') as HTMLInputElement; setBannerUrl(el?.value?.trim()); el.value = ''; }} class="text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-1.5 rounded-lg font-medium transition shrink-0">Set URL</button>
									</div>
								</div>
								<div class="mt-2">
									<a href={`/admin/brands/${id}/crop`} class="inline-block bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium px-3 py-1.5 rounded-lg transition">Easy Crop</a>
								</div>
							</div>
							<!-- Video -->
							<div class="col-span-2 md:col-span-3">
								<span class="text-gray-400 text-xs">Brand Video</span>
								<div class="mt-1 flex flex-wrap items-start gap-3">
									{#if brand.videoUrl}
										<div class="relative group rounded-xl overflow-hidden border border-gray-200" style="max-width:400px">
											<video src={brand.videoUrl} controls class="w-full rounded-xl" style="max-height:300px"></video>
											<label class="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center cursor-pointer">
												<span class="text-white text-sm font-semibold">Change Video</span>
												<input type="file" accept="video/*" class="hidden" onchange={(e) => { const f = (e.currentTarget as HTMLInputElement).files?.[0]; if (f) uploadVideoFile(f); }} />
											</label>
										</div>
									{:else}
										<label class="inline-flex items-center gap-2 cursor-pointer border-2 border-dashed border-gray-300 hover:border-gray-400 rounded-xl px-6 py-4 text-gray-400 hover:text-gray-500 transition text-sm">
											<span>🎬</span>
											<span>Upload a brand video</span>
											<input type="file" accept="video/*" class="hidden" onchange={(e) => { const f = (e.currentTarget as HTMLInputElement).files?.[0]; if (f) uploadVideoFile(f); }} />
										</label>
									{/if}
									<div class="flex gap-2 items-center">
										<input type="text" id="video-url-input" placeholder="Or paste video URL..." class="w-64 border border-gray-300 rounded-lg px-3 py-1.5 text-xs" />
										<button onclick={() => { const el = document.getElementById('video-url-input') as HTMLInputElement; setVideoUrl(el?.value?.trim()); el.value = ''; }} class="text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-1.5 rounded-lg font-medium transition shrink-0">Set URL</button>
									</div>
								</div>
							</div>
							<!-- Carousel -->
							<div class="col-span-2 md:col-span-3">
								<span class="text-gray-400 text-xs">Carousel Images -1</span>
								<div class="mt-2">
									<ImageUpload
										brandId={id}
										initialImages={brand.carouselImages || []}
										imageTags={brand.imageTags || {}}
										onImagesChange={(urls: string[]) => { brand = { ...brand, carouselImages: urls }; }}
										onImageTagsChange={(tags: Record<string, string[]>) => { brand = { ...brand, imageTags: tags }; }}
										onImageDragStart={(url: string) => (draggedImageUrl = url)}
									/>
								</div>
							</div>
						</div>
					{:else}
						<div class="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
							<div>
								<label class="text-gray-400 text-xs">Name</label>
								<input type="text" bind:value={form.name} class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm mt-1" />
							</div>
							<div>
								<label class="text-gray-400 text-xs">Type</label>
								<select bind:value={form.brandType} class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm mt-1">
									<option value="restaurant">Restaurant</option>
									<option value="grocery">Grocery</option>
									<option value="convenience">Convenience</option>
									<option value="pharmacy">Pharmacy</option>
									<option value="localBusiness">Local Business</option>
									<option value="retail">Retail</option>
								</select>
							</div>
							<div>
								<label class="text-gray-400 text-xs">Status</label><br />
								<button onclick={() => (form.isActive = !form.isActive)} class={`mt-1 px-3 py-2 rounded-lg text-sm font-medium min-w-[100px] whitespace-nowrap ${form.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{form.isActive ? '🟢 Active' : '🔴 Inactive'}</button>
							</div>
							<div class="col-span-2 md:col-span-3">
								<label class="text-gray-400 text-xs">Description</label>
								<textarea bind:value={form.description} rows={2} class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm mt-1"></textarea>
							</div>
							<div class="col-span-2 md:col-span-3">
								<label class="text-gray-400 text-xs">Banner URL</label>
								<input type="text" bind:value={form.bannerUrl} class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm mt-1" />
							</div>
							<div class="col-span-2 md:col-span-3">
								<label class="text-gray-400 text-xs">Logo URL</label>
								<input type="text" bind:value={form.logoUrl} class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm mt-1" />
							</div>
							<div class="col-span-2 md:col-span-3">
								<label class="text-gray-400 text-xs">Video URL</label>
								<input type="text" bind:value={form.videoUrl} class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm mt-1" />
							</div>
							<div class="col-span-2 md:col-span-3">
								<label class="text-gray-400 text-xs">Carousel Images (one per line)</label>
								<textarea bind:value={form.carouselImagesText} rows={3} class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm mt-1 font-mono"></textarea>
							</div>
							<div class="col-span-2 md:col-span-3">
								<label class="text-gray-400 text-xs">Image Tags (JSON)</label>
								<textarea bind:value={form.imageTagsText} rows={4} class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm mt-1 font-mono"></textarea>
							</div>
						</div>
					{/if}
				</div>
			</div>

			<!-- Debug API Endpoints -->
			<div class="mt-10 mb-80 border border-gray-300 rounded-xl overflow-hidden bg-gray-50">
				<details>
					<summary class="px-5 py-3 bg-gray-100 cursor-pointer select-none flex items-center gap-2 hover:bg-gray-200 transition">
						<span class="text-sm font-semibold text-gray-700">Debug API Endpoints</span>
						<span class="text-xs text-gray-400 font-mono">{id}</span>
					</summary>
					<div class="p-5">
						<table class="w-full text-sm">
							<thead>
								<tr class="text-left text-xs text-gray-500 uppercase tracking-wider">
									<th class="pb-2 pr-4 w-40">Endpoint</th>
									<th class="pb-2 pr-4">Local</th>
									<th class="pb-2">AWS Lambda</th>
								</tr>
							</thead>
							<tbody class="font-mono text-xs">
								{#each _DEBUG_ENDPOINTS as ep}
									<tr class="border-t border-gray-200">
										<td class="py-2 pr-4 font-sans font-medium text-gray-700">{ep.label}</td>
										<td class="py-2 pr-4">
											<a href={_DEBUG_LOCAL + ep.path} target="_blank" rel="noopener noreferrer" class="text-blue-600 hover:text-blue-800 hover:underline break-all">{_DEBUG_LOCAL + ep.path}</a>
										</td>
										<td class="py-2">
											<a href={_DEBUG_AWS + ep.path} target="_blank" rel="noopener noreferrer" class="text-violet-600 hover:text-violet-800 hover:underline break-all">{_DEBUG_AWS + ep.path}</a>
										</td>
									</tr>
								{/each}
							</tbody>
						</table>
					</div>
				</details>
			</div>
		{:else if brand && activeTab === 'locations'}
			<LocationsTab brandId={id} {brand} />
		{:else if brand && activeTab === 'menu'}
			<div class="bg-white rounded-xl border border-gray-200 p-8 text-center">
				<p class="text-2xl">🍕</p>
				<p class="text-gray-900 font-semibold mt-2">Menu</p>
				<p class="text-sm text-gray-500 mt-1">{menuCount ?? 0} items</p>
				<p class="text-xs text-gray-400 mt-4">Menu editing is coming to this admin soon.</p>
			</div>
		{:else if brand && activeTab === 'menuOnline'}
			<MenuOnlineTab {brand} bid={id} />
		{:else if brand && activeTab === 'catalog'}
			<div class="bg-white rounded-xl border border-gray-200 p-8 text-center">
				<p class="text-2xl">🛒</p>
				<p class="text-gray-900 font-semibold mt-2">Catalog</p>
				<p class="text-sm text-gray-500 mt-1">{catalogCount ?? 0} items</p>
				<p class="text-xs text-gray-400 mt-4">Catalog editing is coming to this admin soon.</p>
			</div>
		{:else if brand && activeTab === 'drivers'}
			<DriverSettings {brand} brandId={id} />
		{:else if brand && activeTab === 'misc'}
			<MiscTab {brand} brandId={id} />
		{/if}
	</main>
</div>
<div class="h-[50vh]"></div>
