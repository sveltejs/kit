import page2 from '$lib/page2.txt';

/** @type {import('./$types').PageLoad} */
export async function load({ parent, data }) {
	return { ...data, ...(await parent()), page2 };
}
