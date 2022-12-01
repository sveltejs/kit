import { browser } from '$app/environment';

/** @type {import('@sveltejs/kit').Load} */
export async function load({ fetch }) {
	const url = '/load/fetch-request.json';

	// this is contrived, but saves us faffing about with node-fetch here
	const resource = browser ? new Request(url) : url;
	const formData = new FormData();
	formData.set('Test', 'Test');

	const res = await fetch(resource, { body: formData, method: 'POST' });

	return { answer: 'ok' };
}
