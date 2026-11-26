/** @type {import('@sveltejs/kit').Load} */
export async function load({ fetch, url }) {
	const responses = await Promise.all([
		fetch('/load/a.json'),
		fetch('/load/b.json'),
		fetch('/load/serialization-post.json', { method: 'POST', body: 'x' }),
		fetch('/load/serialization-post.json', { method: 'POST', body: 'y' })
	]);

	// responses are recorded when they are read, so this stands in for them arriving out of order
	const order = url.searchParams.has('reverse') ? [3, 2, 1, 0] : [0, 1, 2, 3];

	/** @type {string[]} */
	const bodies = [];

	for (const i of order) {
		bodies[i] = await responses[i].text();
	}

	return { bodies };
}
