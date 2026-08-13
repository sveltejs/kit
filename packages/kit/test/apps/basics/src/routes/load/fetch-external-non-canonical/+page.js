/** @type {import('./$types').PageLoad} */
export async function load({ fetch, url }) {
	const port = url.searchParams.get('port');
	// no trailing slash, so it differs from the normalized href
	const res = await fetch(`http://localhost:${port}`);

	const { count } = await res.json();
	return { count, port };
}
