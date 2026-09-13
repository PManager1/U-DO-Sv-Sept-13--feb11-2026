export const ssr = false;

import { redirect } from '@sveltejs/kit';
import tokenManager from '$lib/tokenManager';

export const load = async ({ url }) => {
	const { pathname } = url;
	if (
		pathname.startsWith('/admin/brands') ||
		pathname.startsWith('/admin/GU') ||
		pathname.startsWith('/admin/globalimagesync') ||
		pathname.startsWith('/admin/globalgrocerytagmgmt') ||
		pathname.startsWith('/admin/services-control') ||
		pathname.startsWith('/admin/activate-brands')
	) return;
	if (!tokenManager.hasValidToken()) {
		throw redirect(303, '/login/');
	}
};
