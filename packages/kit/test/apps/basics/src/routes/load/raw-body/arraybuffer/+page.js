/** @type {import('@sveltejs/kit').Load} */
export async function load({ fetch }) {
	const buffer = new ArrayBuffer(38);
	new TextEncoder().encodeInto('{ "oddly" : { "formatted" : "json" } }', new Uint8Array(buffer));
	const res = await fetch('/load/raw-body.json', {
		method: 'POST',
		headers: {
			'content-type': 'application/octet-stream'
		},
		body: buffer
	});

	return await res.json();
}
