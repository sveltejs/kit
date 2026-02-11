export async function load({ fetch }) {
	// fetch to root with trailing slash
	const response1 = await fetch('/', { redirect: 'manual' });
	// fetch to root without trailing slash
	const response2 = await fetch('', { redirect: 'manual' });
	// fetch to root with custom base path with trailing slash
	const response3 = await fetch('/path-base/', { redirect: 'manual' });
	// fetch to root with custom base path without trailing slash
	const response4 = await fetch('/path-base', { redirect: 'manual' });
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
			},
			{
				url: response3.url,
				response: await response3.text(),
				redirect: response3.headers.get('location')
			},
			{
				url: response4.url,
				response: await response4.text(),
				redirect: response4.headers.get('location')
			}
		]
	};
}
