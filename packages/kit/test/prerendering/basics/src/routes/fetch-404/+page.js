/** @type {import('./$types').Load} */
export async function load({ fetch }) {
	const { status } = await fetch('/missing.json');

	return { status };
}
