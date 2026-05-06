import { command, getRequestEvent } from '$app/server';

export const get_route_info = command(async () => {
	const { route, url, params } = getRequestEvent();

	return {
		routeId: route.id,
		pathname: url.pathname,
		params
	};
});
