import layout2 from '$lib/layout2.txt';

/** @type {import('./$types').LayoutLoad} */
export function load({ data }) {
	return { ...data, layout2 };
}
