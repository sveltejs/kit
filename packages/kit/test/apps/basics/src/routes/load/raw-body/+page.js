/** @type {import('@sveltejs/kit').Load} */
export async function load({ fetch }) {
	const res = await fetch('/load/raw-body.json', {
		method: 'POST',
		headers: {
			'content-type': 'application/json'
		},
		body: '{ "oddly" : { "formatted" : "json" } }'
	});

	return await res.json();
}
