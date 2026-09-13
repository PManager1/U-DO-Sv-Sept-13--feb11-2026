export function load({ url }: { url: URL }) {
	return { phone: url.searchParams.get('phone') || '' };
}
