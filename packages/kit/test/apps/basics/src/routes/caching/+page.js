/** @type {import('@sveltejs/kit').Load} */
export async function load({ setHeaders }) {
	setHeaders('cache-control: max-age=30');
}
