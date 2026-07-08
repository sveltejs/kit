/* eslint-disable */

/** @type {import('../../.svelte-kit/types/optional/[[optional-hyphen-param=hyphenated-matcher]]/$types').PageLoad} */
export function load({ params }) {
	if (params['optional-hyphen-param']) {
		/** @type {"a" | "b"} */
		let a;
		a = params['optional-hyphen-param'];
		return { a };
	}
}
