export async function handleError({ error }) {
	await Promise.resolve();

	return {
		message: 'transformed'
	};
}
