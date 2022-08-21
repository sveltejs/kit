export async function load({ fetch, url }) {
	await fetch(`/load/set-cookie-fetch/a.json${url.search}`);
	const res = await fetch('/load/set-cookie-fetch/b.json');
	const { answer } = await res.json(); // need to read the response so it gets serialized

	return { answer };
}
