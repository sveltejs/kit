/** @type {import('./$types').PageServerLoad} */
export async function load({ fetch }) {
	const res = await fetch('/prerendering/prerendered-endpoint/api');
	const json = await res.json();
	return json;
}
