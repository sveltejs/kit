/** @type {import('@sveltejs/kit').RequestHandler} */
export const GET = ({ cookies }) => {
	const response = new Response('success', {
		status: 200
	});
	response.headers.append('set-cookie', cookies.serialize('endpoint', 'endpoint', { path: '' }));
	return response;
};
