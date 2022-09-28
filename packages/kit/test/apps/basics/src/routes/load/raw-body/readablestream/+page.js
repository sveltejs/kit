/** @type {import('@sveltejs/kit').Load} */
export async function load({ fetch }) {
	const data = new TextEncoder().encode('{ "oddly" : { "formatted" : "json" } }');

	let offset = 0;

	const res = await fetch('/load/raw-body.json', {
		method: 'POST',
		headers: {
			'content-type': 'application/octet-stream'
		},
		// @ts-ignore
		duplex: 'half',
		body: new ReadableStream({
			pull(controller) {
				if (offset < data.length) {
					controller.enqueue(data.subarray(offset, (offset += 2)));
					return;
				}
				controller.close();
			}
		})
	});

	return await res.json();
}
