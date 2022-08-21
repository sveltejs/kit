/** @type {import('@sveltejs/kit').Load} */
export async function load({ params, parent }) {
	const data = await parent();
	return {
		message: `${data.message} + new`,
		x: params.x
	};
}
