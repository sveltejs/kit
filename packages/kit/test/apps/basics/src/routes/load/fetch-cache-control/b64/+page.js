/** @type {import("./$types").PageLoad} */
export async function load({ fetch }) {
	const res = await fetch('/load/fetch-cache-control/b64/data');

	return {
		data: await res.arrayBuffer()
	};
}
