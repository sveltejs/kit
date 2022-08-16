/** @type {import('@sveltejs/kit').Load} */
export async function load({ fetch }) {
	/** @param {string} body */
	async function post(body) {
		const res = await fetch('/load/serialization-post.json', {
			method: 'POST',
			headers: {
				'content-type': 'text/plain'
			},
			body
		});

		return await res.text();
	}
	const a = await post('x');
	const b = await post('y');

	return { a, b };
}
