/** @type {import('@sveltejs/kit').Load} */
export async function load({ fetch, url }) {
	const results = [];

	for (let i = 0; i < 3; i++) {
		const res = await fetch(`${url.origin}/load/fetch-same-url/data.json`);
		const json = await res.json();
		results.push(json.result);
	}

	return { results };
}
