// The following line does not work with vite resolution. Why?
// import { sequence } from '@sveltejs/kit/hooks';
import { sequence } from '../../../../src/runtime/hooks';

/** @type {import('@sveltejs/kit').Handle} */
export const handle = sequence(
	({ request, resolve }) => {
		request.locals.first = true;
		return resolve(request);
	},
	({ request, resolve }) => {
		request.locals.second = 'str';
		return resolve(request);
	},
	async ({ request, resolve }) => {
		request.locals.third = 3;

		const response = await resolve(request);

		return {
			...response,
			headers: {
				...response.headers,
				'X-Handle-Header': 'hello'
			}
		};
	},
	async ({ request, resolve }) => {
		const response = await resolve(request);

		return {
			...response,
			headers: {
				...response.headers,
				'X-Request-Locals': JSON.stringify(request.locals)
			}
		};
	}
);
