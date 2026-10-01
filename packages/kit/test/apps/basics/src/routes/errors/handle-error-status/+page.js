/** @type {import('@sveltejs/kit').Load} */
export async function load() {
	throw new Error('Status override test');
}
