import { getRequestEvent, query } from '$app/server';

export const get_event = query(() => {
	const { route, url } = getRequestEvent();

	return {
		route,
		url
	};
});
