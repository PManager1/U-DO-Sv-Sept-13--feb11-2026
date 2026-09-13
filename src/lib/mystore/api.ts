import API_BASE from '$lib/api';
import tokenManager from '$lib/tokenManager';

const REST_BASE = `${API_BASE}rest`;

async function fetchAPI(endpoint: string, options: RequestInit = {}) {
	const headers = { ...tokenManager.getHeaders(), ...(options.headers || {}) };
	const fetchOptions = { ...options, headers };

	let finalEndpoint = endpoint;
	if (typeof localStorage !== 'undefined' && localStorage.getItem('adminMode') === 'true') {
		const targetId = localStorage.getItem('adminTargetUserId');
		if (targetId && endpoint.includes('/rest/')) {
			const sep = endpoint.includes('?') ? '&' : '?';
			finalEndpoint = `${endpoint}${sep}userId=${targetId}`;
		}
	}

	const response = await fetch(finalEndpoint, fetchOptions);
	if (!response.ok) {
		if (response.status === 401) throw new Error('Unauthorized');
		if (response.status === 403) throw new Error('Forbidden');
		if (response.status === 404) throw new Error('Not Found');
		let errorMessage = 'API request failed';
		try {
			const errorData = await response.json();
			errorMessage = errorData.message || errorData.error || errorMessage;
		} catch {}
		throw new Error(errorMessage);
	}
	return response.json();
}

export async function getCategories() {
	const data = await fetchAPI(`${REST_BASE}/categories`, { method: 'GET' });
	return data.categories || data || [];
}
export async function createCategory(categoryData: any) {
	return fetchAPI(`${REST_BASE}/categories`, { method: 'POST', body: JSON.stringify(categoryData) });
}
export async function updateCategory(id: string, updates: any) {
	return fetchAPI(`${REST_BASE}/categories/${id}`, { method: 'PUT', body: JSON.stringify(updates) });
}
export async function deleteCategory(id: string) {
	await fetchAPI(`${REST_BASE}/categories/${id}`, { method: 'DELETE' });
	return true;
}

export async function getItems() {
	const data = await fetchAPI(`${REST_BASE}/items`, { method: 'GET' });
	return data.items || data || [];
}
export async function getItemsByCategory(categoryId: string) {
	const data = await fetchAPI(`${REST_BASE}/items?category_id=${categoryId}`, { method: 'GET' });
	return data.items || data || [];
}
export async function createItem(itemData: any) {
	return fetchAPI(`${REST_BASE}/items`, { method: 'POST', body: JSON.stringify(itemData) });
}
export async function updateItem(id: string, updates: any) {
	return fetchAPI(`${REST_BASE}/items/${id}`, { method: 'PUT', body: JSON.stringify(updates) });
}
export async function deleteItem(id: string) {
	await fetchAPI(`${REST_BASE}/items/${id}`, { method: 'DELETE' });
	return true;
}
export async function toggleItemAvailability(id: string) {
	return fetchAPI(`${REST_BASE}/items/${id}/availability`, { method: 'PUT' });
}

export async function getModifierTemplates() {
	const data = await fetchAPI(`${REST_BASE}/modifier-templates`, { method: 'GET' });
	return data || [];
}
export async function getModifierGroups() {
	const data = await fetchAPI(`${REST_BASE}/modifier-groups`, { method: 'GET' });
	return data.modifierGroups || data.modifier_groups || data || [];
}
export async function createModifierGroup(groupData: any) {
	return fetchAPI(`${REST_BASE}/modifier-groups`, { method: 'POST', body: JSON.stringify(groupData) });
}
export async function updateModifierGroup(id: string, updates: any) {
	return fetchAPI(`${REST_BASE}/modifier-groups/${id}`, { method: 'PUT', body: JSON.stringify(updates) });
}
export async function deleteModifierGroup(id: string) {
	await fetchAPI(`${REST_BASE}/modifier-groups/${id}`, { method: 'DELETE' });
	return true;
}

export async function getFoodCategories() {
	try {
		const data = await fetchAPI(`${API_BASE}food-categories`, { method: 'GET' });
		return data || [];
	} catch {
		return [];
	}
}

export async function getProfile() {
	return fetchAPI(`${REST_BASE}/profile`, { method: 'GET' });
}
export async function updateProfile(profileData: any) {
	return fetchAPI(`${REST_BASE}/profile`, { method: 'PUT', body: JSON.stringify(profileData) });
}
export async function patchProfile(partialData: any) {
	const current = await getProfile();
	const merged = { ...current, ...partialData };
	return fetchAPI(`${REST_BASE}/profile`, { method: 'PUT', body: JSON.stringify(merged) });
}

export async function uploadImageToGCS(file: File) {
	const formData = new FormData();
	formData.append('image', file);
	const token = tokenManager.getToken();
	const response = await fetch(`${API_BASE}upload/image`, {
		method: 'POST',
		headers: { Authorization: `Bearer ${token}` },
		body: formData
	});
	if (!response.ok) {
		const errorBody = await response.text();
		throw new Error(`Image upload failed (${response.status}): ${errorBody}`);
	}
	const data = await response.json();
	return data.url;
}

export async function healthCheck() {
	try {
		await fetchAPI(`${API_BASE}health`, { method: 'GET' });
		return true;
	} catch {
		return false;
	}
}

export async function getOrders(status?: string) {
	const query = status ? `?status=${status}` : '';
	const data = await fetchAPI(`${REST_BASE}/orders${query}`, { method: 'GET' });
	return Array.isArray(data) ? data : [];
}
export async function updateOrderStatus(orderId: string, status: string) {
	return fetchAPI(`${REST_BASE}/orders/${orderId}/status`, { method: 'PUT', body: JSON.stringify({ status }) });
}

export async function uploadMenu(file: File) {
	const formData = new FormData();
	formData.append('menuFile', file);
	const token = tokenManager.getToken();
	const res = await fetch(`${REST_BASE}/upload-menu`, {
		method: 'POST',
		headers: { Authorization: `Bearer ${token}` },
		body: formData
	});
	if (!res.ok) throw new Error('Upload failed: ' + res.status);
	return res.json();
}

export async function handleSignOut() {
	tokenManager.clearAllTokens();
	localStorage.setItem('udo-signed-out', 'true');
	try {
		const { supabase } = await import('$lib/supabase');
		await supabase.auth.signOut();
	} catch {
		// Supabase not configured — fall back to backend token clear only
	}
	await import('$app/navigation').then(({ goto }) => goto('/login'));
}
