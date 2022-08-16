/** @type {import('./$types').PageLoad} */
export async function load({ fetch }) {
	const { status } = await fetch('/missing.json');

	return { status };
}
