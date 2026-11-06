export const prerender = true;
export const trailingSlash = 'always';

export function entries() {
	return ['a', 'b'].map((slug) => ({ slug }));
}

export function load({ params }) {
	return { slug: params.slug };
}
