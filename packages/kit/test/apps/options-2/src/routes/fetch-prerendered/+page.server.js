export async function load({ fetch }) {
	const response = await fetch('/basepath/fetch-prerendered/shadowed/static');
	const text = await response.text();

	return {
		status: response.status,
		found: text.includes('this page was prerendered')
	};
}
