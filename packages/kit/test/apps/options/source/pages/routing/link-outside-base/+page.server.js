export async function load({ fetch }) {
	const response = await fetch('/not-base-path/');
	return {
		responseContentType: response.headers.get('content-type')
	};
}
