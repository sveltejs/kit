/**
 * @param {Request} request 
 * @returns Response
 */
export function handler(request) {
	const headers = new Headers(request.headers);
	headers.set('x-sveltekit-cloudflare-handle', 'true');
	return fetch(request, { headers });
}
