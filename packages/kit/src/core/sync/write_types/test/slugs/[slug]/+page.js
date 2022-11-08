/** @type {import('../.svelte-kit/types/src/core/sync/write_types/test/slugs/[slug]/$types').PageLoad} */
export function load({ params }) {
	params.slug.charAt(1);
	// @ts-expect-error
	params.optional;
	// @ts-expect-error
	params.rest;

	return { slug: 'slug' };
}
