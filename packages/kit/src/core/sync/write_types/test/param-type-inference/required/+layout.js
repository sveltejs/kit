/* eslint-disable */

/** @type {import('../.svelte-kit/types/src/core/sync/write_types/test/param-type-inference/required/$types').LayoutLoad} */
export function load({ params }) {
	if (params.narrowedParam) {
		/** @type {"a" | "b"} */
		const a = params.narrowedParam;
	}

	if (params.regularParam) {
		/** @type {"a" | "b"} */
		let a;

		//@ts-expect-error
		a = params.regularParam;

		/** @type {string} b*/
		const b = params.regularParam;
	}
}
