/* eslint-disable */

/** @type {import('../../.svelte-kit/types/src/core/sync/write_types/test/param-type-inference/optional/[[optionalNarrowedParam=narrowed]]/$types').PageLoad} */
export function load({ params }) {
	if (params.optionalNarrowedParam) {
		/** @type {"a" | "b"} */
		let a;
		a = params.optionalNarrowedParam;
		return { a };
	}
}
