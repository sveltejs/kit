import { browser } from '$app/environment';

/** @type {import('@sveltejs/kit').Load} */
export async function load({ fetch }) {
	const url = '/load/fetch-request.json';

	// this is contrived, but saves us faffing about with node-fetch here
	const resource = browser ? new Request(url) : url;

	const url_search_params = new URLSearchParams({ foo: 'bar', baz: 'bar' });

	const res = await fetch(resource, { body: url_search_params, method: 'POST' });

	return { answer: 'ok' };
}
