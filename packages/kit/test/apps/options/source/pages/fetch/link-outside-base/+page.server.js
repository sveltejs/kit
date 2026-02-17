export async function load({ fetch }) {
	const response = await fetch('/not-base-path/');
	return {
		fetchUrl: response.url,
		fetchResponse: await response.text()
	};
}
