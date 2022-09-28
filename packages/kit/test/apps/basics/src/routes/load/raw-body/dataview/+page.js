/** @type {import('@sveltejs/kit').Load} */
export async function load({ fetch }) {
	const data = new TextEncoder().encode('{ "oddly" : { "formatted" : "json" } }');
	const res = await fetch('/load/raw-body.json', {
		method: 'POST',
		headers: {
			'content-type': 'application/octet-stream'
		},
		body: new DataView(data.buffer, data.byteOffset, data.byteLength)
	});

	return await res.json();
}
