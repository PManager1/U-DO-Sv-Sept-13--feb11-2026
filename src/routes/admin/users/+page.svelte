<script lang="ts">
	import { onMount } from 'svelte';
	import API_BASE from '$lib/api';

	let users = $state<any[]>([]);
	let loading = $state(true);
	let error = $state<string | null>(null);
	let searchQuery = $state('');
	let expandedCard = $state<number | null>(null);
	let editingUserId = $state<string | null>(null);
	let draftRoles = $state<string[]>([]);
	let savingUserId = $state<string | null>(null);
	let deletingUserId = $state<string | null>(null);
	let toast = $state<{ type: string; text: string } | null>(null);
	let loadingAddresses = $state<string | null>(null);
	let userAddresses = $state<Record<string, any[]>>({});
	let updatingStatusUserId = $state<string | null>(null);
	let userStatuses = $state<Record<string, string>>({});
	let imageModalOpen = $state(false);
	let imageModalIndex = $state(0);
	let currentImages = $state<string[]>([]);
	let currentLabels = $state<string[]>([]);

	const ALL_ROLES = ['user', 'customer', 'driver', 'provider', 'restaurant-owner', 'admin'];

	const roleColors: Record<string, string> = {
		user: 'bg-blue-50 text-blue-700',
		customer: 'bg-blue-50 text-blue-700',
		driver: 'bg-green-50 text-green-700',
		provider: 'bg-purple-50 text-purple-700',
		'restaurant-owner': 'bg-teal-50 text-teal-700',
		admin: 'bg-orange-50 text-orange-700'
	};

	$effect(() => {
		if (!toast) return;
		const t = setTimeout(() => (toast = null), 3000);
		return () => clearTimeout(t);
	});

	async function updateRoles(userId: string, roles: string[]) {
		savingUserId = userId;
		try {
			const res = await fetch(API_BASE + `admin/users/${userId}/role`, {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ roles })
			});
			if (!res.ok) {
				const text = await res.text();
				let msg: string;
				try {
					const parsed = JSON.parse(text);
					msg = parsed.error || parsed.message || text;
				} catch {
					msg = text;
				}
				toast = { type: 'error', text: msg };
				return;
			}
			users = users.map((u) => (u._id === userId ? { ...u, roles, role: roles[0] } : u));
			editingUserId = null;
			toast = { type: 'success', text: 'Roles saved to database' };
		} catch (err) {
			toast = { type: 'error', text: 'Network error: ' + (err as Error).message };
		} finally {
			savingUserId = null;
		}
	}

	async function deleteUser(userId: string, idx: number) {
		const user = filtered[idx];
		const userName = `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email || 'this user';
		
		if (!window.confirm(`Are you sure you want to delete ${userName}? This will permanently remove all user data including addresses and service profiles. This action cannot be undone.`)) {
			return;
		}

		deletingUserId = userId;
		try {
			const res = await fetch(API_BASE + `admin/users/${userId}`, {
				method: 'DELETE'
			});
			if (!res.ok) {
				const text = await res.text();
				let msg: string;
				try {
					const parsed = JSON.parse(text);
					msg = parsed.error || parsed.message || text;
				} catch {
					msg = text;
				}
				toast = { type: 'error', text: msg };
				return;
			}
			users = users.filter((u) => u._id !== userId);
			expandedCard = null;
			toast = { type: 'success', text: 'User deleted successfully' };
		} catch (err) {
			toast = { type: 'error', text: 'Network error: ' + (err as Error).message };
		} finally {
			deletingUserId = null;
		}
	}

	async function updateUserStatus(userId: string, newStatus: string) {
		updatingStatusUserId = userId;
		try {
			const res = await fetch(API_BASE + `admin/users/${userId}/status`, {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ status: newStatus })
			});
			if (!res.ok) {
				const text = await res.text();
				let msg: string;
				try {
					const parsed = JSON.parse(text);
					msg = parsed.error || parsed.message || text;
				} catch {
					msg = text;
				}
				toast = { type: 'error', text: msg };
				return;
			}
			userStatuses = { ...userStatuses, [userId]: newStatus };
			toast = { type: 'success', text: 'Account status updated' };
		} catch (err) {
			toast = { type: 'error', text: 'Network error: ' + (err as Error).message };
		} finally {
			updatingStatusUserId = null;
		}
	}

	onMount(() => {
		loadData();
	});

	async function loadData() {
		loading = true;
		error = null;
		try {
			const res = await fetch(API_BASE + 'admin/users');
			if (!res.ok) throw new Error(`Server returned ${res.status}`);
			const data = await res.json();
			const raw = data.users || data || [];
			const extracted = raw.map((item: any) => item.user || item);
			const seen = new Set();
			const unique = extracted.filter((u: any) => {
				if (!u._id || seen.has(u._id)) return false;
				seen.add(u._id);
				return true;
			});

			const initialStatuses: Record<string, string> = {};
			for (const u of unique) {
				if (u.accountStatus) {
					initialStatuses[u._id] = u.accountStatus;
				}
			}
			userStatuses = initialStatuses;

			users = unique;
		} catch (err) {
			error = (err as Error).message + ' — Make sure the server is running at ' + API_BASE;
		} finally {
			loading = false;
		}
	}

	function toggleCard(idx: number) {
		const isCollapsing = expandedCard === idx;
		expandedCard = isCollapsing ? null : idx;
		if (isCollapsing) {
			editingUserId = null;
		} else {
			const u = filtered[idx];
			draftRoles = getRoles(u);
			editingUserId = u._id;
			if (!userStatuses[u._id]) {
				userStatuses = { ...userStatuses, [u._id]: 'account_under_review' };
			}
			loadUserAddresses(u._id);
		}
	}

	async function loadUserAddresses(userId: string) {
		if (userAddresses[userId]) return;

		loadingAddresses = userId;
		try {
			const res = await fetch(API_BASE + `admin/users/${userId}/addresses`);
			if (!res.ok) throw new Error('Failed to load addresses');
			const addresses = await res.json();
			userAddresses[userId] = addresses;
		} catch (err) {
			console.error('Failed to load addresses:', err);
			userAddresses[userId] = [];
		} finally {
			loadingAddresses = null;
		}
	}

	const filtered = $derived(
		searchQuery.trim()
			? users.filter((u) => {
					const phone = u.phoneNumber || u.phone || '';
					const text = `${u.firstName || ''} ${u.lastName || ''} ${u.email || ''} ${phone} ${u.role || ''} ${u._id || ''}`.toLowerCase();
					return text.includes(searchQuery.toLowerCase());
				})
			: users
	);

	function formatDate(dateStr: string) {
		if (!dateStr) return '—';
		try {
			const d = new Date(dateStr);
			return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
		} catch {
			return dateStr;
		}
	}

	function getInitials(user: any) {
		const first = user.firstName || '';
		const last = user.lastName || '';
		if (first || last) return ((first[0] || '') + (last[0] || '')).toUpperCase();
		return (user.email || '?')[0].toUpperCase();
	}

	function getRoles(user: any) {
		if (Array.isArray(user.roles) && user.roles.length) return [...user.roles];
		return user.role ? [user.role] : ['user'];
	}

	function openImageModal(images: string[], labels: string[]) {
		currentImages = images;
		currentLabels = labels;
		imageModalOpen = true;
		imageModalIndex = 0;
	}

	function closeModal() {
		imageModalOpen = false;
	}

	function prevImage() {
		if (imageModalIndex > 0) imageModalIndex--;
	}

	function nextImage() {
		if (imageModalIndex < currentImages.length - 1) imageModalIndex++;
	}

	$effect(() => {
		if (!imageModalOpen) return;
		function handleKey(e: KeyboardEvent) {
			if (e.key === 'Escape') closeModal();
			if (e.key === 'ArrowLeft') prevImage();
			if (e.key === 'ArrowRight') nextImage();
		}
		document.addEventListener('keydown', handleKey);
		return () => document.removeEventListener('keydown', handleKey);
	});
</script>

<header class="bg-white border-b border-gray-200">
	<div class="max-w-6xl mx-auto px-6 py-6">
		<a href="/admin/" class="flex items-center gap-3 group">
			<div class="w-10 h-10 bg-orange-500 rounded-xl flex items-center justify-center">
				<svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
			</div>
			<div>
				<h1 class="text-2xl font-bold text-gray-900">Users</h1>
				<p class="text-sm text-gray-500">View and manage all registered users</p>
			</div>
		</a>
	</div>
</header>

<main class="max-w-6xl mx-auto px-6 py-8">
	<div class="flex flex-wrap items-center gap-4 mb-6">
		<div class="bg-gray-50 border border-gray-200 rounded-full px-3 py-1 text-xs font-semibold">👥 {users.length} Users</div>
		<div class="flex-1"></div>
		<div class="relative">
			<svg class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
			<input type="text" value={searchQuery} oninput={(e) => (searchQuery = (e.currentTarget as HTMLInputElement).value)} placeholder="Search by name, email, phone..." class="pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm w-72 focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100" />
		</div>
		<button onclick={loadData} class="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition flex items-center gap-2">
			<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
			Refresh
		</button>
	</div>

	{#if loading}
		<div class="text-center py-16">
			<svg class="animate-spin w-10 h-10 text-orange-500 mx-auto mb-4" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path></svg>
			<p class="text-gray-500">Loading users...</p>
		</div>
	{/if}

	{#if error}
		<div class="text-center py-16">
			<div class="text-5xl mb-4">⚠️</div>
			<p class="text-gray-700 font-semibold mb-2">Failed to load data</p>
			<p class="text-sm text-gray-500 mb-4">{error}</p>
			<button onclick={loadData} class="bg-orange-500 hover:bg-orange-600 text-white px-6 py-2 rounded-lg text-sm font-medium transition">Try Again</button>
		</div>
	{/if}

	{#if !loading && !error && filtered.length === 0}
		<div class="text-center py-16">
			<div class="text-5xl mb-4">🔍</div>
			<p class="text-gray-700 font-semibold mb-2">No users found</p>
			<p class="text-sm text-gray-500">Try adjusting your search query.</p>
		</div>
	{/if}

	<div class="space-y-3">
		{#each filtered as user, idx}
			{@const isExpanded = expandedCard === idx}
			<div onclick={() => toggleCard(idx)} class={`bg-white rounded-xl p-5 border cursor-pointer transition-all hover:shadow-md ${isExpanded ? 'border-orange-500 shadow-lg' : 'border-gray-200'}`}>
				<div class="flex items-center gap-4">
					<div class="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center flex-shrink-0">
						{#if user.profileImage || user.profileImageURL}
							<img src={user.profileImage || user.profileImageURL} alt="" class="w-full h-full object-cover rounded-xl" onerror={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} />
						{:else}
							<span class="text-lg font-bold text-blue-600">{getInitials(user)}</span>
						{/if}
					</div>
					<div class="flex-1 min-w-0">
						<div class="flex items-center gap-2 flex-wrap">
							<h3 class="font-semibold text-gray-900 truncate">{user.firstName && user.lastName ? `${user.firstName} ${user.lastName}` : user.firstName || user.lastName || user.email || 'Unknown User'}</h3>
							{#each getRoles(user) as r, i}
								<span class={`text-xs font-medium px-2 py-0.5 rounded-full capitalize ${roleColors[r.toLowerCase()] || 'bg-gray-50 text-gray-700'}`}>{r}</span>
							{/each}
							{#if userStatuses[user._id] || user.accountStatus}
								<span class={`text-xs font-medium px-2 py-0.5 rounded-full capitalize ${
									userStatuses[user._id] === 'active' ? 'bg-green-100 text-green-700' :
									userStatuses[user._id] === 'account_under_review' ? 'bg-amber-100 text-amber-700' :
									userStatuses[user._id] === 'deactivated' ? 'bg-red-100 text-red-700' :
									'bg-gray-100 text-gray-700'
								}`}>{userStatuses[user._id] === 'active' ? 'Active' : userStatuses[user._id] === 'account_under_review' ? 'Under Review' : userStatuses[user._id] === 'deactivated' ? 'Deactivated' : userStatuses[user._id] || 'Active'}</span>
							{/if}
						</div>
						<div class="flex items-center gap-4 mt-1 flex-wrap">
							{#if user.email}<span class="text-sm text-gray-500 truncate">✉️ {user.email}</span>{/if}
							{#if user.phoneNumber || user.phone}<span class="text-sm text-green-700 font-medium">📱 {user.phoneNumber || user.phone}</span>{/if}
							{#if user.createdAt}<span class="text-xs text-gray-400">Joined {formatDate(user.createdAt)}</span>{/if}
						</div>
					</div>
					<svg class={`w-5 h-5 text-gray-400 flex-shrink-0 transition-transform ${isExpanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" /></svg>
				</div>

				{#if isExpanded}
					<div onclick={(e) => e.stopPropagation()} class="border-t border-gray-100 mt-4 pt-4 overflow-y-auto" style="max-height:70vh">
						<div class="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
							<div><p class="text-xs font-medium text-gray-400">User ID</p><p class="font-mono text-xs text-gray-600 bg-gray-50 px-2 py-1 rounded mt-1 break-all">{user._id || '—'}</p></div>
							<div><p class="text-xs font-medium text-gray-400">Role</p><p class="text-gray-700 mt-1 capitalize">{user.role || 'user'}</p></div>
							<div><p class="text-xs font-medium text-gray-400">Email</p><p class="text-gray-700 mt-1">{user.email || '—'}</p></div>
							<div><p class="text-xs font-medium text-gray-400">Phone</p><p class="text-gray-700 mt-1">{user.phoneNumber || user.phone || '—'}</p></div>
							<div><p class="text-xs font-medium text-gray-400">First Name</p><p class="text-gray-700 mt-1">{user.firstName || '—'}</p></div>
							<div><p class="text-xs font-medium text-gray-400">Last Name</p><p class="text-gray-700 mt-1">{user.lastName || '—'}</p></div>
							<div><p class="text-xs font-medium text-gray-400">Created</p><p class="text-gray-700 mt-1">{formatDate(user.createdAt)}</p></div>
							<div><p class="text-xs font-medium text-gray-400">Updated</p><p class="text-gray-700 mt-1">{formatDate(user.updatedAt)}</p></div>
						</div>
					</div>

				<div onclick={(e) => e.stopPropagation()} class="border-t border-gray-100 mt-4 pt-4">
					<div class="flex items-center justify-between mb-2"><p class="text-xs font-medium text-gray-400">Roles</p></div>
						<div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
							{#each ALL_ROLES as role}
								{@const checked = draftRoles.includes(role)}
								{@const isLast = draftRoles.length === 1 && checked}
								<label class={`flex items-center gap-2 px-3 py-2 rounded-lg border transition cursor-pointer ${checked ? 'border-orange-300 bg-orange-50' : 'border-gray-200 bg-white'} ${isLast ? 'opacity-50' : ''}`}>
									<input
										type="checkbox"
										checked={checked}
										disabled={isLast}
										onchange={() => {
											if (role === 'admin' && checked && !window.confirm('Remove admin role from this user?')) return;
											draftRoles = checked ? draftRoles.filter((r) => r !== role) : [...draftRoles, role];
										}}
										class="w-4 h-4 accent-orange-500"
									/>
									<span class="text-sm capitalize text-gray-800">{role}</span>
								</label>
							{/each}
						</div>
						<div class="mt-3 flex justify-end">
							<button onclick={() => updateRoles(user._id, draftRoles)} disabled={savingUserId === user._id} class={`min-w-[80px] px-3 py-1 rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 transition-all duration-200 active:scale-95 ${savingUserId === user._id ? 'bg-emerald-500' : 'bg-emerald-600 hover:bg-emerald-700'} text-white disabled:opacity-70`}>
								{#if savingUserId === user._id}
									<svg class="animate-spin w-3 h-3" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" /></svg>
									Saving
								{:else}
									Save Roles
								{/if}
							</button>
						</div>
					</div>

					<!-- Addresses Section -->
					<div onclick={(e) => e.stopPropagation()} class="border-t border-gray-100 mt-4 pt-4">
						<div class="flex items-center justify-between mb-3">
							<p class="text-xs font-medium text-gray-400">📍 Saved Addresses</p>
							{#if loadingAddresses === user._id}
								<span class="text-xs text-gray-500">Loading...</span>
							{:else}
								<span class="text-xs text-gray-500">{userAddresses[user._id]?.length || 0} total</span>
							{/if}
						</div>

						{#if loadingAddresses === user._id}
							<div class="text-center py-4">
								<svg class="animate-spin w-5 h-5 text-orange-500 mx-auto" fill="none" viewBox="0 0 24 24">
									<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
									<path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
								</svg>
							</div>
						{:else if (userAddresses[user._id] || []).length === 0}
							<div class="text-center py-4 text-sm text-gray-500 bg-gray-50 rounded-lg">
								No saved addresses
							</div>
						{:else}
							<div class="space-y-2">
								{#each userAddresses[user._id] as address}
									<div class={`p-2.5 rounded-lg border ${address.isDefault ? 'bg-orange-50 border-orange-300' : 'bg-white border-gray-200'}`}>
										<div class="flex items-start gap-3">
											<div class="flex-1 min-w-0">
												<div class="flex items-center gap-2 flex-wrap mb-0.5">
													{#if address.isDefault}
														<span class="text-xs font-semibold px-2 py-0.5 rounded-full bg-orange-100 text-orange-700">🏠 Default</span>
													{/if}
													{#if address.label && address.label !== 'none'}
														<span class="text-xs font-medium px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 uppercase">{address.label}</span>
													{/if}
												</div>
												<div class="flex items-center gap-2 flex-wrap text-sm">
													<span class="font-medium text-gray-900 truncate">{address.street}</span>
													{#if address.cityStateZip}<span class="text-gray-600">· {address.cityStateZip}</span>{/if}
												</div>
												<div class="text-center text-[10px] text-gray-400 mt-0.5">
													{#if address.createdAt}Created: {formatDate(address.createdAt)}{/if}
													{#if address.createdAt && address.lastUsedAt} · {/if}
													{#if address.lastUsedAt}Used: {formatDate(address.lastUsedAt)}{/if}
												</div>
											</div>
											<div class="flex-shrink-0 flex flex-col items-end gap-0.5 text-right">
												{#if address.gateCode}<span class="text-xs text-gray-500">🔐 {address.gateCode}</span>{/if}
												{#if address.deliveryPreference}<span class="text-xs text-gray-500">📦 {address.deliveryPreference.replace('_', ' ')}</span>{/if}
												{#if address.latitude && address.longitude}<span class="text-xs text-gray-400">🌍 {address.latitude.toFixed(4)}, {address.longitude.toFixed(4)}</span>{/if}
												{#if address.isGifting}<span class="text-xs text-gray-500">🎁 Gifting</span>{/if}
												{#if address.deliveryInstructions}<span class="text-xs text-gray-500 truncate max-w-[160px]" title={address.deliveryInstructions}>📝 {address.deliveryInstructions}</span>{/if}
												{#if address.addressType}<span class="text-xs text-gray-500 capitalize">{address.addressType}</span>{/if}
											</div>
										</div>
									</div>
								{/each}
							</div>
				{/if}
			</div>

					<!-- Verification Photos Section -->
					<div onclick={(e) => e.stopPropagation()} class="border-t border-gray-100 mt-4 pt-4">
						<p class="text-xs font-medium text-black mb-3">📸 Verification Photos</p>
						<div class="grid grid-cols-3 gap-3">
							{#if user.verificationPhotos?.front}
								<div onclick={() => openImageModal(
									[user.verificationPhotos.front, user.verificationPhotos.left, user.verificationPhotos.right].filter(Boolean),
									['Front', 'Left Profile', 'Right Profile'].filter((_, i) => [user.verificationPhotos.front, user.verificationPhotos.left, user.verificationPhotos.right][i])
								)} class="cursor-pointer hover:opacity-80 transition-opacity">
									<p class="text-xs text-gray-500 mb-1">Front</p>
									<img src={user.verificationPhotos.front} alt="Front" class="w-full h-24 object-contain rounded-lg border border-gray-200" loading="lazy" />
								</div>
							{/if}
							{#if user.verificationPhotos?.left}
								<div onclick={() => openImageModal(
									[user.verificationPhotos.front, user.verificationPhotos.left, user.verificationPhotos.right].filter(Boolean),
									['Front', 'Left Profile', 'Right Profile'].filter((_, i) => [user.verificationPhotos.front, user.verificationPhotos.left, user.verificationPhotos.right][i])
								)} class="cursor-pointer hover:opacity-80 transition-opacity">
									<p class="text-xs text-gray-500 mb-1">Left Profile</p>
									<img src={user.verificationPhotos.left} alt="Left" class="w-full h-24 object-contain rounded-lg border border-gray-200" loading="lazy" />
								</div>
							{/if}
							{#if user.verificationPhotos?.right}
								<div onclick={() => openImageModal(
									[user.verificationPhotos.front, user.verificationPhotos.left, user.verificationPhotos.right].filter(Boolean),
									['Front', 'Left Profile', 'Right Profile'].filter((_, i) => [user.verificationPhotos.front, user.verificationPhotos.left, user.verificationPhotos.right][i])
								)} class="cursor-pointer hover:opacity-80 transition-opacity">
									<p class="text-xs text-gray-500 mb-1">Right Profile</p>
									<img src={user.verificationPhotos.right} alt="Right" class="w-full h-24 object-contain rounded-lg border border-gray-200" loading="lazy" />
								</div>
							{/if}
						</div>
					</div>

					<!-- Account Status Segmented Control -->
					<div onclick={(e) => e.stopPropagation()} class="border-t border-gray-100 mt-4 pt-4">
						<p class="text-xs font-medium text-black  mb-2">Account Status</p>
						<div class="inline-flex rounded-lg border border-gray-200 bg-gray-50 p-1">
							{#each [
								{ id: 'active', label: 'Active' },
								{ id: 'account_under_review', label: 'Account Under Review' },
								{ id: 'deactivated', label: 'Deactivated' }
							] as status}
								<button
									type="button"
									onclick={() => updateUserStatus(user._id, status.id)}
									disabled={updatingStatusUserId === user._id}
									class={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
										userStatuses[user._id] === status.id
											? status.id === 'active' ? 'bg-green-500 text-white' : status.id === 'account_under_review' ? 'bg-amber-500 text-white' : 'bg-red-500 text-white'
											: 'text-gray-500 hover:text-gray-700'
									} ${updatingStatusUserId === user._id ? 'opacity-50 cursor-not-allowed' : ''}`}
								>
									{status.label}
								</button>
							{/each}
						</div>
					</div>

					<!-- Delete User Section -->
					<div onclick={(e) => e.stopPropagation()} class="border-t border-gray-100 mt-4 pt-4 flex items-center justify-between">
						<div>
							<p class="text-xs font-semibold text-red-700">⚠️ Delete User</p>
							<p class="text-xs text-red-500 mt-0.5">Permanently removes all user data</p>
						</div>
						<button 
							onclick={() => deleteUser(user._id, idx)} 
							disabled={deletingUserId === user._id}
							class="bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white p-2 rounded-lg transition flex items-center justify-center">
							{#if deletingUserId === user._id}
								<svg class="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
									<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
									<path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
								</svg>
							{:else}
								<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
								</svg>
							{/if}
						</button>
					</div>
				{/if}
			</div>
		{/each}
	</div>
</main>

<div class="text-center text-xs text-gray-400 py-6 border-t border-gray-100 mt-8">
	UDO Admin · Users · Backend at <code class="bg-gray-100 px-1 rounded">localhost:3030</code>
</div>

	{#if imageModalOpen}
		<div class="fixed inset-0 z-[110] flex items-center justify-center bg-black/80" onclick={(e) => { if (e.target === e.currentTarget) closeModal(); }}>
			<div class="relative flex flex-col items-center max-w-[90vw] max-h-[90vh]">
				<button onclick={closeModal} class="absolute -top-10 right-0 text-white/70 hover:text-white text-2xl transition">✕</button>
				{#if currentImages.length > 1}
					<button onclick={prevImage} class="absolute left-4 top-1/2 -translate-y-1/2 text-white/70 hover:text-white text-4xl transition p-2 -ml-6">‹</button>
					<button onclick={nextImage} class="absolute right-4 top-1/2 -translate-y-1/2 text-white/70 hover:text-white text-4xl transition p-2 -mr-6">›</button>
				{/if}
				<img src={currentImages[imageModalIndex]} alt={currentLabels[imageModalIndex]} class="max-w-full max-h-[85vh] object-contain rounded-lg" />
				<p class="text-white/80 text-sm mt-3 font-medium">{currentLabels[imageModalIndex]}</p>
				<p class="text-white/50 text-xs mt-1">{imageModalIndex + 1} / {currentImages.length}</p>
			</div>
		</div>
	{/if}

	{#if toast}
	<div class={`fixed top-5 right-5 z-[100] flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg border transition-all ${toast.type === 'error' ? 'bg-red-50 border-red-200' : 'bg-green-50 border-green-200'}`}>
		<span class="text-xl">{toast.type === 'error' ? '⚠️' : '✅'}</span>
		<p class={`text-sm font-medium ${toast.type === 'error' ? 'text-red-700' : 'text-green-700'}`}>{toast.text}</p>
		<button onclick={() => (toast = null)} class="text-current opacity-50 hover:opacity-100 ml-1">✕</button>
	</div>
{/if}
