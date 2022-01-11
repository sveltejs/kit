import fs from 'fs';
import cookie from 'cookie';
import { sequence } from '../../../../src/runtime/hooks';

/** @type {import('@sveltejs/kit').GetSession} */
export function getSession(request) {
	return request.locals;
}

/** @type {import('@sveltejs/kit').HandleError} */
export const handleError = ({ request, error }) => {
	// TODO we do this because there's no other way (that i'm aware of)
	// to communicate errors back to the test suite. even if we could
	// capture stderr, attributing an error to a specific request
	// is trickier when things run concurrently
	const errors = fs.existsSync('test/errors.json')
		? JSON.parse(fs.readFileSync('test/errors.json', 'utf8'))
		: {};
	errors[request.url.pathname] = error.stack || error.message;
	fs.writeFileSync('test/errors.json', JSON.stringify(errors));
};

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
		if (request.url.pathname === '/errors/error-in-handle') {
			throw new Error('Error in handle');
		}

		const response = await resolve(request, { ssr: !request.url.pathname.startsWith('/no-ssr') });

		return {
			...response,
			headers: {
				...response.headers,
				'set-cookie': 'name=SvelteKit; path=/; HttpOnly'
			}
		};
	}
);

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
