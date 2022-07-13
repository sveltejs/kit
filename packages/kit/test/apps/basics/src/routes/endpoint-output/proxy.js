/** @type {import('@sveltejs/kit').RequestHandler} */
export const GET = ({ url }) => fetch(`http://localhost:${url.searchParams.get('port')}`);
