import { env } from '$env/dynamic/public';

window.PUBLIC_DYNAMIC = env.PUBLIC_DYNAMIC;

/** @type{import("@sveltejs/kit").HandleClientFetch} */
export const handleFetch = async ({ request, fetch }) => {
	if (request.url.startsWith(location.origin)) {
		request.headers.set('X-Client-Header', 'imtheclient');
	}

	return await fetch(request);
};

/** @type{import("@sveltejs/kit").HandleClientError} */
export function handleError({ error, event, status, message }) {
	return event.url.pathname.endsWith('404-fallback')
		? undefined
		: { message: `${/** @type {Error} */ (error).message} (${status} ${message})` };
}

export function init() {
	console.log('init hooks.client.js');
}
