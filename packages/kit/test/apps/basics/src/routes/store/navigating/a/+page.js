/** @type {import('./$types').PageLoad} */
export async function load() {
	await new Promise((f) => setTimeout(f, 250));
}
