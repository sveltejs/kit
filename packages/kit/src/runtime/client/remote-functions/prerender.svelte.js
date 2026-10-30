/** @import { RemotePrerenderFunction } from '$app/server' */
import { app_dir, base } from '#app/paths';
import { version } from '$app/env';
import * as devalue from 'devalue';
import { prerender_responses } from '../client.js';
import { on_remote_reset, remote_env, reset_generation } from '#internal/remote-env';
import { get_remote_request_headers, remote_request, unwrap_node } from './shared.svelte.js';
import { create_remote_key, stringify_remote_arg } from '../../shared.js';
import { noop } from '../../../utils/functions.js';
import { HandledHttpError } from '@sveltejs/kit/internal';

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
 * Cache API writes that have not finished yet. `reset_remote_state` waits for them
 * before it clears the cache, so that none of them can land after the reset
 * @type {Set<Promise<void>>}
 */
const pending_puts = new Set();

/**
 * @param {string} url
 * @param {string} encoded
 */
function put(url, encoded) {
	const promise = /** @type {Cache} */ (prerender_cache)
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
		})
		.finally(() => pending_puts.delete(promise));

	pending_puts.add(promise);
	return promise;
}

/**
 * @param {string} id
 * @returns {RemotePrerenderFunction<any, any>}
 */
export function prerender(id) {
	return (arg) => {
		const payload = stringify_remote_arg(arg);
		const cache_key = create_remote_key(id, payload);

		let resource = prerender_resources.get(cache_key)?.deref();

		if (!resource) {
			resource = new Prerender(async () => {
				const generation = reset_generation;

				await prerender_cache_ready;

				const url = `${base}/${app_dir}/remote/${id}${payload ? `/${payload}` : ''}`;

				if (Object.hasOwn(prerender_responses, cache_key)) {
					const data = unwrap_node(prerender_responses[cache_key]);

					if (prerender_cache && generation === reset_generation) {
						void put(url, devalue.stringify(data, remote_env.encoders));
					}

					return data;
				}

				// Do this here, after await Svelte' reactivity context is gone.
				// TODO we really don't want to be sending these specific headers here?
				const headers = get_remote_request_headers();

				// Check the Cache API first
				if (prerender_cache) {
					try {
						const cached_response = await prerender_cache.match(url);

						if (cached_response) {
							const cached_result = await cached_response.text();
							return devalue.parse(cached_result, remote_env.decoders);
						}
					} catch {
						void prerender_cache.delete(url);
					}
				}

				const result = await remote_request(url, { headers });

				if (result.redirect) {
					// Use internal version to allow redirects to external URLs
					await remote_env.goto(result.redirect);
					return;
				}

				const data = result._;

				// For successful prerender requests, save to cache, unless a reset
				// happened in the meantime and the next reader expects an empty cache
				if (prerender_cache && generation === reset_generation) {
					void put(url, devalue.stringify(data, remote_env.encoders));
				}

				return data;
			});

			prerender_resources.set(cache_key, new WeakRef(resource));
			prerender_resource_cleanup.register(resource, cache_key);
		}

		return resource;
	};
}

/** @type {Map<string, WeakRef<Prerender<any>>>} */
const prerender_resources = new Map();

on_remote_reset(async () => {
	prerender_resources.clear();

	await prerender_cache_ready;
	await Promise.all(pending_puts);

	if (prerender_cache) {
		const cache = prerender_cache;
		const requests = await cache.keys();
		await Promise.all(requests.map((request) => cache.delete(request)));
	}
});

const prerender_resource_cleanup = new FinalizationRegistry((/** @type {string} */ cache_key) => {
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

	/** @type {App.Error | undefined} */
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
			async (e) => {
				const error = await remote_env.handle_error(e, {
					params: {},
					route: { id: null },
					url: new URL(location.href)
				});
				this.#loading = false;
				this.#error = error;
				throw new HandledHttpError(error);
			}
		);

		// rejections are surfaced via `.error` for reactive consumers — make sure the
		// stored promise (consumed without `await`) never becomes an unhandled rejection
		this.#promise.catch(noop);
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
