import { dev } from '$app/env';

/**
 * @type {import('@sveltejs/adapter-netlify').AdapterRequestHandler}
 */
export function get() {
	return {
		headers: { Location: '/top/rss' },
		status: dev ? 302 : 301
	};
}
