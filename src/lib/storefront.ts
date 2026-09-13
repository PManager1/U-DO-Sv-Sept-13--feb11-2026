import API_BASE from './api';
import tokenManager from './tokenManager';

export function mapBrandToCard(b: any) {
	return {
		id: b.id || b._id,
		name: b.name || 'Unknown',
		logo: b.logoUrl || b.bannerUrl || '',
		type: 'grocery',
		brandType: 'grocery',
		rating: b.rating || 4.5,
		reviewCount: 100,
		eta: '20-35 min',
		deliveryFee: '$0 Delivery Fee',
		badges: Array.isArray(b.tags) ? b.tags.slice(0, 2) : [],
		tags: Array.isArray(b.tags) ? b.tags : []
	};
}

export async function fetchGroceryBrands(address?: string): Promise<any[]> {
	const params = address ? '?address=' + encodeURIComponent(address) : '';
	try {
		const res = await fetch(API_BASE + 'brands/grocery/nearby' + params);
		if (res.ok) {
			const data = await res.json();
			if (Array.isArray(data)) return data.map(mapBrandToCard);
		}
	} catch {
		/* fall through */
	}
	try {
		const headers = tokenManager.getHeaders();
		const res = await fetch(API_BASE + 'brands?type=grocery', { headers });
		if (res.ok) {
			const data = await res.json();
			if (Array.isArray(data)) return data.map(mapBrandToCard);
		}
	} catch {
		/* ignore */
	}
	return [];
}

export function recordBrandVisit(store: any) {
	if (typeof window === 'undefined') return;
	const headers = tokenManager.getHeaders();
	if (!headers.Authorization || !store?.id) return;
	fetch(API_BASE + 'users/recently-visited-brands', {
		method: 'POST',
		headers,
		body: JSON.stringify({
			brandId: store.id,
			brandName: store.name || 'Unknown',
			logoUrl: store.logo || store.image || '',
			tags: Array.isArray(store.tags) ? store.tags : [],
			brandType: store.brandType || store.type || '',
			type: store.type || store.brandType || ''
		})
	}).catch(() => {});
}

export async function fetchStoreById(storeId: string) {
	try {
		const res = await fetch(API_BASE + 'brands/' + storeId);
		if (!res.ok) return { store: null };
		const brand = await res.json();
		const tags = brand.tags || [];
		return {
			store: {
				id: brand.id || brand._id,
				name: brand.name || 'Unknown',
				image: brand.carouselImages?.[0] || brand.logoUrl || brand.bannerUrl || '',
				banner: brand.bannerUrl || brand.carouselImages?.[0] || '',
				bannerCrop: brand.bannerCrop || null,
				logo: brand.logoUrl || '',
				rating: brand.rating || 4.5,
				reviewCount: 100,
				eta: '20-35 min',
				deliveryFee: '$0 Delivery Fee',
				tags: tags.slice(0, 3),
				brandType: brand.brandType || brand.type || '',
				hours: brand.hours || [],
				address: brand.address || [brand.addressLine1, brand.city, brand.state].filter(Boolean).join(', ') || ''
			}
		};
	} catch {
		return { store: null };
	}
}

export async function fetchStoreNav(storeId: string) {
	try {
		const res = await fetch(API_BASE + 'brands/' + storeId + '/category-tree/json');
		if (!res.ok) return { nav: [] };
		const data = await res.json();
		return { nav: Array.isArray(data) ? data : [] };
	} catch {
		return { nav: [] };
	}
}

export async function fetchStoreMenu(storeId: string, isGrocery: boolean) {
	if (isGrocery) {
		try {
			const res = await fetch(API_BASE + 'brands/' + storeId + '/aisles');
			if (!res.ok) return { menu: [] };
			const data = await res.json();
			if (Array.isArray(data.aisles) && data.aisles.length > 0) return { menu: data.aisles };
			return { menu: [] };
		} catch {
			return { menu: [] };
		}
	}
	try {
		const res = await fetch(API_BASE + 'brands/' + storeId + '/menuOnline');
		if (!res.ok) {
			const res2 = await fetch(API_BASE + 'brands/' + storeId + '/menu');
			if (!res2.ok) return { menu: [] };
			const data = await res2.json();
			return { menu: data.categories || data.menu || [] };
		}
		const data = await res.json();
		return { menu: data.menu || data.categories || [] };
	} catch {
		return { menu: [] };
	}
}
