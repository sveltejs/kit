/** @type {import('./$types').PageServerLoad} */
export async function load({ fetch }) {
	const res = await fetch('/headers/echo');
	return { message: (await res.json())['x-message'] };
}
