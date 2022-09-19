/** @type {import('./$types').PageLoad} */
export async function load({ fetch }) {
	const res = await fetch('/load/fetch-origin-internal/resource', {
		method: 'POST'
	});

	const { origin } = await res.json();

	return { origin };
}
