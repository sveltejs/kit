import { browser } from '$app/environment';

let a = 1;

export function load({ url }) {
	const a_copy = a + 1;
	if (browser) {
		a = a_copy;
	}
	return {
		url,
		a
	};
}
