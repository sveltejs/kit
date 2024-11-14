/* eslint-disable */

/** @type {import('../../.svelte-kit/types/src/core/sync/write_types/test/param-type-inference/spread/[...spread=narrowed]/$types').PageLoad} */
export function load({ params }) {
	/** @type {"a" | "b"} */
	let a;
	a = params.spread;
}
