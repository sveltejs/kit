/** @type {import('@sveltejs/kit').Load} */
export function load({ params }) {
	const { rest } = params;
	return { rest };
}
