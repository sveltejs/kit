export async function load({ fetch }) {
	const response = await fetch('/load/fetch-no-body/endpoint');

	return {
		ok: response.ok,
		body: await response.text()
	};
}
