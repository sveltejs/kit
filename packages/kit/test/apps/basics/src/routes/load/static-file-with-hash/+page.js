/** @type {import('./$types').PageLoad} */
export async function load({ fetch }) {
	// @ts-ignore, path does not exist what is this??
	const res = await fetch('/load/assets/a#b.txt');
	return {
		status: res.status
	};
}
