export function isGroceryStore(store: any) {
	return (
		store?.brandType === 'grocery' ||
		store?.type === 'grocery' ||
		store?.category === 'grocery' ||
		store?.brandCategory === 'grocery'
	);
}

export function storePath(store: any) {
	if (!store?.id) return '/';
	return isGroceryStore(store) ? `/gstore/${store.id}` : `/store/${store.id}`;
}
