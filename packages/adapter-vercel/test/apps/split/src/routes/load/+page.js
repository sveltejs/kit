import page_data from '$lib/+page.js.txt';

export async function load({ parent, data }) {
	return { ...data, ...(await parent()), page_data };
}
