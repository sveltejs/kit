import { json } from '@sveltejs/kit';

/** @type {import('./$types').RequestHandler} */
export async function GET({ fetch, request, url }) {
	const target = new URL(url.searchParams.get('target') ?? '/load/fetch-request-init/data', url);
	const input = new Request(target, JSON.parse(request.headers.get('x-request-init') ?? '{}'));
	/** @type {RequestInit} */
	const init = JSON.parse(request.headers.get('x-fetch-init') ?? '{}');
	if (request.headers.get('x-fetch-abort') === 'true') {
		init.signal = AbortSignal.abort();
	}

	try {
		return await fetch(input, url.searchParams.has('hook') ? undefined : init);
	} catch (error) {
		if (error && typeof error === 'object' && 'name' in error && error.name === 'AbortError') {
			return json({ error: error.name });
		}
		throw error;
	}
}
