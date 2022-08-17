/** @type {import('@sveltejs/kit').Load} */
export async function load({ fetch }) {
	const res = await fetch('/load/relay.json');
	return {
		answer: await res.json()
	};
}
