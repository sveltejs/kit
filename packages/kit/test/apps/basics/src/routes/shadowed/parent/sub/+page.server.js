export async function load({ parent }) {
	const data = await parent();
	return { sub: 'sub', data };
}
