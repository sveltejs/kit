/** @type {import('./.svelte-kit/types/src/core/sync/write_types/test/slugs/$types').LayoutLoad} */
export function load({ params }) {
	params.optional;
	params.rest;
	params.slug;
	// @ts-ignore this doesn't error with TypeScript 6
	params.foo;
	// @ts-ignore this doesn't error with TypeScript 6
	params.optional.charAt(1);
	// @ts-ignore this doesn't error with TypeScript 6
	params.rest.charAt(1);
	// @ts-ignore this doesn't error with TypeScript 6
	params.slug.charAt(1);
}
