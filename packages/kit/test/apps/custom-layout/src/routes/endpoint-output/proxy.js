/** @type {import('@sveltejs/kit').RequestHandler} */
export const get = ({ url }) => fetch(`http://localhost:${url.searchParams.get('port')}`);
