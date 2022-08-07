/** @type {import('@sveltejs/kit').Load} */
export async function load({ params }) {
	return {
		z: params.z
	};
}
