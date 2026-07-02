/* eslint-disable */

/** @type {import('../../.svelte-kit/types/required/[regularParam=boolean]/$types').PageLoad} */
export function load({ params }) {
	/** @type {boolean} a */
	const a = params.regularParam;

	/** @type {"a" | "b"} b*/
	let b;

	//@ts-expect-error
	b = params.regularParam;
}
