import { building } from '$app/environment';

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
	return await resolve(event, {
		filterSerializedResponseHeaders: (name) => name === 'content-type'
	});
};

// this code is here to make sure that we kill the process
setInterval(() => {
	console.log('process is still alive');
}, 5000);
