/** @import { RemoteQueryFunction } from '@sveltejs/kit' */
/** @import { RemoteFunctionResponse } from 'types' */
/** @import { Resource } from 'svelte/reactivity' */
import { app_dir, base } from '$app/paths/internal/client';
import { app, goto, remote_responses } from '../client.js';
import { create_remote_function, remote_request } from './shared.svelte.js';
import * as devalue from 'devalue';
import { HttpError, Redirect } from '@sveltejs/kit/internal';
import { DEV } from 'esm-env';
import { resource } from 'svelte/reactivity';
import { hydratable } from 'svelte';
import { query_cache } from './query-cache.js';
import { QUERY_CACHE_DELIMITER, QUERY_CACHE_PREFIX } from '../../shared.js';

/**
 * @param {string} id
 * @returns {RemoteQueryFunction<any, any>}
 */
export function query(id) {
	if (DEV) {
		// If this reruns as part of HMR, refresh the query
		for (const [key, entry] of query_cache) {
			const cache_key = `${QUERY_CACHE_PREFIX}${QUERY_CACHE_DELIMITER}${id}`;
			if (key === cache_key || key.startsWith(cache_key + QUERY_CACHE_DELIMITER)) {
				// use optional chaining in case a prerender function was turned into a query
				entry.resource.refresh?.();
			}
		}
	}

	return create_remote_function(id, (cache_key, payload) => {
		return new Query(cache_key, async () => {
			if (Object.hasOwn(remote_responses, cache_key)) {
				return remote_responses[cache_key];
			}

			const url = `${base}/${app_dir}/remote/${id}${payload ? `?payload=${payload}` : ''}`;

			const result = await remote_request(url);
			return devalue.parse(result, app.decoders);
		});
	});
}

/**
 * @param {string} id
 * @returns {(arg: any) => Query<any>}
 */
export function query_batch(id) {
	/** @type {Map<string, Array<{resolve: (value: any) => void, reject: (error: any) => void}>>} */
	let batching = new Map();

	return create_remote_function(id, (cache_key, payload) => {
		return new Query(cache_key, () => {
			if (Object.hasOwn(remote_responses, cache_key)) {
				return remote_responses[cache_key];
			}

			// Collect all the calls to the same query in the same macrotask,
			// then execute them as one backend request.
			return new Promise((resolve, reject) => {
				// create_remote_function caches identical calls, but in case a refresh to the same query is called multiple times this function
				// is invoked multiple times with the same payload, so we need to deduplicate here
				const entry = batching.get(payload) ?? [];
				entry.push({ resolve, reject });
				batching.set(payload, entry);

				if (batching.size > 1) return;

				// Wait for the next macrotask - don't use microtask as Svelte runtime uses these to collect changes and flush them,
				// and flushes could reveal more queries that should be batched.
				setTimeout(async () => {
					const batched = batching;
					batching = new Map();

					try {
						const response = await fetch(`${base}/${app_dir}/remote/${id}`, {
							method: 'POST',
							body: JSON.stringify({
								payloads: Array.from(batched.keys())
							}),
							headers: {
								'Content-Type': 'application/json'
							}
						});

						if (!response.ok) {
							throw new Error('Failed to execute batch query');
						}

						const result = /** @type {RemoteFunctionResponse} */ (await response.json());
						if (result.type === 'error') {
							throw new HttpError(result.status ?? 500, result.error);
						}

						if (result.type === 'redirect') {
							await goto(result.location);
							throw new Redirect(307, result.location);
						}

						const results = devalue.parse(result.result, app.decoders);

						// Resolve individual queries
						// Maps guarantee insertion order so we can do it like this
						let i = 0;

						for (const resolvers of batched.values()) {
							for (const { resolve, reject } of resolvers) {
								if (results[i].type === 'error') {
									reject(new HttpError(results[i].status, results[i].error));
								} else {
									resolve(results[i].data);
								}
							}
							i++;
						}
					} catch (error) {
						// Reject all queries in the batch
						for (const resolver of batched.values()) {
							for (const { reject } of resolver) {
								reject(error);
							}
						}
					}
				}, 0);
			});
		});
	});
}

/**
 * @template T
 * @implements {Partial<Promise<Awaited<T>>>}
 */
export class Query {
	/** @type {string} */
	_key;

	/** @type {Array<(old: Awaited<T>) => Awaited<T>>} */
	#overrides = $state([]);

	/** @type {Resource<T>} */
	#resource;

	/**
	 * @param {string} key
	 * @param {() => T} fn
	 */
	constructor(key, fn) {
		this._key = key;
		this.#resource = resource(() =>
			hydratable(key, fn, { transport: { parse: (val) => devalue.parse(val, app.decoders) } })
		);
	}

	get then() {
		this.#overrides.length;
		/** @type {Resource<T>['then']} */
		return (onresolve, onreject) =>
			this.#resource.then(
				onresolve ? () => onresolve(/** @type {Awaited<T>} */ (this.current)) : undefined,
				onreject
			);
	}

	get catch() {
		this.#overrides.length;
		return this.#resource.catch;
	}

	get finally() {
		this.#overrides.length;
		return this.#resource.finally;
	}

	/** @type {T | undefined} */
	current = $derived.by(() => {
		// don't reduce undefined value
		if (!this.ready) return undefined;

		return this.#overrides.reduce(
			(v, r) => r(v),
			/** @type {Awaited<T>} */ (this.#resource.current)
		);
	});

	get error() {
		return this.#resource.error;
	}

	/**
	 * Returns true if the resource is loading or reloading.
	 */
	get loading() {
		return this.#resource.loading;
	}

	/**
	 * Returns true once the resource has been loaded for the first time.
	 */
	get ready() {
		return this.#resource.ready;
	}

	/**
	 * @returns {Promise<void>}
	 */
	refresh() {
		return this.#resource.refresh();
	}

	/**
	 * @param {Awaited<T>} value
	 */
	set(value) {
		return this.#resource.set(value);
	}

	/**
	 * @param {(old: Awaited<T>) => Awaited<T>} fn
	 */
	withOverride(fn) {
		this.#overrides.push(fn);

		return {
			_key: this._key,
			release: () => {
				const i = this.#overrides.indexOf(fn);

				if (i !== -1) {
					this.#overrides.splice(i, 1);
				}
			}
		};
	}
}
