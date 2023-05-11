/** @type {import('./$types').PageLoad} */
export async function load({ fetch }) {
	// @ts-expect-error: non existing path to evoke 404
	const { status } = await fetch('/missing.json');

	return { status };
}
