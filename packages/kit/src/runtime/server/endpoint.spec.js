import { describe, expect, test } from 'vitest';

// `__SVELTEKIT_DEV__` is a compile-time flag that is normally replaced by the
// Vite plugin at build time; provide it here so the module can be loaded
/** @type {any} */ (globalThis).__SVELTEKIT_DEV__ = false;

const { is_endpoint_request } = await import('./endpoint.js');

/**
 * @param {string} method
 * @param {Record<string, string>} headers
 */
function event(method, headers) {
	const request = new Request('http://localhost/feed', { method, headers });
	return /** @type {import('@sveltejs/kit').RequestEvent} */ ({ request });
}

describe('is_endpoint_request', () => {
	test('treats a browser navigation as a page request', () => {
		const accept =
			'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7';

		expect(is_endpoint_request(event('GET', { accept }))).toBe(false);
		expect(is_endpoint_request(event('POST', { accept }))).toBe(false);
	});

	test('sends a request that ranks text/html below another type to the endpoint', () => {
		// the default accept header of SimplePie-based feed readers such as FreshRSS
		const feed_reader =
			'application/atom+xml, application/rss+xml, application/rdf+xml;q=0.9, application/xml;q=0.8, text/xml;q=0.8, text/html;q=0.7, unknown/unknown;q=0.1, application/unknown;q=0.1, */*;q=0.1';

		expect(is_endpoint_request(event('GET', { accept: feed_reader }))).toBe(true);
		expect(
			is_endpoint_request(event('GET', { accept: 'application/atom+xml, text/html;q=0.1' }))
		).toBe(true);
		expect(
			is_endpoint_request(event('POST', { accept: 'application/json, text/html;q=0.9' }))
		).toBe(true);
	});

	test('sends a request without a text/html preference to the endpoint', () => {
		expect(is_endpoint_request(event('GET', {}))).toBe(true);
		expect(is_endpoint_request(event('GET', { accept: '*/*' }))).toBe(true);
		expect(is_endpoint_request(event('GET', { accept: 'application/json' }))).toBe(true);
	});

	test('treats a use:enhance form submission as a page request', () => {
		expect(
			is_endpoint_request(
				event('POST', { accept: 'application/json', 'x-sveltekit-action': 'true' })
			)
		).toBe(false);
	});
});
