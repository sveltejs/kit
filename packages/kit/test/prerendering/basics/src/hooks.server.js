import { prerendering } from '$app/environment';

const initial_prerendering = prerendering;

/** @type {import('@sveltejs/kit').Handle} */
export const handle = async ({ event, resolve }) => {
	if (event.url.pathname === '/prerendering-true' && prerendering) {
		return await resolve(event, {
			transformPageChunk: ({ html }) =>
				html
					.replace('__INITIAL_PRERENDERING__', String(initial_prerendering))
					.replace('__PRERENDERING__', String(prerendering))
		});
	}
	return await resolve(event, {
		filterSerializedResponseHeaders: (name) => name === 'content-type'
	});
};
