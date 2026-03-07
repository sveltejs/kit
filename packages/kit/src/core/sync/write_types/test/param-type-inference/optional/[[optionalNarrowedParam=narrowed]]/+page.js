/* eslint-disable */

/** @type {import('../../.svelte-kit/types/optional/[[optionalNarrowedParam=narrowed]]/$types').PageLoad} */
export function load({ params }) {
	if (params.optionalNarrowedParam) {
		/** @type {"a" | "b"} */
		let a;
		a = params.optionalNarrowedParam;
		return { a };
	}
}
