/** @type {import('../.svelte-kit/types/src/core/sync/write_types/test/slugs/[...rest]/$types').PageLoad} */
export function load({ params }) {
	params.rest.charAt(1);
	// @ts-expect-error
	params.optional;
	// @ts-expect-error
	params.slug;

	return { rest: 'rest' };
}
