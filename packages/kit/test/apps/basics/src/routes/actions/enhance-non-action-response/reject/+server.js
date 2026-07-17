import { json } from '@sveltejs/kit';

export function POST({ url }) {
	const body = url.searchParams.get('body');

	if (body === 'html') {
		return new Response('<!DOCTYPE html><h1>upstream error</h1>', {
			status: 502,
			statusText: 'Bad Gateway',
			headers: { 'content-type': 'text/html' }
		});
	}

	if (body === 'empty') {
		return new Response(null, { status: 403, statusText: 'Forbidden' });
	}

	return json({ message: 'Cross-site POST form submissions are forbidden' }, { status: 403 });
}
