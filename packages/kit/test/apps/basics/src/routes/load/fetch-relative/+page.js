/** @type {import('@sveltejs/kit').Load} */
export async function load({ fetch }) {
	const get = await fetch('fetch-relative.json');
	const post = await fetch('fetch-relative.json', { method: 'post', body: '?' });

	return { ...(await get.json()), ...(await post.json()) };
}
