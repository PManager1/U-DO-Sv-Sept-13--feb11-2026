<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import tokenManager from '$lib/tokenManager';
	import API_BASE from '$lib/api';
	import { openSignIn } from '$lib/authModal.svelte';

	let toast = $state<{ show: boolean; message: string; type: string }>({ show: false, message: '', type: 'success' });
	let deleteModal = $state(false);
	let deleteConfirm = $state('');

	$effect(() => {
		if (!deleteModal) return;
		const onKey = (e: KeyboardEvent) => {
			if (e.key === 'Escape') deleteModal = false;
		};
		window.addEventListener('keydown', onKey);
		return () => window.removeEventListener('keydown', onKey);
	});
	let sections = $state({ account: true, security: true, notifications: true, privacy: true, language: true });

	let firstName = $state('');
	let lastName = $state('');
	let email = $state('');
	let phone = $state('');
	
	let homeAddress = $state('');
	let location = $state('');
	let profileImage = $state('');
	let about = $state('');
	let handle = $state('');
	let service = $state('');
	let yearsExperience = $state('');
	let flatFee = $state('');
	let hourlyRate = $state('');
	let rating = $state<number | null>(null);
	let reviewsCount = $state(0);
	let badges = $state<string[]>([]);
	let isVerified = $state(false);
	let profileLoading = $state(true);
	let notLoggedIn = $state(false);

	onMount(() => {
		loadProfile();
		loadPreferences();
	});

	async function loadProfile() {
		const headers = tokenManager.getHeaders();
		if (!headers.Authorization) {
			profileLoading = false;
			notLoggedIn = true;
			return;
		}
		try {
			const response = await fetch(API_BASE + 'me', { headers });
			if (response.status === 401 || response.status === 403) {
				notLoggedIn = true;
				profileLoading = false;
				return;
			}
			if (!response.ok) throw new Error('Failed to load profile');
			const data = await response.json();
			
			
			// const user = data.user || data;
			// if (user.firstName) firstName = user.firstName;
			// if (user.lastName) lastName = user.lastName;
			// if (user.email) email = user.email;
			// if (user.phoneNumber) phone = user.phoneNumber;

			const user = data.user || data;
            if (user.firstName || user.first_name) firstName = user.firstName || user.first_name;
            if (user.lastName || user.last_name) lastName = user.lastName || user.last_name;
            if (user.email) email = user.email;
            if (user.phoneNumber || user.phone_number) phone = user.phoneNumber || user.phone_number;
            if (user.homeAddress || user.home_address) homeAddress = user.homeAddress || user.home_address;

			const sp = data.serviceProfile;
			const pd = sp?.providerDetails || {};
			if (pd.profileImage) profileImage = pd.profileImage;
			if (pd.about) about = pd.about;
			if (pd.handle) handle = pd.handle;
			if (pd.service) service = pd.service;
			if (pd.yearsExperience) yearsExperience = pd.yearsExperience;
			if (pd.flatFee) flatFee = pd.flatFee;
			if (pd.hourlyRate) hourlyRate = pd.hourlyRate;
			if (typeof pd.rating === 'number') rating = pd.rating;
			if (typeof pd.reviewsCount === 'number') reviewsCount = pd.reviewsCount;
			if (Array.isArray(pd.badges)) badges = pd.badges.filter(Boolean);
			if (typeof pd.isVerified === 'boolean') isVerified = pd.isVerified;
		} catch (error) {
			console.error('Error loading profile:', error);
			notLoggedIn = true;
		} finally {
			profileLoading = false;
		}
	}

	async function loadPreferences() {
		const headers = tokenManager.getHeaders();
		if (!headers.Authorization) return;
		try {
			const res = await fetch(API_BASE + 'userPreferences', { headers });
			if (!res.ok) return;
			const data = await res.json();
			const p = data.preferences || {};
			if (p.language) language = p.language;
			if (p.currency) currency = p.currency;
			if (p.timeZone) timeZone = p.timeZone;
			if (p.notifications && typeof p.notifications === 'object') {
				notifItems = notifItems.map((item) => ({ ...item, checked: !!p.notifications[item.key] }));
			}
			if (p.privacy && typeof p.privacy === 'object') {
				privacyItems = privacyItems.map((item) => ({ ...item, checked: !!p.privacy[item.key] }));
			}
		} catch (err) {
			console.error('Error loading preferences:', err);
		}
	}

	function showToast(message: string, type = 'success') {
		toast = { show: true, message, type };
		setTimeout(() => (toast = { show: false, message: '', type: 'success' }), 3000);
	}

	function toggleSection(name: keyof typeof sections) {
		sections = { ...sections, [name]: !sections[name] };
	}

	async function handleLogout() {
		if (confirm('Log out of this account?')) {
			tokenManager.clearAllTokens();
			try {
				const { supabase } = await import('$lib/supabase');
				await supabase.auth.signOut();
			} catch {
				// Supabase not configured — fall back to backend token clear only
			}
			await goto('/login/');
		}
	}

	async function saveSettings(section: string) {
		const headers = tokenManager.getHeaders();
		if (!headers.Authorization) {
			showToast('Please log in to save changes', 'error');
			return;
		}
		try {
			let url = '';
			let method = 'PATCH';
			let body: any = {};
			if (section === 'account') {
				url = 'meProfile';
				body = { firstName, lastName, email, phoneNumber: cleanPhoneForSave(phone), homeAddress: location };
			} else if (section === 'notifications') {
				url = 'userPreferences';
				body = { notifications: Object.fromEntries(notifItems.map((n) => [n.key, n.checked])) };
			} else if (section === 'privacy') {
				url = 'userPreferences';
				body = { privacy: Object.fromEntries(privacyItems.map((p) => [p.key, p.checked])) };
			} else if (section === 'language') {
				url = 'userPreferences';
				body = { language, currency, timeZone };
			}
			const response = await fetch(API_BASE + url, { method, headers, body: JSON.stringify(body) });
			if (!response.ok) {
				const data = await response.json().catch(() => ({}));
				throw new Error(data.message || 'Failed to save');
			}
			const data = await response.json();
			const user = data.user || {};
			if (user.firstName) firstName = user.firstName;
			if (user.lastName) lastName = user.lastName;
			if (user.email) email = user.email;
			if (user.phoneNumber) phone = user.phoneNumber;
			showToast(section === 'account' ? 'Profile updated successfully!' : 'Settings saved successfully!');
		} catch (error: any) {
			console.error('Error saving settings:', error);
			showToast(error.message || 'Failed to save changes', 'error');
		}
	}

	function confirmDelete() {
		if (deleteConfirm === 'DELETE') {
			alert('Account deletion initiated. You will receive a confirmation email.');
			deleteModal = false;
			deleteConfirm = '';
		} else {
			alert('Please type "DELETE" to confirm account deletion.');
		}
	}

	// function formatPhoneDisplay(raw: string): string {
	// 	if (!raw) return '';
	// 	const digits = raw.replace(/\D/g, '');
	// 	const national = digits.length === 11 && digits.startsWith('1') ? digits.slice(1) : digits;
	// 	return '+' + '1' + national;
	// }

	// Use this exact function in both SignInModal.svelte and settings/+page.svelte
	function formatPhoneDisplay(raw: string): string {
		if (!raw) return '';
		const digits = raw.replace(/\D/g, '');
		if (digits.length < 10) return raw; // Return raw if invalid/too short
		return '+1' + digits.slice(-10);
	}

	function cleanPhoneForSave(raw: string): string {
		const digits = raw.replace(/\D/g, '');
		const national = digits.length === 11 && digits.startsWith('1') ? digits.slice(1) : digits;
		return '+' + '1' + national;
	}

	let notifItems = $state([
		{ key: 'email', title: 'Email Notifications', desc: 'Receive updates about your bookings via email', checked: true },
		{ key: 'push', title: 'Push Notifications', desc: 'Receive push notifications on your device', checked: true },
		{ key: 'sms', title: 'SMS Notifications', desc: 'Receive text messages for important updates', checked: false },
		{ key: 'marketing', title: 'Marketing Emails', desc: 'Receive special offers and promotions', checked: true }
	]);
	let privacyItems = $state([
		{ key: 'profileVisibility', title: 'Profile Visibility', desc: 'Make your profile visible to other users', checked: true },
		{ key: 'showLocation', title: 'Show Location', desc: 'Display your location on your profile', checked: true },
		{ key: 'allowMessages', title: 'Allow Messages', desc: 'Let other users send you messages', checked: true }
	]);

	let language = $state('en');
	let currency = $state('usd');
	let timeZone = $state('est');
</script>

<svelte:head><title>Settings · U-DO</title></svelte:head>

<div class="min-h-screen">
<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
	<div class="mb-8">
		<h1 class="text-4xl font-bold text-gray-900 mb-2">Settings</h1>
		<p class="text-gray-600 text-lg">Manage your account settings and preferences</p>
	</div>

	{#if notLoggedIn}
		<div class="mb-6 rounded-2xl border border-amber-200 bg-amber-50 p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
			<div>
				<p class="font-semibold text-amber-800">You're not signed in.</p>
				<p class="text-sm text-amber-700">Log in to view and manage your account information.</p>
			</div>
			<a href="/login/" onclick={(e) => { e.preventDefault(); openSignIn(); }} class="bg-orange-500 hover:bg-orange-600 text-white font-semibold px-5 py-2.5 rounded-lg transition-colors">Log in</a>
		</div>
	{/if}

	<div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
		<!-- Left Sidebar -->
		<div class="lg:col-span-1">
			<div class="bg-white rounded-2xl shadow-lg overflow-hidden sticky top-24">
				<div class="h-24 bg-gradient-to-r from-orange-400 to-orange-600"></div>
				<div class="px-6 pb-6">
					<div class="relative -mt-12 mb-4">
						<div class="w-24 h-24 rounded-full border-4 border-white shadow-lg overflow-hidden bg-orange-100 flex items-center justify-center">
							{#if profileImage}
								<img src={profileImage} alt="Profile" class="w-full h-full object-cover" />
							{:else}
								<svg class="w-12 h-12 text-gray-400" fill="currentColor" viewBox="0 0 24 24"><path d="M12 12a5 5 0 100-10 5 5 0 000 10zm0 2c-4 0-8 2-8 5v3h16v-3c0-3-4-5-8-5z" /></svg>
							{/if}
						</div>
					</div>
					<h2 class="text-xl font-bold text-gray-900 mb-1">{firstName || 'Not signed in'} {lastName}</h2>
					<p class="text-gray-500 mb-1">{email}</p>
					{#if phone}<p class="text-gray-500 mb-4">{formatPhoneDisplay(phone)}</p>{/if}
					<div class="grid grid-cols-3 gap-4 mb-6">
						<div class="text-center"><p class="text-2xl font-bold text-gray-900">{reviewsCount || 0}</p><p class="text-xs text-gray-500">Reviews</p></div>
						{#if typeof rating === 'number'}<div class="text-center"><p class="text-2xl font-bold text-gray-900">{rating.toFixed(1)}</p><p class="text-xs text-gray-500">Rating</p></div>{/if}
						<div class="text-center"><p class="text-2xl font-bold text-gray-900">{isVerified ? '✓' : '—'}</p><p class="text-xs text-gray-500">Verified</p></div>
					</div>
					{#if badges.length > 0}
						<div class="flex flex-wrap gap-1.5 mb-4">
							{#each badges as b, i}<span class="text-[11px] px-2 py-0.5 rounded-full bg-amber-50 text-amber-700">#{b}</span>{/each}
						</div>
					{/if}
					{#if about}<p class="text-sm text-gray-600 mb-4">{about}</p>{/if}
					{#if handle || service || yearsExperience || flatFee || hourlyRate}
						<div class="mb-4 space-y-1 text-sm text-gray-600">
							{#if handle}<p>@{handle}</p>{/if}
							{#if service}<p class="font-medium text-gray-800">{service}</p>{/if}
							{#if yearsExperience}<p>{yearsExperience} years experience</p>{/if}
							{#if flatFee}<p>Flat: {flatFee}</p>{/if}
							{#if hourlyRate}<p>Hourly: {hourlyRate}</p>{/if}
						</div>
					{/if}
					<div class="space-y-2">
						<button onclick={handleLogout} class="flex items-center gap-3 w-full px-4 py-3 rounded-xl hover:bg-red-50 transition-colors text-left">
							<svg class="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
							<span class="text-red-600 font-medium">Log out</span>
						</button>
					</div>
				</div>
			</div>
		</div>

		<!-- Right Column -->
		<div class="lg:col-span-2 space-y-6">
			<!-- Account Information -->
			<div class="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 hover:-translate-y-0.5 hover:shadow-lg transition-all">
				<div class="flex items-center justify-between mb-6 cursor-pointer" onclick={() => toggleSection('account')}>
					<div><h2 class="text-xl font-bold text-gray-900">Account Information</h2><p class="text-gray-500 text-sm">Update your personal details</p></div>
					<svg class={`w-6 h-6 transition-transform ${!sections.account ? '-rotate-90' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" /></svg>
				</div>
				{#if sections.account}
					<div class="space-y-4">
						<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
							<div><label class="block text-sm font-medium text-gray-700 mb-2">First Name</label><input type="text" bind:value={firstName} class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500" /></div>
							<div><label class="block text-sm font-medium text-gray-700 mb-2">Last Name</label><input type="text" bind:value={lastName} class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500" /></div>
						</div>
						<div><label class="block text-sm font-medium text-gray-700 mb-2">Email Address</label><input type="email" bind:value={email} class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500" /></div>
						<div><label class="block text-sm font-medium text-gray-700 mb-2">Phone Number</label><input type="tel" bind:value={phone} class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500" /></div>
						<button onclick={() => saveSettings('account')} class="bg-orange-500 hover:bg-orange-600 text-white font-semibold py-3 px-6 rounded-lg transition-colors">Save Changes</button>
					</div>
				{/if}
			</div>

			<!-- Security -->
			<div class="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 hover:-translate-y-0.5 hover:shadow-lg transition-all">
				<div class="flex items-center justify-between mb-6 cursor-pointer" onclick={() => toggleSection('security')}>
					<div><h2 class="text-xl font-bold text-gray-900">Security</h2><p class="text-gray-500 text-sm">Manage your password and security</p></div>
					<svg class={`w-6 h-6 transition-transform ${!sections.security ? '-rotate-90' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" /></svg>
				</div>
				{#if sections.security}
					<div class="space-y-4">
						<div><label class="block text-sm font-medium text-gray-700 mb-2">Current Password</label><input type="password" placeholder="Enter current password" class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500" /></div>
						<div><label class="block text-sm font-medium text-gray-700 mb-2">New Password</label><input type="password" placeholder="Enter new password" class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500" /></div>
						<div><label class="block text-sm font-medium text-gray-700 mb-2">Confirm New Password</label><input type="password" placeholder="Confirm new password" class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500" /></div>
						<button onclick={() => saveSettings('security')} class="bg-orange-500 hover:bg-orange-600 text-white font-semibold py-3 px-6 rounded-lg transition-colors">Update Password</button>
					</div>
				{/if}
			</div>

			<!-- Notifications -->
			<div class="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 hover:-translate-y-0.5 hover:shadow-lg transition-all">
				<div class="flex items-center justify-between mb-6 cursor-pointer" onclick={() => toggleSection('notifications')}>
					<div><h2 class="text-xl font-bold text-gray-900">Notifications</h2><p class="text-gray-500 text-sm">Choose what notifications you receive</p></div>
					<svg class={`w-6 h-6 transition-transform ${!sections.notifications ? '-rotate-90' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" /></svg>
				</div>
				{#if sections.notifications}
					<div class="space-y-4">
						{#each notifItems as item, i}
							<div class="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
								<div><h3 class="font-semibold text-gray-900">{item.title}</h3><p class="text-sm text-gray-500">{item.desc}</p></div>
								<label class="relative inline-flex items-center cursor-pointer">
									<input type="checkbox" bind:checked={notifItems[i].checked} class="sr-only peer" />
									<div class="w-11 h-6 bg-gray-300 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-orange-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-orange-500"></div>
								</label>
							</div>
						{/each}
						<button onclick={() => saveSettings('notifications')} class="bg-orange-500 hover:bg-orange-600 text-white font-semibold py-3 px-6 rounded-lg transition-colors">Save Changes</button>
					</div>
				{/if}
			</div>

			<!-- Privacy -->
			<div class="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 hover:-translate-y-0.5 hover:shadow-lg transition-all">
				<div class="flex items-center justify-between mb-6 cursor-pointer" onclick={() => toggleSection('privacy')}>
					<div><h2 class="text-xl font-bold text-gray-900">Privacy</h2><p class="text-gray-500 text-sm">Control your privacy settings</p></div>
					<svg class={`w-6 h-6 transition-transform ${!sections.privacy ? '-rotate-90' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" /></svg>
				</div>
				{#if sections.privacy}
					<div class="space-y-4">
						{#each privacyItems as item, i}
							<div class="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
								<div><h3 class="font-semibold text-gray-900">{item.title}</h3><p class="text-sm text-gray-500">{item.desc}</p></div>
								<label class="relative inline-flex items-center cursor-pointer">
									<input type="checkbox" bind:checked={privacyItems[i].checked} class="sr-only peer" />
									<div class="w-11 h-6 bg-gray-300 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-orange-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-orange-500"></div>
								</label>
							</div>
						{/each}
						<button onclick={() => saveSettings('privacy')} class="bg-orange-500 hover:bg-orange-600 text-white font-semibold py-3 px-6 rounded-lg transition-colors">Save Changes</button>
					</div>
				{/if}
			</div>

			<!-- Language & Region -->
			<div class="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 hover:-translate-y-0.5 hover:shadow-lg transition-all">
				<div class="flex items-center justify-between mb-6 cursor-pointer" onclick={() => toggleSection('language')}>
					<div><h2 class="text-xl font-bold text-gray-900">Language & Region</h2><p class="text-gray-500 text-sm">Set your language and regional preferences</p></div>
					<svg class={`w-6 h-6 transition-transform ${!sections.language ? '-rotate-90' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" /></svg>
				</div>
				{#if sections.language}
					<div class="space-y-4">
						<div><label class="block text-sm font-medium text-gray-700 mb-2">Language</label>
							<select bind:value={language} class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"><option value="en">English</option><option value="es">Español</option><option value="fr">Français</option><option value="de">Deutsch</option></select>
						</div>
						<button onclick={() => saveSettings('language')} class="bg-orange-500 hover:bg-orange-600 text-white font-semibold py-3 px-6 rounded-lg transition-colors">Save Preferences</button>
					</div>
				{/if}
			</div>

			<!-- Delete Account -->
			<div class="bg-white rounded-2xl shadow-sm border border-red-200 p-6 hover:-translate-y-0.5 hover:shadow-lg transition-all">
				<div class="mb-6"><h2 class="text-xl font-bold text-red-600">Delete Account</h2><p class="text-gray-500 text-sm">Permanently delete your account and data</p></div>
				<div class="space-y-4">
					<p class="text-gray-700">Warning: This action cannot be undone. All your data will be permanently deleted.</p>
					<button onclick={() => (deleteModal = true)} class="bg-red-500 hover:bg-red-600 text-white font-semibold py-3 px-6 rounded-lg transition-colors">Delete My Account</button>
				</div>
				</div>
			</div>
		</div>
	</div>

{#if deleteModal}
	<div class="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onclick={(e) => { if (e.target === e.currentTarget) deleteModal = false; }}>
		<div class="bg-white rounded-2xl max-w-md w-full p-6">
			<div class="mb-4">
				<div class="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
					<svg class="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
				</div>
				<h3 class="text-2xl font-bold text-gray-900 text-center mb-2">Delete Account?</h3>
				<p class="text-gray-600 text-center">Are you sure? This action cannot be undone.</p>
			</div>
			<div class="mb-4">
				<label class="block text-sm font-medium text-gray-700 mb-2">Type "DELETE" to confirm</label>
				<input type="text" bind:value={deleteConfirm} placeholder="DELETE" class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500" />
			</div>
			<div class="flex gap-3">
				<button onclick={() => (deleteModal = false)} class="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold py-3 rounded-lg transition-colors">Cancel</button>
				<button onclick={confirmDelete} class="flex-1 bg-red-500 hover:bg-red-600 text-white font-semibold py-3 rounded-lg transition-colors">Delete Account</button>
			</div>
		</div>
	</div>
{/if}

{#if toast.show}
	<div class={`fixed bottom-4 right-4 ${toast.type === 'error' ? 'bg-red-500' : 'bg-green-500'} text-white px-6 py-4 rounded-xl shadow-lg z-50 flex items-center gap-3`}>
		<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" /></svg>
		<span>{toast.message}</span>
	</div>
{/if}

<footer class="bg-[#b0b0a8] text-gray-800 mt-16">
	<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
		<div class="border-t border-gray-400 pt-8 flex flex-col md:flex-row justify-between items-center">
			<p class="text-gray-700 text-sm mb-4 md:mb-0">© 2026 U-DO, Inc. All rights reserved.</p>
			<a href="/" class="text-gray-600 hover:text-orange-500 transition font-medium">Back to Home</a>
		</div>
	</div>
</footer>
</div>
