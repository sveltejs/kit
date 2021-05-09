/** @type {import('@sveltejs/kit').RequestHandler} */
export function get() {
	return {
		headers: {
			'content-type': 'application/octet-stream'
		},
		body: new Uint8Array([1, 2, 3, 4, 5])
	};
}
