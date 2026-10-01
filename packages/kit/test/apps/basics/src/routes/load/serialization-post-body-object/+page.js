/** @type {import('@sveltejs/kit').Load} */
export async function load({ fetch }) {
	const response = await fetch('/load/serialization-post.json', {
		method: 'POST',
		body: new URLSearchParams('a=1')
	});

	return { body: await response.text() };
}
