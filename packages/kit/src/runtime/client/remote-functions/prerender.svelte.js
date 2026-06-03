/** @import { RemotePrerenderFunction } from '@sveltejs/kit' */
/** @import { PointerInitial } from './shared.svelte.js' */
import { app_dir, base } from '$app/paths/internal/client';
import { version } from '__sveltekit/environment';
import { app, prerender_responses } from '../client.js';
import {
	apply_queries,
	get_remote_request_headers,
	register_pointer_reviver,
	remote_response,
	revive_remote_value
} from './shared.svelte.js';
import { create_remote_key, parse_remote_value, stringify_remote_arg } from '../../shared.js';
import { noop } from '../../../utils/functions.js';

// Initialize Cache API for prerender functions
const CACHE_NAME = __SVELTEKIT_DEV__ ? `sveltekit:${Date.now()}` : `sveltekit:${version}`;
/** @type {Cache | undefined} */
let prerender_cache;

const prerender_cache_ready = (async () => {
	if (typeof caches !== 'undefined') {
		try {
			prerender_cache = await caches.open(CACHE_NAME);

			// Clean up old cache versions
			const cache_names = await caches.keys();
			for (const cache_name of cache_names) {
				if (cache_name.startsWith('sveltekit:') && cache_name !== CACHE_NAME) {
					await caches.delete(cache_name);
				}
			}
		} catch (error) {
			console.warn('Failed to initialize SvelteKit cache:', error);
		}
	}
})();

/**
 * @param {string} url
 * @param {string} encoded
 */
function put(url, encoded) {
	return /** @type {Cache} */ (prerender_cache)
		.put(
			url,
			// We need to create a new response because the original response is already consumed
			new Response(encoded, {
				headers: {
					'Content-Type': 'application/json'
				}
			})
		)
		.catch(() => {
			// Nothing we can do here
		});
}

/**
 * The fetcher used by a {@link Prerender} that wasn't seeded: serves from the inline
 * hydration payload (first render), then the Cache API, then the network.
 * @param {string} id
 * @param {string} payload
 * @param {string} url
 */
function create_prerender_fetcher(id, payload, url) {
	const cache_key = create_remote_key(id, payload);

	return async () => {
		await prerender_cache_ready;

		if (Object.hasOwn(prerender_responses, cache_key)) {
			const serialized = prerender_responses[cache_key];

			if (prerender_cache) {
				void put(url, serialized);
			}

			return revive_remote_value(serialized);
		}

		// Do this here, after await Svelte' reactivity context is gone.
		const headers = get_remote_request_headers();

		// Check the Cache API first
		if (prerender_cache) {
			try {
				const cached_response = await prerender_cache.match(url);

				if (cached_response) {
					const cached_result = await cached_response.text();
					return revive_remote_value(cached_result);
				}
			} catch {
				void prerender_cache.delete(url);
			}
		}

		const resolved = await remote_response(url, headers);
		const revive = apply_queries(resolved.queries);

		// For successful prerender requests, save to cache
		if (prerender_cache) {
			void put(url, resolved.result);
		}

		return parse_remote_value(resolved.result, app.decoders, revive);
	};
}

/**
 * Get-or-create the {@link Prerender} resource for `(id, payload)`. When `initial` is
 * provided (the resource is being revived from a seeded nested pointer), the resource
 * resolves immediately to the seeded value and the value is written to the browser cache as
 * if it had been fetched.
 *
 * @param {string} id
 * @param {string} payload
 * @param {PointerInitial} [initial]
 * @returns {Prerender<any>}
 */
function get_prerender_resource(id, payload, initial) {
	const cache_key = create_remote_key(id, payload);

	let resource = prerender_resources.get(cache_key)?.deref();

	if (resource) return resource;

	const url = `${base}/${app_dir}/remote/${id}${payload ? `/${payload}` : ''}`;

	if (initial) {
		resource = new Prerender(
			() => Promise.reject(new Error('A seeded prerender resource should never fetch')),
			initial.type === 'result'
				? { type: 'result', value: initial.value }
				: { type: 'error', error: initial.error }
		);

		// populate the browser cache as if the data had been fetched
		if (initial.type === 'result') {
			void prerender_cache_ready.then(() => {
				if (prerender_cache) void put(url, initial.data);
			});
		}
	} else {
		resource = new Prerender(create_prerender_fetcher(id, payload, url));
	}

	prerender_resources.set(cache_key, new WeakRef(resource));
	prerender_resource_cleanup?.register(resource, cache_key);

	return resource;
}

/**
 * @param {string} id
 * @returns {RemotePrerenderFunction<any, any>}
 */
export function prerender(id) {
	return (arg) => get_prerender_resource(id, stringify_remote_arg(arg, app.hooks.transport));
}

// Revive `[id, payload, 'p']` pointers (nested `prerender` results) into a Prerender resource.
register_pointer_reviver('p', (id, payload, initial) =>
	get_prerender_resource(id, payload, initial)
);

/** @type {Map<string, WeakRef<Prerender<any>>>} */
const prerender_resources = new Map();

/** @type {FinalizationRegistry<string> | null} */
const prerender_resource_cleanup =
	typeof FinalizationRegistry === 'undefined'
		? null
		: new FinalizationRegistry((cache_key) => {
				const ref = prerender_resources.get(cache_key);
				if (ref && ref.deref() === undefined) {
					prerender_resources.delete(cache_key);
				}
			});

/**
 * @template T
 * @implements {Promise<T>}
 */
class Prerender {
	/** @type {Promise<T>} */
	#promise;

	#loading = $state(true);
	#ready = $state(false);
	/** @type {T | undefined} */
	#current = $state.raw();

	#error = $state.raw(undefined);

	/**
	 * @param {() => Promise<T>} fn
	 * @param {{ type: 'result', value: T } | { type: 'error', error: any }} [body] when provided
	 *   (seeded from a side-channel), the resource resolves immediately and `fn` is never called
	 */
	constructor(fn, body) {
		if (body) {
			this.#loading = false;

			if (body.type === 'result') {
				this.#ready = true;
				this.#current = body.value;
				this.#promise = Promise.resolve(body.value);
			} else {
				this.#error = body.error;
				this.#promise = Promise.reject(body.error);
				this.#promise.catch(noop);
			}

			return;
		}

		this.#promise = fn().then(
			(value) => {
				this.#loading = false;
				this.#ready = true;
				this.#current = value;
				this.#error = undefined;
				return value;
			},
			(error) => {
				this.#loading = false;
				this.#error = error;
				throw error;
			}
		);
	}

	/**
	 *
	 * @param {((value: any) => any) | null | undefined} onfulfilled
	 * @param {((reason: any) => any) | null | undefined} [onrejected]
	 * @returns
	 */
	then(onfulfilled, onrejected) {
		return this.#promise.then(onfulfilled, onrejected);
	}

	/**
	 * @param {((reason: any) => any) | null | undefined} onrejected
	 */
	catch(onrejected) {
		return this.#promise.catch(onrejected);
	}

	/**
	 * @param {(() => any) | null | undefined} onfinally
	 */
	finally(onfinally) {
		return this.#promise.finally(onfinally);
	}

	get current() {
		return this.#current;
	}

	get error() {
		return this.#error;
	}

	/**
	 * Returns true if the resource is loading.
	 */
	get loading() {
		return this.#loading;
	}

	/**
	 * Returns true once the resource has been loaded.
	 */
	get ready() {
		return this.#ready;
	}

	get [Symbol.toStringTag]() {
		return 'Prerender';
	}
}
