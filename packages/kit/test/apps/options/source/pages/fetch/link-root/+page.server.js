export async function load({ fetch }) {
	// fetch to root with trailing slash
	const response1 = await fetch('/', { redirect: 'manual' });
	// fetch to root without trailing slash
	const response2 = await fetch('', { redirect: 'manual' });
	return {
		fetches: [
			{
				url: response1.url,
				response: await response1.text(),
				redirect: response1.headers.get('location')
			},
			{
				url: response2.url,
				response: await response2.text(),
				redirect: response2.headers.get('location')
			}
		]
	};
}
