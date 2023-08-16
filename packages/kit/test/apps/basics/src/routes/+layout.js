/** @type {import('./$types').LayoutLoad} */
export async function load({ fetch, url }) {
	// opt out of invalidation tracking
	const pathname = Object.getOwnPropertyDescriptor(url, 'pathname')?.value;
	if (pathname === '/non-existent-route') {
		await fetch('/prerendereding/prerendered-endpoint/api').then((r) => r.json());
	}

	// Do NOT make this load function depend on something which would cause it to rerun
	return {
		foo: {
			bar: 'Custom layout'
		}
	};
}
