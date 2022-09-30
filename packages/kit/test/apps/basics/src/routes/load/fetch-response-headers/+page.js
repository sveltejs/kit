/** @type {import('./$types').PageLoad} */
export async function load({ fetch }) {
	const response = await fetch('/load/fetch-response-headers.json');

	return {
		message: await response.text(),
		foo: response.headers.get('x-foo')
	};
}
