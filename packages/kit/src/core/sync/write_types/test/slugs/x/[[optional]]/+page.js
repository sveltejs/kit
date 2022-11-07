/** @type {import('../../.svelte-kit/types/src/core/sync/write_types/test/slugs/x/[[optional]]/$types').PageLoad} */
export async function load({ parent, params }) {
	const p = await parent();
	/** @type {NonNullable<typeof p>} */
	const a = p;
	// @ts-expect-error
	p.foo;
	// @ts-expect-error
	a.foo;

	params.optional;
	params.optional?.charAt(1);
	// @ts-expect-error
	params.optional.charAt(1);
	// @ts-expect-error
	params.slug;
	// @ts-expect-error
	params.rest;

	return { optional: 'optional' };
}
