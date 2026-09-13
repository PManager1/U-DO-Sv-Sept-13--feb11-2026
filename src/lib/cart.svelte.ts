import API_BASE from './api';
import tokenManager from './tokenManager';

export const cart = $state<{
	items: any[];
	storeId: string;
	storeName: string;
	storeLogo: string;
	brandId: string;
	brandName: string;
	isLoggedIn: boolean;
	userId: string;
	activeStoreId: string;
	otherCarts: Record<
		string,
		{ brandId: string; brandName: string; brandLogo: string; items: any[] }
	>;
	loaded: boolean;
}>({
	items: [],
	storeId: '',
	storeName: '',
	storeLogo: '',
	brandId: '',
	brandName: '',
	isLoggedIn: typeof window !== 'undefined' && tokenManager.hasValidToken(),
	userId: '',
	activeStoreId: '',
	otherCarts: {},
	loaded: false
});

let saveTimer: ReturnType<typeof setTimeout> | null = null;
let userPromise: Promise<string | null> | null = null;

// ── serializers ──────────────────────────────────────────────────────────
// Convert an in-memory cart item into the backend API shape.
function toApiItem(i: any) {
	return {
		productId: i.productId || '',
		sku: i.sku || '',
		name: i.name || '',
		price: Number(i.price) || 0,
		quantity: i.quantity || 1,
		aisle: i.aisle || '',
		image: i.image || (Array.isArray(i.images) && i.images[0]) || '',
		images: Array.isArray(i.images) ? i.images.filter(Boolean).slice(0, 4) : [],
		note: i.note || '',
		replacements: Array.isArray(i.replacements) ? i.replacements : []
	};
}

// Convert a backend API item (or other-cart stored item) into the in-memory shape.
function fromApiItem(i: any) {
	const images = Array.isArray(i.images) ? i.images.filter(Boolean).slice(0, 4) : [];
	return {
		productId: i.productId || i.id,
		name: i.name || i.nameSnapshot || '',
		price: Number(i.pricePaid ?? i.price) || 0,
		image: i.image || i.raw_image_url || images[0] || '',
		...(images.length ? { images } : {}),
		quantity: i.quantity || 1,
		...(i.note !== undefined ? { note: i.note } : {}),
		...(Array.isArray(i.replacements) ? { replacements: i.replacements } : {}),
		...(i.sku !== undefined ? { sku: i.sku } : {}),
		...(i.aisle !== undefined ? { aisle: i.aisle } : {})
	};
}

// Extracts up to 4 distinct image URLs from a grocery menu item.
export function extractImages(item: any): string[] {
	const urls: string[] = [];
	if (Array.isArray(item?.images)) {
		for (const img of item.images) {
			if (img?.url && !urls.includes(img.url)) urls.push(img.url);
			if (urls.length >= 4) break;
		}
	}
	if (item?.raw_image_url && !urls.includes(item.raw_image_url)) urls.push(item.raw_image_url);
	return urls.slice(0, 4);
}

// ── identity ──────────────────────────────────────────────────────────────
// Resolve the authenticated user id (and whether logged in). Safe to call
// multiple times — the /me fetch is performed at most once per session.
async function ensureUser(): Promise<string | null> {
	if (cart.userId) return cart.userId;
	if (!tokenManager.hasValidToken()) {
		cart.isLoggedIn = false;
		return null;
	}
	if (!userPromise) {
		userPromise = (async () => {
			try {
				const res = await fetch(API_BASE + 'me', { headers: tokenManager.getHeaders() });
				if (!res.ok) {
					cart.isLoggedIn = false;
					return null;
				}
				const data = await res.json();
				const u = data?.user || data;
				const id = u?.id || '';
				cart.userId = id;
				cart.isLoggedIn = !!id;
				return id || null;
			} catch {
				cart.isLoggedIn = false;
				return null;
			}
		})();
	}
	return userPromise;
}

// ── persistence ──────────────────────────────────────────────────────────
// Save a specific store's cart. The payload is fully bound to the arguments
// passed in, so a later store switch can never corrupt this save.
async function saveCartFor(storeId: string, storeName: string, storeLogo: string, items: any[]) {
	if (!storeId) return;
	// 👈 Log all incoming values to the browser console
    console.log('🛒 [saveCartFor] Saving cart values:', {
        storeId,
        storeName,
        storeLogo,
        itemsCount: items?.length,
        items
    });

	try {
		await fetch(API_BASE + 'carts/' + storeId, {
			method: 'PUT',
			headers: tokenManager.getHeaders(),
			body: JSON.stringify({
				brandName: storeName || '',
				brandLogo: storeLogo || '',
				items: items.map(toApiItem)
			})
		});
		cart.otherCarts[storeId] = {
			brandId: storeId,
			brandName: storeName || '',
			brandLogo: storeLogo || '',
			items: items.slice()
		};
	} catch (e) {
		console.error('Cart save failed', e);
	}
}

// Immediate, non-debounced save of the current active cart.
// Binds a snapshot into the closure so rapid store switches cannot post
// stale data to the wrong store document. The snapshot must be captured
// synchronously BEFORE any await, or a store switch that happens while the
// async auth resolves would save the wrong store's items.
export async function flushSave() {
	if (!cart.storeId) return;
	const snapshot = {
		storeId: cart.storeId,
		storeName: cart.storeName,
		storeLogo: cart.storeLogo,
		items: cart.items.map((i) => ({
			...i,
			...(Array.isArray(i.images) ? { images: i.images.slice() } : {}),
			...(Array.isArray(i.replacements) ? { replacements: i.replacements.slice() } : {})
		}))
	};
	if (saveTimer) {
		clearTimeout(saveTimer);
		saveTimer = null;
	}
	const uid = await ensureUser();
	if (!uid) return;
	await saveCartFor(snapshot.storeId, snapshot.storeName, snapshot.storeLogo, snapshot.items);
}

// Debounced auto-save (used after any mutation). Guests skip persistence.
function scheduleSave() {
	if (!cart.storeId) return;
	if (saveTimer) clearTimeout(saveTimer);
	saveTimer = setTimeout(() => {
		saveTimer = null;
		flushSave();
	}, 500);
}

// ── cart ops ─────────────────────────────────────────────────────────────
export function addToCart(store: any, item: any) {
	const productId = item.id || item.productId;
	if (!productId) return;

	const newStoreId = store?.id || '';
	const switchingStore = !!cart.storeId && !!newStoreId && cart.storeId !== newStoreId;

	if (switchingStore) {
		if (cart.isLoggedIn) {
			// Persist the outgoing store's cart first (payload scoped), then switch.
			flushSave();
			if (cart.items.length) {
				cart.otherCarts[cart.storeId] = {
					brandId: cart.storeId,
					brandName: cart.storeName,
					brandLogo: cart.storeLogo,
					items: cart.items.slice()
				};
			}
			// Load any saved cart for the target store.
			const saved = cart.otherCarts[newStoreId] || null;
			cart.items = (saved?.items || []).map(fromApiItem);
			delete cart.otherCarts[newStoreId];
			cart.storeId = newStoreId;
			cart.storeName = saved?.brandName || store?.name || '';
			cart.storeLogo = saved?.brandLogo || store?.logo || store?.image || '';
			cart.activeStoreId = newStoreId;
		} else {
			// Guest: preserve legacy single-store wipe behavior.
			cart.items = [];
			cart.storeId = newStoreId;
		}
	} else if (!newStoreId && cart.storeName && cart.storeName !== store?.name) {
		cart.items = [];
		cart.storeId = '';
	}

	if (newStoreId && !switchingStore) {
		cart.storeId = newStoreId || cart.storeId;
		cart.activeStoreId = newStoreId || cart.activeStoreId;
	}
	cart.storeName = store?.name || cart.storeName;
	cart.storeLogo = store?.logo || store?.image || cart.storeLogo;

	const images = Array.isArray(item.images) ? item.images.filter(Boolean).slice(0, 4) : [];
	const image = item.image || item.raw_image_url || images[0] || '';
	const existing = cart.items.find((i) => i.productId === productId);
	if (existing) {
		existing.quantity = (existing.quantity || 1) + 1;
		if (item.note !== undefined) existing.note = item.note;
		if (Array.isArray(item.replacements)) existing.replacements = item.replacements;
		if (item.sku !== undefined) existing.sku = item.sku;
		if (item.aisle !== undefined) existing.aisle = item.aisle;
		if (images.length) existing.images = images;
		if (image) existing.image = image;
	} else {
		cart.items = [
			...cart.items,
			{
				productId,
				name: item.name,
				price: Number(item.price) || 0,
				image,
				...(images.length ? { images } : {}),
				quantity: 1,
				...(item.note !== undefined ? { note: item.note } : {}),
				...(Array.isArray(item.replacements) ? { replacements: item.replacements } : {}),
				...(item.sku !== undefined ? { sku: item.sku } : {}),
				...(item.aisle !== undefined ? { aisle: item.aisle } : {})
			}
		];
	}
	if (cart.isLoggedIn) scheduleSave();
}

export function hydrateCart(items: any[]) {
	cart.items = items.map((i) => {
		const images = Array.isArray(i.images) ? i.images.filter(Boolean).slice(0, 4) : [];
		return {
			productId: i.productId || i.id,
			name: i.name,
			price: Number(i.price) || 0,
			image: i.image || i.raw_image_url || images[0] || '',
			...(images.length ? { images } : {}),
			quantity: i.quantity || 1,
			...(i.note !== undefined ? { note: i.note } : {}),
			...(Array.isArray(i.replacements) ? { replacements: i.replacements } : {}),
			...(i.sku !== undefined ? { sku: i.sku } : {}),
			...(i.aisle !== undefined ? { aisle: i.aisle } : {})
		};
	});
	cart.storeId = items[0]?.storeId || cart.storeId;
	cart.storeName = items[0]?.storeName || cart.storeName;
	cart.storeLogo = items[0]?.storeLogo || cart.storeLogo;
	cart.activeStoreId = cart.storeId;
	if (cart.storeId) delete cart.otherCarts[cart.storeId];
}

export function updateQuantity(productId: string, qty: number) {
	if (qty <= 0) {
		cart.items = cart.items.filter((i) => i.productId !== productId);
		if (cart.items.length === 0) {
			cart.storeName = '';
			cart.storeId = '';
			cart.activeStoreId = '';
		}
	} else {
		const item = cart.items.find((i) => i.productId === productId);
		if (item) item.quantity = qty;
	}
	if (cart.isLoggedIn) scheduleSave();
}

export function removeItem(productId: string) {
	cart.items = cart.items.filter((i) => i.productId !== productId);
	if (cart.items.length === 0) {
		cart.storeName = '';
		cart.storeId = '';
		cart.activeStoreId = '';
	}
	if (cart.isLoggedIn) scheduleSave();
}

export function setReplacements(productId: string, replacements: any[]) {
	const item = cart.items.find((i) => i.productId === productId);
	if (item) item.replacements = replacements;
	if (cart.isLoggedIn) scheduleSave();
}

export function removeReplacement(productId: string, repId: string) {
	const item = cart.items.find((i) => i.productId === productId);
	if (item && Array.isArray(item.replacements)) {
		item.replacements = item.replacements.filter((r: any) => r?.id !== repId);
	}
	if (cart.isLoggedIn) scheduleSave();
}

// Clear the active store's cart in memory and in the backend. Other stores
// remain intact.
export async function clearCart() {
	const storeId = cart.storeId;
	cart.items = [];
	cart.storeId = '';
	cart.storeName = '';
	cart.storeLogo = '';
	cart.activeStoreId = '';
	const uid = await ensureUser();
	if (uid && storeId) {
		try {
			await fetch(API_BASE + 'carts/' + storeId, {
				method: 'DELETE',
				headers: tokenManager.getHeaders()
			});
		} catch {
			/* ignore */
		}
		delete cart.otherCarts[storeId];
	}
}

// Clear only the active store's persisted cart after a successful checkout.
export async function clearActiveCartAfterCheckout() {
	await clearCart();
}

// Remove (clear) a specific store's cart — active or not.
export async function clearStoreCart(brandId: string) {
	const uid = await ensureUser();
	if (uid) {
		try {
			await fetch(API_BASE + 'carts/' + brandId, {
				method: 'DELETE',
				headers: tokenManager.getHeaders()
			});
		} catch {
			/* ignore */
		}
	}
	if (brandId === cart.storeId) {
		cart.items = [];
		cart.storeName = '';
		cart.storeId = '';
		cart.activeStoreId = '';
	} else {
		delete cart.otherCarts[brandId];
	}
}

// Load all persisted carts for the logged-in user into the "other carts"
// bucket and (if no active cart is set yet) select the most recent as active.
export async function loadUserCarts() {
	const uid = await ensureUser();
	if (!uid) return;
	try {
		const res = await fetch(API_BASE + 'carts', { headers: tokenManager.getHeaders() });
		if (!res.ok) return;
		const data = await res.json();
		const list: any[] = Array.isArray(data) ? data : data.carts || [];
		const others: Record<
			string,
			{ brandId: string; brandName: string; brandLogo: string; items: any[] }
		> = {};
		let mostRecent: string | null = null;
		let mostRecentTs = 0;
		for (const c of list) {
			const bid = c.brandId || '';
			if (!bid) continue;
			const items = (c.items || []).map((it: any) => fromApiItem({ ...it, storeId: bid }));
			const ts = c.updatedAt ? new Date(c.updatedAt).getTime() : 0;
			if (!mostRecentTs || ts >= mostRecentTs) {
				mostRecent = bid;
				mostRecentTs = ts;
			}
			if (bid !== cart.storeId) {
				others[bid] = {
					brandId: bid,
					brandName: c.brandName || '',
					brandLogo: c.brandLogo || '',
					items
				};
			} else if (!cart.items.length) {
				// Active store has no in-memory items yet — hydrate from server.
				cart.storeName = c.brandName || cart.storeName;
				cart.storeLogo = c.brandLogo || cart.storeLogo;
				cart.items = items;
			}
		}
		cart.otherCarts = others;
		// If no active cart and no page-context, default to most recent store.
		if (!cart.storeId && mostRecent) {
			const rec = list.find((c) => c.brandId === mostRecent);
			if (rec) {
				cart.storeId = mostRecent;
				cart.activeStoreId = mostRecent;
				cart.storeName = rec.brandName || '';
				cart.storeLogo = rec.brandLogo || '';
				cart.items = (rec.items || []).map((it: any) =>
					fromApiItem({ ...it, storeId: mostRecent })
				);
			}
		}
		// Never leave the active store in the "other carts" bucket (it would render
		// twice in the drawer). Covers both the page-context and mostRecent paths.
		if (cart.storeId) delete cart.otherCarts[cart.storeId];
		cart.loaded = true;
	} catch {
		/* ignore */
	}
}

// Switch the active store to `brandId` in place (no navigation). Used by the
// "Your Other Shopping Carts" section. The drawer then shows that store's cart.
export async function switchStoreCart(brandId: string) {
	const currentId = cart.storeId;
	if (currentId && currentId !== brandId) {
		await flushSave();
		if (cart.items.length) {
			cart.otherCarts[currentId] = {
				brandId: currentId,
				brandName: cart.storeName,
				brandLogo: cart.storeLogo,
				items: cart.items.slice()
			};
		}
	}
	const saved = cart.otherCarts[brandId] || null;
	cart.storeId = brandId;
	cart.activeStoreId = brandId;
	cart.storeName = saved?.brandName || cart.storeName;
	cart.storeLogo = saved?.brandLogo || cart.storeLogo;
	cart.items = (saved?.items || []).map(fromApiItem);
	delete cart.otherCarts[brandId];
}

// Called when visiting a store page — make that store active (loading its
// saved cart), so the drawer reflects the page you're browsing.
export async function setActiveStore(store: any) {
	const sid = store?.id || '';
	if (!sid) return;
	if (cart.storeId === sid) {
		cart.storeName = store?.name || cart.storeName;
		cart.storeLogo = store?.logo || store?.image || cart.storeLogo;
		cart.activeStoreId = sid;
		return;
	}
	const currentId = cart.storeId;
	if (currentId && cart.isLoggedIn) {
		await flushSave();
		if (cart.items.length) {
			cart.otherCarts[currentId] = {
				brandId: currentId,
				brandName: cart.storeName,
				brandLogo: cart.storeLogo,
				items: cart.items.slice()
			};
		}
	}
	const saved = cart.otherCarts[sid] || null;
	cart.storeId = sid;
	cart.activeStoreId = sid;
	cart.storeName = saved?.brandName || store?.name || '';
	cart.storeLogo = saved?.brandLogo || store?.logo || store?.image || '';
	cart.items = (saved?.items || []).map(fromApiItem);
	delete cart.otherCarts[sid];
}

export function totalItems() {
	return cart.items.reduce((s, i) => s + (i.quantity || 1), 0);
}

export function totalPrice() {
	return cart.items.reduce((s, i) => s + (Number(i.price) || 0) * (i.quantity || 1), 0);
}
