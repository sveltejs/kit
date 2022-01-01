import { sequence } from '../../../../src/runtime/hooks';
import cookie from 'cookie';

/** @type {import('@sveltejs/kit').GetSession} */
export function getSession(request) {
	return request.locals;
}

export const handle = sequence(
	({ request, resolve }) => {
		request.locals.answer = 42;
		return resolve(request);
	},
	({ request, resolve }) => {
		const cookies = cookie.parse(request.headers.cookie || '');
		request.locals.name = cookies.name;
		return resolve(request);
	},
	async ({ request, resolve }) => {
		const response = await resolve(request);
		if (request.url.pathname === '/errors/test-hooks-errorhandling') throw 'Testing hook exception';
		return {
			...response,
			headers: {
				...response.headers,
				'set-cookie': 'name=SvelteKit; path=/; HttpOnly'
			}
		};
	}
);

/** @type {import('@sveltejs/kit').HandleError} */
export async function handleError({ error, request }) {
	console.error(error.message);
	if (error.frame) {
		console.error(error.frame);
	}
	if (error.stack) {
		console.error(error.stack);
	}

	if (error.message === '"Testing hook exception"')
		return {
			status: 301,
			redirect: '/errors/errorpage'
		};
}

/** @type {import('@sveltejs/kit').ExternalFetch} */
export async function externalFetch(request) {
	let newRequest = request;
	if (request.url.endsWith('/server-fetch-request.json')) {
		newRequest = new Request(
			request.url.replace('/server-fetch-request.json', '/server-fetch-request-modified.json'),
			request
		);
	}

	return fetch(newRequest);
}
