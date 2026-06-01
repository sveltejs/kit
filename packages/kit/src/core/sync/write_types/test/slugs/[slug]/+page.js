/** @type {import('../.svelte-kit/types/[slug]/$types').PageLoad} */
export function load({ params }) {
	params.slug.charAt(1);
	// @ts-expect-error
	params.optional;
	// @ts-expect-error
	params.rest;

	return { slug: 'slug' };
}
