/** @type {import('./$types').PageLoad} */
export async function load({ fetch }) {
	let res = await fetch('./irrelevant', {
		method: 'GET'
	});

	res.headers.get('content-type');
}
