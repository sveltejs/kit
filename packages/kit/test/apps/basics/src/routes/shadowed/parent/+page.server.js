export async function load({ parent }) {
	const data = await parent();
	return { page: 'page', data };
}
