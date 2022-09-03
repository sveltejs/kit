import fs from 'fs';
import cookie from 'cookie';
import { sequence } from '@sveltejs/kit/hooks';

/** @type {import('@sveltejs/kit').HandleError} */
export const handleError = ({ event, error }) => {
	// TODO we do this because there's no other way (that i'm aware of)
	// to communicate errors back to the test suite. even if we could
	// capture stderr, attributing an error to a specific request
	// is trickier when things run concurrently
	const errors = fs.existsSync('test/errors.json')
		? JSON.parse(fs.readFileSync('test/errors.json', 'utf8'))
		: {};
	errors[event.url.pathname] = error.stack || error.message;
	fs.writeFileSync('test/errors.json', JSON.stringify(errors));
};

export const handle = sequence(
	({ event, resolve }) => {
		event.locals.key = event.routeId;
		event.locals.params = event.params;
		event.locals.answer = 42;
		return resolve(event);
	},
	({ event, resolve }) => {
		const cookies = cookie.parse(event.request.headers.get('cookie') || '');
		event.locals.name = cookies.name;
		return resolve(event);
	},
	async ({ event, resolve }) => {
		if (event.url.pathname === '/errors/error-in-handle') {
			throw new Error('Error in handle');
		}

		const response = await resolve(event, {
			transformPageChunk: event.url.pathname.startsWith('/transform-page-chunk')
				? ({ html }) => html.replace('__REPLACEME__', 'Worked!')
				: undefined
		});

		try {
			// in some tests we fetch stuff with undici, and the headers are immutable.
			// we can safely ignore it in those cases
			response.headers.append('set-cookie', 'name=SvelteKit; path=/; HttpOnly');
		} catch {}

		return response;
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
