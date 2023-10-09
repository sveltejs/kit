export async function load({ fetch, url }) {
	const r1 = await fetch(url.pathname, {
		headers: {
			'x-foo': 'a'
		}
	});

	const r2 = await fetch(url.pathname, {
		headers: {
			'x-foo': 'b'
		}
	});

	return {
		a: r1.json(),
		b: r2.json()
	};
}
