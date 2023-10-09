import { env } from '$env/dynamic/public';

window.PUBLIC_DYNAMIC = env.PUBLIC_DYNAMIC;

/** @type{import("@sveltejs/kit").HandleClientError} */
export function handleError({ error, event }) {
	return event.url.pathname.endsWith('404-fallback')
		? undefined
		: { message: /** @type {Error} */ (error).message };
}
