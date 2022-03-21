import { prerendering } from '$app/env';

const initial_prerendering = prerendering;

export const handle = async ({ event, resolve }) => {
	if (event.url.pathname === '/prerendering-true' && prerendering) {
		return await resolve(event, {
			transformPage: ({ html }) =>
				html
					.replace('__INITIAL_PRERENDERING__', initial_prerendering)
					.replace('__PRERENDERING__', prerendering)
		});
	}
	return await resolve(event);
};
