/** @type {import('@sveltejs/kit').Load} */
export async function load({ params }) {
	return {
		y: params.y
	};
}
