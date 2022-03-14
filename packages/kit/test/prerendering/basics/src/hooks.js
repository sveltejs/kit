import { prerendering } from '$app/env';

const global_prerendering = prerendering;

export const handle = async ({ event, resolve }) => {
	if (event.url.pathname === '/prerendering-true' && global_prerendering) {
		return await resolve(event, {
			transformPage: ({ html }) => html.replace('answer', '42')
		});
	}
	return await resolve(event);
};
