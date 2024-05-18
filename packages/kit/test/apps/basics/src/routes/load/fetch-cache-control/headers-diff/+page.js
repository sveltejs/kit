export async function load({ fetch, url }) {
	const r1 = await fetch(url.pathname, {
		headers: {
			'x-foo': 'a'
		}
	}).then((r) => r.json());

	const r2 = await fetch(url.pathname, {
		headers: {
			'x-foo': 'b'
		}
	}).then((r) => r.json());

	return {
		a: r1,
		b: r2
	};
}
