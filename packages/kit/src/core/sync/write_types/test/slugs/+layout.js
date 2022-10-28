/** @type {import('./.svelte-kit/types/src/core/sync/write_types/test/slugs/$types').LayoutLoad} */
export function load({ params }) {
	params.optional;
	params.rest;
	params.slug;
	// @ts-expect-error
	params.foo;
	// @ts-expect-error
	params.optional.charAt(1);
	// @ts-expect-error
	params.rest.charAt(1);
	// @ts-expect-error
	params.slug.charAt(1);
}
