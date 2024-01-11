import page_data from '$lib/+page.js.txt';

/** @type {import('./$types').PageLoad} */
export async function load({ parent, data }) {
	return { ...data, ...(await parent()), page_data };
}
