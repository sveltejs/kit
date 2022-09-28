/** @type {import('@sveltejs/kit').Load} */
export async function load({ fetch }) {
	const res = await fetch('/load/raw-body.json', {
		method: 'POST',
		body: new Blob(['{ "oddly" : { "formatted" : "json" } }'], { type: 'application/octet-stream' })
	});

	return await res.json();
}
