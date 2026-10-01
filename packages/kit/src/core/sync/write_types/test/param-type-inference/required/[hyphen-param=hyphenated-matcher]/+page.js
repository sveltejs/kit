/* eslint-disable */

/** @type {import('../../.svelte-kit/types/required/[hyphen-param=hyphenated-matcher]/$types').PageLoad} */
export function load({ params }) {
	/** @type {"a" | "b"} */
	let a;
	a = params['hyphen-param'];
}
