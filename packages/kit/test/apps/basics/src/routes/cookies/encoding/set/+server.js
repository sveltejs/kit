import { redirect } from '@sveltejs/kit';

/** @type {import('@sveltejs/kit').RequestHandler} */
export const GET = (event) => {
	const needsEncoding = 'teapot, jane austen';
	event.cookies.set('a', needsEncoding);
	throw redirect(303, '/cookies/encoding');
};
