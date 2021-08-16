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

		return {
			...response,
			headers: {
				...response.headers,
				'Set-Cookie': 'name=SvelteKit; path=/; HttpOnly'
			}
		};
	}
);

/** @type {import('@sveltejs/kit').ServerFetch} */
export async function serverFetch(request) {
	let newRequest = request;
	if (request.url.endsWith('/server-fetch-request.json')) {
		newRequest = new Request(
			request.url.replace('/server-fetch-request.json', '/server-fetch-request-modified.json'),
			request
		);
	}

	return fetch(newRequest);
}
