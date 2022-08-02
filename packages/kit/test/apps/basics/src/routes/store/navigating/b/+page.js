/** @type {import('@sveltejs/kit').Load} */
export async function load() {
	await new Promise((f) => setTimeout(f, 50));
	return {};
}
