import page1 from '$lib/page1.txt';

export async function load({ parent }) {
	return { ...(await parent()), page1 };
}
