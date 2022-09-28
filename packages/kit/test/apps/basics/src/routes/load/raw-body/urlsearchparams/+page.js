/** @type {import('@sveltejs/kit').Load} */
export async function load({ fetch }) {
	const res = await fetch('/load/raw-body.json', {
		method: 'POST',
		body: new URLSearchParams({ data: '{ "oddly": { "formatted": "json" } }' })
	});

	return await res.json();
}
