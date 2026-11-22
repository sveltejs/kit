export const prerender = true;

export function entries() {
	return [{ slug: 'a' }];
}

export function load({ params }) {
	return { slug: params.slug };
}
