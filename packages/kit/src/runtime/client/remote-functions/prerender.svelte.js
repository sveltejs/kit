/** @import { RemoteFunctionResponse } from 'types' */
/** @import { Resource } from 'svelte/reactivity' */
import { app_dir, base } from '$app/paths/internal/client';
import { version } from '__sveltekit/environment';
import * as devalue from 'devalue';
import { DEV } from 'esm-env';
import { app, remote_responses } from '../client.js';
import { create_remote_function, remote_request } from './shared.svelte.js';
import { hydratable } from 'svelte';
import { resource } from 'svelte/reactivity';

// Initialize Cache API for prerender functions
const CACHE_NAME = `sveltekit:${version}`;
/** @type {Cache | undefined} */
let prerender_cache;

void (async () => {
	if (!DEV && typeof caches !== 'undefined') {
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
 * @template T
 * @implements {Partial<Promise<T>>}
 */
class Prerender {
	/** @type {Resource<T>} */
	#resource;

	/**
	 * @param {string} key
	 * @param {() => Promise<T>} fn
	 */
	constructor(key, fn) {
		this.#resource = resource(() => hydratable(key, fn));
	}

	/**
	 *
	 * @param {((value: any) => any) | null | undefined} onfulfilled
	 * @param {((reason: any) => any) | null | undefined} [onrejected]
	 * @returns
	 */
	then(onfulfilled, onrejected) {
		return this.#resource.then(onfulfilled, onrejected);
	}

	/**
	 * @param {((reason: any) => any) | null | undefined} onrejected
	 */
	catch(onrejected) {
		return this.#resource.catch(onrejected);
	}

	/**
	 * @param {(() => any) | null | undefined} onfinally
	 */
	finally(onfinally) {
		return this.#resource.finally(onfinally);
	}

	get current() {
		return this.#resource.current;
	}

	get error() {
		return this.#resource.error;
	}

	/**
	 * Returns true if the resource is loading.
	 */
	get loading() {
		return this.#resource.loading;
	}

	/**
	 * Returns true once the resource has been loaded.
	 */
	get ready() {
		return this.#resource.ready;
	}
}

/**
 * @param {string} id
 */
export function prerender(id) {
	return create_remote_function(id, (cache_key, payload) => {
		return new Prerender(cache_key, async () => {
			if (Object.hasOwn(remote_responses, cache_key)) {
				return remote_responses[cache_key];
			}

			const url = `${base}/${app_dir}/remote/${id}${payload ? `/${payload}` : ''}`;

			// Check the Cache API first
			if (prerender_cache) {
				try {
					const cached_response = await prerender_cache.match(url);
					if (cached_response) {
						const cached_result = /** @type { RemoteFunctionResponse & { type: 'result' } } */ (
							await cached_response.json()
						);
						return devalue.parse(cached_result.result, app.decoders);
					}
				} catch {
					// Nothing we can do here
				}
			}

			const result = await remote_request(url);

			// For successful prerender requests, save to cache
			if (prerender_cache) {
				try {
					await prerender_cache.put(
						url,
						// We need to create a new response because the original response is already consumed
						new Response(JSON.stringify(result), {
							headers: {
								'Content-Type': 'application/json'
							}
						})
					);
				} catch {
					// Nothing we can do here
				}
			}

			return result;
		});
	});
}
