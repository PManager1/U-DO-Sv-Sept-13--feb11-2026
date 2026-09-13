import { fetchStoreById, fetchStoreMenu } from '$lib/storefront';

export async function load({ params }: { params: { id: string } }) {
	const storeRes = await fetchStoreById(params.id);
	const isGrocery = storeRes.store?.brandType === 'grocery';
	const menuRes = await fetchStoreMenu(params.id, isGrocery);
	
	return {
		store: storeRes.store,
		menu: menuRes.menu,
		storeId: params.id
	};
}
