import { env } from '$env/dynamic/public';

window.PUBLIC_DYNAMIC = env.PUBLIC_DYNAMIC;

/** @type{import("@sveltejs/kit").HandleClientError} */
export function handleError({ error, event, status, message }) {
	return event.url.pathname.endsWith('404-fallback')
		? undefined
		: { message: `${/** @type {Error} */ (error).message} (${status} ${message})` };
}

/** @type {import("@sveltejs/kit").HandleLoad} */
export async function handleLoad({ event, resolve }) {
	const { untrack, url } = event;

	if (untrack(() => url.pathname.endsWith('/handle-load/bypass'))) {
		return {
			from: 'handleLoad',
			foo: { bar: 'needed for root layout ' }
		};
	} else if (untrack(() => url.pathname.endsWith('/handle-load/enrich'))) {
		const result = await resolve(event);
		return {
			from: 'handleLoad and ' + /** @type {any} */ (result).from,
			foo: { bar: 'needed for root layout ' }
		};
	} else {
		return resolve(event);
	}
}
