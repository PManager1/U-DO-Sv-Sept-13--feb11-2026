
export function buildCartQuery(items: any[], storeId: string, storeName: string, storeLogo: string) {
	const params = new URLSearchParams();
	if (storeId) params.set('store', storeId);
	if (storeName) params.set('storeName', storeName);
	if (storeLogo) params.set('storeLogo', storeLogo);
	if (items?.length) {
		const payload = (items as any[]).map((i) => ({
			id: i.productId,
			q: i.quantity || 1,
			n: i.name || '',
			p: Number(i.price) || 0,
			img: (Array.isArray(i.images) && i.images.length ? i.images : i.image ? [i.image] : []).filter(Boolean).slice(0, 4),
			note: i.note || '',
			rep: Array.isArray(i.replacements) ? i.replacements : []
		}));
		params.set('items', JSON.stringify(payload));
	}
	return params.toString();
}


export function decodeCartItems(str: string | null): any[] | null {
	if (!str) return null;
	try {
		const arr = JSON.parse(str);
		if (!Array.isArray(arr)) return null;
		return arr
			.map((x) => {
				const images = Array.isArray(x.img) ? x.img.filter(Boolean).slice(0, 4) : [];
				return {
					productId: x.id,
					quantity: Number(x.q) || 1,
					name: x.n || '',
					price: Number(x.p) || 0,
					images,
					image: images[0] || '',
					note: x.note || '',
					replacements: Array.isArray(x.rep) ? x.rep : []
				};
			})
			.filter((x) => x && x.productId);
	} catch {
		return null;
	}
}

export function decodeCartIds(str: string | null): { id: string; qty: number }[] | null {
	if (!str) return null;
	return str
		.split(',')
		.map((pair) => {
			const [id, qty] = pair.split(':');
			return { id, qty: Number(qty) || 1 };
		})
		.filter((x) => x && x.id);
}
