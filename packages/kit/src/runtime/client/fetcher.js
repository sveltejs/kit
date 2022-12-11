import { DEV } from 'esm-env';
import { hash } from '../hash.js';

let loading = 0;

export const native_fetch = window.fetch;

export function lock_fetch() {
	loading += 1;
}

export function unlock_fetch() {
	loading -= 1;
}

if (DEV) {
	let can_inspect_stack_trace = false;

	const check_stack_trace = async () => {
		const stack = /** @type {string} */ (new Error().stack);
		can_inspect_stack_trace = stack.includes('check_stack_trace');
	};

	check_stack_trace();

	window.fetch = (input, init) => {
		const url = input instanceof Request ? input.url : input.toString();
		const stack = /** @type {string} */ (new Error().stack);

		// check if fetch was called via load_node. the lock method only checks if it was called at the
		// same time, but not necessarily if it was called from `load`
		// we use just the filename as the method name sometimes does not appear on the CI
		const heuristic = can_inspect_stack_trace
			? stack.includes('src/runtime/client/client.js')
			: loading;
		if (heuristic) {
			console.warn(
				`Loading ${url} using \`window.fetch\`. For best results, use the \`fetch\` that is passed to your \`load\` function: https://kit.svelte.dev/docs/load#making-fetch-requests`
			);
		}

		const method = input instanceof Request ? input.method : init?.method || 'GET';

		if (method !== 'GET') {
			cache.delete(build_selector(input));
		}

		return native_fetch(input, init);
	};
} else {
	window.fetch = (input, init) => {
		const method = input instanceof Request ? input.method : init?.method || 'GET';

		if (method !== 'GET') {
			cache.delete(build_selector(input));
		}

		return native_fetch(input, init);
	};
}

const cache = new Map();

/**
 * Should be called on the initial run of load functions that hydrate the page.
 * Saves any requests with cache-control max-age to the cache.
 * @param {URL | string} resource
 * @param {RequestInit} [opts]
 */
export function initial_fetch(resource, opts) {
	const selector = build_selector(resource, opts);

	const script = document.querySelector(selector);
	if (script?.textContent) {
		const { body, ...init } = JSON.parse(script.textContent);

		const ttl = script.getAttribute('data-ttl');
		if (ttl) cache.set(selector, { body, init, ttl: 1000 * Number(ttl) });

		return Promise.resolve(new Response(body, init));
	}

	return native_fetch(resource, opts);
}

/**
 * Tries to get the response from the cache, if max-age allows it, else does a fetch.
 * @param {URL | string} resource
 * @param {string} resolved
 * @param {RequestInit} [opts]
 */
export function subsequent_fetch(resource, resolved, opts) {
	if (cache.size > 0) {
		const selector = build_selector(resource, opts);
		const cached = cache.get(selector);
		if (cached) {
			// https://developer.mozilla.org/en-US/docs/Web/API/Request/cache#value
			if (
				performance.now() < cached.ttl &&
				['default', 'force-cache', 'only-if-cached', undefined].includes(opts?.cache)
			) {
				return new Response(cached.body, cached.init);
			}

			cache.delete(selector);
		}
	}

	return native_fetch(resolved, opts);
}

/**
 * Build the cache key for a given request
 * @param {URL | RequestInfo} resource
 * @param {RequestInit} [opts]
 */
function build_selector(resource, opts) {
	const url = JSON.stringify(resource instanceof Request ? resource.url : resource);

	let selector = `script[data-sveltekit-fetched][data-url=${url}]`;

	if (opts?.body && (typeof opts.body === 'string' || ArrayBuffer.isView(opts.body))) {
		selector += `[data-hash="${hash(opts.body)}"]`;
	}

	return selector;
}
