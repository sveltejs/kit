import { building } from '$app/env';

const initial_building = building;

/** @type {import('@sveltejs/kit').Handle} */
export const handle = async ({ event, resolve }) => {
	if (event.url.pathname === '/prerendering-true' && building) {
		return await resolve(event, {
			transformPageChunk: ({ html }) =>
				html
					.replace('__INITIAL_PRERENDERING__', String(initial_building))
					.replace('__PRERENDERING__', String(building))
		});
	}

	const response = await resolve(event, {
		filterSerializedResponseHeaders: (name) => name === 'content-type'
	});

	if (event.url.pathname.startsWith('/content-type-charset')) {
		response.headers.set('content-type', 'text/html; charset=utf-8');
	}

	return response;
};

// this code is here to make sure that we kill the process
setInterval(() => {
	console.log('process is still alive');
}, 5000);
