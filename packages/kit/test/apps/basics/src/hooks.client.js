/** @type{import("@sveltejs/kit").HandleClientError} */
export function handleError({ error, event }) {
	return event.url.pathname.endsWith('404-fallback')
		? undefined
		: { message: /** @type {Error} */ (error).message };
}
