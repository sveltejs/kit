import { error, isHttpError, redirect } from '@sveltejs/kit';
import { sequence } from '@sveltejs/kit/hooks';
import fs from 'node:fs';
import { COOKIE_NAME } from './routes/cookies/shared';
import { _set_from_init } from './routes/init-hooks/+page.server';

/**
 * Transform an error into a POJO, by copying its `name`, `message`
 * and (in dev) `stack`, plus any custom properties, plus recursively
 * serialized `cause` properties.
 *
 * @param {Error} error
 */
export function error_to_pojo(error) {
	if (isHttpError(error)) {
		return {
			status: error.status,
			...error.body
		};
	}

	const { name, message, stack, ...custom } = error;
	return { name, message, stack, ...custom };
}

/** @type {import('@sveltejs/kit').HandleServerError} */
export const handleError = ({ event, error: e, status, message }) => {
	const error = /** @type {Error} */ (e);
	// TODO we do this because there's no other way (that i'm aware of)
	// to communicate errors back to the test suite. even if we could
	// capture stderr, attributing an error to a specific request
	// is trickier when things run concurrently
	const errors = fs.existsSync('test/errors.json')
		? JSON.parse(fs.readFileSync('test/errors.json', 'utf8'))
		: {};
	errors[event.url.pathname] = error_to_pojo(error);
	fs.writeFileSync('test/errors.json', JSON.stringify(errors));

	return event.url.pathname.endsWith('404-fallback')
		? undefined
		: { message: `${error.message} (${status} ${message})` };
};

export const handle = sequence(
	({ event, resolve }) => {
		event.locals.key = event.route.id;
		event.locals.params = event.params;
		event.locals.answer = 42;
		return resolve(event);
	},
	({ event, resolve }) => {
		if (
			event.request.url.includes('__data.json') &&
			(event.url.pathname.endsWith('__data.json') || !event.isDataRequest)
		) {
			throw new Error(
				'__data.json requests should have the suffix stripped from the URL and isDataRequest set to true'
			);
		}
		return resolve(event);
	},
	({ event, resolve }) => {
		if (
			event.request.headers.has('host') &&
			!event.request.headers.has('user-agent') !== event.isSubRequest
		) {
			throw new Error('SSR API sub-requests should have isSubRequest set to true');
		}
		return resolve(event);
	},
	({ event, resolve }) => {
		if (event.url.pathname.includes('fetch-credentialed')) {
			// Only get the cookie at the test where we know it's set to avoid polluting our logs with (correct) warnings
			event.locals.name = /** @type {string} */ (event.cookies.get('name'));
		}
		return resolve(event);
	},
	async ({ event, resolve }) => {
		if (event.url.pathname === '/cookies/serialize') {
			event.cookies.set('before', 'before', { path: '' });
			const response = await resolve(event);
			response.headers.append(
				'set-cookie',
				event.cookies.serialize('after', 'after', { path: '' })
			);
			return response;
		}
		return resolve(event);
	},
	async ({ event, resolve }) => {
		if (event.url.pathname === '/errors/error-in-handle') {
			throw new Error('Error in handle');
		} else if (event.url.pathname === '/errors/expected-error-in-handle') {
			error(500, 'Expected error in handle');
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
	},
	async ({ event, resolve }) => {
		if (event.url.pathname.includes('/redirect/in-handle')) {
			if (event.url.search === '?throw') {
				redirect(307, event.url.origin + '/redirect/c');
			} else if (event.url.search.includes('cookies')) {
				event.cookies.delete(COOKIE_NAME, { path: '/cookies' });
				redirect(307, event.url.origin + '/cookies');
			} else {
				return new Response(undefined, { status: 307, headers: { location: '/redirect/c' } });
			}
		}

		return resolve(event);
	},
	async ({ event, resolve }) => {
		if (event.url.pathname === '/prerendering/prerendered-endpoint/from-handle-hook') {
			return event.fetch('/prerendering/prerendered-endpoint/api');
		}

		return resolve(event);
	},
	async ({ event, resolve }) => {
		if (event.url.pathname === '/actions/redirect-in-handle' && event.request.method === 'POST') {
			redirect(303, '/actions/enhance');
		}

		return resolve(event);
	},
	async ({ event, resolve }) => {
		if (['/non-existent-route', '/non-existent-route-loop'].includes(event.url.pathname)) {
			event.locals.url = new URL(event.request.url);
		}
		return resolve(event);
	}
);

/** @type {import('@sveltejs/kit').HandleFetch} */
export async function handleFetch({ request, fetch }) {
	if (request.url.endsWith('/server-fetch-request.json')) {
		request = new Request(
			request.url.replace('/server-fetch-request.json', '/server-fetch-request-modified.json'),
			request
		);
	}

	return fetch(request);
}

export function init() {
	_set_from_init();
}
