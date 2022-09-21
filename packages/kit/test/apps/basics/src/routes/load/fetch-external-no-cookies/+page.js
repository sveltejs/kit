/** @type {import('./$types').PageLoad} */
export async function load({ fetch, url }) {
	const port = url.searchParams.get('port');
	const res = await fetch(`http://localhost:${port}`);

	return await res.json();
}
