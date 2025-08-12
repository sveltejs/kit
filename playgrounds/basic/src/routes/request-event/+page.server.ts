import { getRequestEvent } from '$app/server';

export async function load() {
	await Promise.resolve();

	const event = getRequestEvent();

	return {
		pathname: event.url.pathname
	};
}
