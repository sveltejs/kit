/* eslint-disable */

/** @type {import('../../.svelte-kit/types/src/core/sync/write_types/test/param-type-inference/required/[regularParam=not_narrowed]/$types').PageLoad} */
export function load({ params }) {
	/** @type {string} a*/
	const a = params.regularParam;

	/** @type {"a" | "b"} b*/
	let b;

	//@ts-expect-error
	b = params.regularParam;
}
