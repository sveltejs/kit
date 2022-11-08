/** @type {import('@sveltejs/kit').Load} */
export async function load({ fetch, params }) {
	const res = await fetch(`/routing/rest/complex/${params.parts}.json`);
	const { parts } = await res.json();
	return { parts };
}
