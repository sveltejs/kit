import { redirect } from '@sveltejs/kit';

/** @type {import('@sveltejs/kit').RequestHandler} */
export const GET = (event) => {
	const sneaky = 'teapot%2C%20jane%20austen';
	event.cookies.set('encoding', sneaky, { path: '/cookies/encoding' });
	redirect(303, '/cookies/encoding');
};
