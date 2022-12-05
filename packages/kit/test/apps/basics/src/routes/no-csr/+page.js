export const csr = false;

/** @type {import('./$types').PageLoad} */
export async function load({ fetch }) {
	const res = await fetch('/no-csr/data.json');
	return await res.json();
}
