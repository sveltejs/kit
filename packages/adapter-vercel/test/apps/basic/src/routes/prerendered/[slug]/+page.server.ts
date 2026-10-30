export const prerender = true;

export function entries() {
	return ['a', 'b', 'café', 'v1.2'].map((slug) => ({ slug }));
}

export function load({ params }) {
	return { slug: params.slug };
}
