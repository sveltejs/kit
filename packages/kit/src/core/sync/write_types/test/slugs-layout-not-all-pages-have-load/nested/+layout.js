/** @type {import('../.svelte-kit/types/src/core/sync/write_types/test/slugs-layout-not-all-pages-have-load/nested/$types').LayoutLoad} */
export function load({ params }) {
	params.rest;
	// @ts-expect-error
	params.slug;
}
