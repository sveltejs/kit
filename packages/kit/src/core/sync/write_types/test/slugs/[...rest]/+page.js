/** @type {import('../.svelte-kit/types/[...rest]/$types').PageLoad} */
export function load({ params }) {
	params.rest.charAt(1);
	// @ts-expect-error
	params.optional;
	// @ts-expect-error
	params.slug;

	return { rest: 'rest' };
}
