export async function load({ fetch }) {
	// fetch to root with trailing slash
	const response1 = await fetch('/');
	// fetch to root without trailing slash
	const response2 = await fetch('');
	// fetch to root with custom base path with trailing slash
	const response3 = await fetch('/path-base/');
	// fetch to root with custom base path without trailing slash
	const response4 = await fetch('/path-base');

	return {
		fetchUrl1: response1.url,
		fetchUrl2: response2.url,
		fetchUrl3: response3.url,
		fetchUrl4: response4.url,
		fetchResponse1: await response1.text(),
		fetchResponse2: await response2.text(),
		fetchResponse3: await response3.text(),
		fetchRedirect4: response4.headers.get('location')
	};
}
