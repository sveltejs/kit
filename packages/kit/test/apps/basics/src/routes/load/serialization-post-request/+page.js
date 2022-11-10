/** @type {import('@sveltejs/kit').Load} */
export async function load({ url, fetch }) {
	/** @param {string} body */
	async function post(body) {
		const request = new Request(url.origin + '/load/serialization-post.json', {
			method: 'POST',
			headers: {
				'content-type': 'text/plain'
			},
			body
		});
		const res = await fetch(request);

		return await res.text();
	}
	const a = await post('x');
	const b = await post('y');

	return { a, b };
}
