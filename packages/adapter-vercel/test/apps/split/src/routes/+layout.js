import layout from '$lib/+layout.js.txt';

export function load({ data }) {
	return { ...data, layout };
}
