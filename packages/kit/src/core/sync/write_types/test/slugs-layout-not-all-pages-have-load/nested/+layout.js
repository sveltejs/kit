/** @type {import('../.svelte-kit/types/nested/$types').LayoutLoad} */
export function load({ params }) {
	params.rest;
	// @ts-expect-error
	params.slug;
}
