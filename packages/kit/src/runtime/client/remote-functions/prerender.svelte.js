/** @import { RemotePrerenderFunction } from '@sveltejs/kit' */
import { app_dir, base } from '$app/paths/internal/client';
import { version } from '__sveltekit/environment';
import * as devalue from 'devalue';
import { DEV } from 'esm-env';
import { app, prerender_responses } from '../client.js';
import { get_remote_request_headers, remote_request } from './shared.svelte.js';
import { create_remote_key, stringify_remote_arg } from '../../shared.js';

// Initialize Cache API for prerender functions
const CACHE_NAME = DEV ? `sveltekit:${Date.now()}` : `sveltekit:${version}`;
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
 * @param {string} id
 * @returns {RemotePrerenderFunction<any, any>}
 */
export function prerender(id) {
	return (arg) => {
		const payload = stringify_remote_arg(arg, app.hooks.transport);
		const cache_key = create_remote_key(id, payload);

		let resource = prerender_resources.get(cache_key)?.deref();

		if (!resource) {
			resource = new Prerender(async () => {
				await prerender_cache_ready;

				const url = `${base}/${app_dir}/remote/${id}${payload ? `/${payload}` : ''}`;

				if (Object.hasOwn(prerender_responses, cache_key)) {
					const data = prerender_responses[cache_key];

					if (prerender_cache) {
						void put(url, devalue.stringify(data, app.encoders));
					}

					return data;
				}

				// Do this here, after await Svelte' reactivity context is gone.
				const headers = get_remote_request_headers();

				// Check the Cache API first
				if (prerender_cache) {
					try {
						const cached_response = await prerender_cache.match(url);

						if (cached_response) {
							const cached_result = await cached_response.text();
							return devalue.parse(cached_result, app.decoders);
						}
					} catch {
						void prerender_cache.delete(url);
					}
				}

				const encoded = await remote_request(url, headers);

				// For successful prerender requests, save to cache
				if (prerender_cache) {
					void put(url, encoded);
				}

				return devalue.parse(encoded, app.decoders);
			});

			prerender_resources.set(cache_key, new WeakRef(resource));
			prerender_resource_cleanup?.register(resource, cache_key);
		}

		return resource;
	};
}

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
	 */
	constructor(fn) {
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
