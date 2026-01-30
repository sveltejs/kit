export const load = ({ request }) => {
	const header = request.headers.get('x-client-header') ?? 'empty';
	return { header };
};
