/** @type {import('./$types').PageLoad} */
export async function load({ fetch }) {
	const res = await fetch('/load/assets/a#b.txt');

	return {
		status: res.status
	};
}
