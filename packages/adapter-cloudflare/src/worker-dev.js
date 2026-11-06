// During development, a custom Worker runs in workerd while SvelteKit runs in Node.js,
// so this stands in for SvelteKit's request handler by sending the request back to the
// Vite dev server, which hands it to SvelteKit. Keep the header names in sync with `config.js`

const FORWARDED = 'x-sveltekit-cloudflare-forwarded';
const ORIGIN = 'x-sveltekit-cloudflare-origin';
const HOST = 'x-sveltekit-cloudflare-host';
const CF = 'x-sveltekit-cloudflare-cf';

/**
 * @param {Request} request
 * @returns {Promise<Response>}
 */
export async function fetch(request) {
	if (request.headers.has(FORWARDED)) {
		throw new Error('SvelteKit can only handle requests forwarded from your Worker');
	}

	const url = new URL(request.url);
	// assign the path rather than resolving it, so a path like `//example.com` can't replace the origin
	const target = new URL(request.headers.get(ORIGIN) ?? url.origin);
	target.pathname = url.pathname;
	target.search = url.search;

	const headers = new Headers(request.headers);
	headers.delete(ORIGIN);
	headers.set(FORWARDED, '');
	headers.set(HOST, url.host);
	headers.set(CF, JSON.stringify(/** @type {Request & { cf?: unknown }} */ (request).cf ?? {}));

	return globalThis.fetch(target, {
		method: request.method,
		headers,
		body: request.method === 'GET' || request.method === 'HEAD' ? null : request.body,
		redirect: 'manual'
	});
}
