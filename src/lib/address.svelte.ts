import API_BASE from './api';
import tokenManager from './tokenManager';

export const deliveryAddress = $state({ value: '' });

let loaded = false;
let loadingPromise: Promise<void> | null = null;

export async function ensureAddressLoaded() {
	if (loaded) return;
	if (loadingPromise) return loadingPromise;
	loadingPromise = (async () => {
		try {
			const headers = tokenManager.getHeaders();
			if (!headers.Authorization) return;
			const res = await fetch(API_BASE + 'addresses', { headers });
			if (!res.ok) return;
			const data = await res.json();
			const list = Array.isArray(data) ? data : data.addresses || [];
			const defaultAddress = list.find((a: any) => a.isDefault || a.is_default);
			const activeAddress = defaultAddress || list[0];
			if (activeAddress) {
				deliveryAddress.value = activeAddress.street || '';
			}
		} catch {
			/* leave empty */
		} finally {
			loaded = true;
		}
	})();
	return loadingPromise;
}

export function setDeliveryAddress(address: string) {
	deliveryAddress.value = address;
}

export function reloadAddress() {
	loaded = false;
	loadingPromise = null;
	return ensureAddressLoaded();
}

export function shortAddress(address: string) {
	if (!address) return '';
	const first = address.split(',')[0].trim();
	const parts = first.split(/\s+/).filter(Boolean);
	return parts.slice(0, 2).join(' ');
}

export function touchAddress(id: string) {
	const headers = tokenManager.getHeaders();
	if (!headers.Authorization || !id) return;
	fetch(API_BASE + 'addresses/' + id + '/touch', { method: 'PUT', headers }).catch(() => {});
}
