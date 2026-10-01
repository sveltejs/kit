/** @type {import('@sveltejs/kit').Load} */
export async function load({ fetch }) {
	// same headers as the GET below, so both requests hash identically without their bodies
	const headers = { 'x-collision': 'yes' };

	const post = await fetch('/load/serialization-post-body-collision.json', {
		method: 'POST',
		headers,
		body: new URLSearchParams('a=1')
	});

	const get = await fetch('/load/serialization-post-body-collision.json', { headers });

	return { post: await post.text(), get: await get.text() };
}
