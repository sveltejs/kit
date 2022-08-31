import { hash } from '../hash.js';

let loading = 0;

const native_fetch = window.fetch;

export function lock_fetch() {
	loading += 1;
}

export function unlock_fetch() {
	loading -= 1;
}

if (import.meta.env.DEV) {
	let can_inspect_stack_trace = false;

	const check_stack_trace = async () => {
		const stack = /** @type {string} */ (new Error().stack);
		can_inspect_stack_trace = stack.includes('check_stack_trace');
	};

	check_stack_trace();

	window.fetch = (input, init) => {
		const url = input instanceof Request ? input.url : input.toString();
		const stack = /** @type {string} */ (new Error().stack);

		const heuristic = can_inspect_stack_trace ? stack.includes('load_node') : loading;
		if (heuristic) {
			console.warn(
				`Loading ${url} using \`window.fetch\`. For best results, use the \`fetch\` that is passed to your \`load\` function: https://kit.svelte.dev/docs/load#input-fetch`
			);
		}

		return native_fetch(input, init);
	};
}

const cache = new Map();

/**
 * Should be called on the initial run of load functions that hydrate the page.
 * Saves any requests with cache-control max-age to the cache.
 * @param {RequestInfo} resource
 * @param {string} resolved
 * @param {RequestInit} [opts]
 */
export function initial_fetch(resource, resolved, opts) {
	const url = JSON.stringify(typeof resource === 'string' ? resource : resource.url);

	let selector = `script[data-sveltekit-fetched][data-url=${url}]`;

	if (opts && typeof opts.body === 'string') {
		selector += `[data-hash="${hash(opts.body)}"]`;
	}

	const script = document.querySelector(selector);
	if (script?.textContent) {
		const { body, ...init } = JSON.parse(script.textContent);

		const ttl = script.getAttribute('data-ttl');
		if (ttl) cache.set(resolved, { body, init, ttl: 1000 * Number(ttl) });

		return Promise.resolve(new Response(body, init));
	}

	return native_fetch(resource, opts);
}

/**
 * Tries to get the response from the cache, if max-age allows it, else does a fetch.
 * @param {string} resolved
 * @param {RequestInit} [opts]
 */
export function subsequent_fetch(resolved, opts) {
	const cached = cache.get(resolved);
	if (cached) {
		if (cached.ttl < performance.now()) {
			cache.delete(resolved);
		}

		return new Response(cached.body, cached.init);
	}

	return native_fetch(resolved, opts);
}
