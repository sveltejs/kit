/** @import { RemoteQueryFunction } from '@sveltejs/kit' */
/** @import { RemoteFunctionResponse } from 'types' */
import { app_dir, base } from '$app/paths/internal/client';
import { app, goto, query_map, query_responses } from '../client.js';
import { get_remote_request_headers, remote_request } from './shared.svelte.js';
import * as devalue from 'devalue';
import { HttpError, Redirect } from '@sveltejs/kit/internal';
import { DEV } from 'esm-env';
import { with_resolvers } from '../../../utils/promise.js';
import { tick, untrack } from 'svelte';
import { create_remote_key, stringify_remote_arg, unfriendly_hydratable } from '../../shared.js';

/**
 * @template T
 * @typedef {{
 *   count: number;
 *   alive: boolean;
 *   resource: Query<T>;
 *   cleanup: () => void;
 * }} RemoteQueryCacheEntry
 */

/**
 * @returns {boolean} Returns `true` if we are in an effect
 */
function is_in_effect() {
	try {
		$effect.pre(() => {});
		return true;
	} catch {
		return false;
	}
}

/**
 * @param {string} id
 * @returns {RemoteQueryFunction<any, any>}
 */
export function query(id) {
	if (DEV) {
		// If this reruns as part of HMR, refresh the query
		for (const [key, entry] of query_map) {
			if (key === id || key.startsWith(id + '/')) {
				// use optional chaining in case a prerender function was turned into a query
				void entry.resource.refresh?.();
			}
		}
	}

	return create_query_function(id, async (key, payload) => {
		const url = `${base}/${app_dir}/remote/${id}${payload ? `?payload=${payload}` : ''}`;

		const serialized = await unfriendly_hydratable(key, () =>
			remote_request(url, get_remote_request_headers())
		);

		return devalue.parse(serialized, app.decoders);
	});
}

/**
 * @param {string} id
 * @returns {RemoteQueryFunction<any, any>}
 */
export function query_batch(id) {
	/** @type {Map<string, Array<{resolve: (value: any) => void, reject: (error: any) => void}>>} */
	// eslint-disable-next-line svelte/prefer-svelte-reactivity -- we don't need reactivity for this
	let batching = new Map();

	return create_query_function(id, async (key, payload) => {
		const serialized = await unfriendly_hydratable(
			key,
			() =>
				new Promise((resolve, reject) => {
					// create_remote_function caches identical calls, but in case a refresh to the same query is called multiple times this function
					// is invoked multiple times with the same payload, so we need to deduplicate here
					const entry = batching.get(payload) ?? [];
					entry.push({ resolve, reject });
					batching.set(payload, entry);

					if (batching.size > 1) return;

					// Do this here, after await Svelte' reactivity context is gone.
					// TODO is it possible to have batches of the same key
					// but in different forks/async contexts and in the same macrotask?
					// If so this would potentially be buggy
					const headers = {
						'Content-Type': 'application/json',
						...get_remote_request_headers()
					};

					// Wait for the next macrotask - don't use microtask as Svelte runtime uses these to collect changes and flush them,
					// and flushes could reveal more queries that should be batched.
					setTimeout(async () => {
						const batched = batching;
						// eslint-disable-next-line svelte/prefer-svelte-reactivity
						batching = new Map();

						try {
							const response = await fetch(`${base}/${app_dir}/remote/${id}`, {
								method: 'POST',
								body: JSON.stringify({
									payloads: Array.from(batched.keys())
								}),
								headers
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
				})
		);

		return devalue.parse(serialized, app.decoders);
	});
}

/**
 * @template Input
 * @template Output
 * @param {string} id
 * @param {(key: string, payload: string) => Promise<Output>} fn
 * @returns {(arg: Input) => Query<Output>}
 */
function create_query_function(id, fn) {
	return (arg) => {
		const payload = stringify_remote_arg(arg, app.hooks.transport);
		const key = create_remote_key(id, payload);

		if (is_in_effect()) {
			let cached = query_map.get(key);

			if (!cached) {
				const c = (cached = {
					count: 0,
					alive: true,
					resource: /** @type {Query<Output>} */ (/** @type {unknown} */ (null)),
					cleanup: /** @type {() => void} */ (/** @type {unknown} */ (null))
				});

				c.cleanup = $effect.root(() => {
					c.resource = new Query(key, c, () => fn(key, payload));
				});

				query_map.set(key, cached);
			}

			cached.count += 1;

			$effect.pre(() => () => {
				cached.count -= 1;

				void tick().then(() => {
					if (cached.count === 0) {
						cached.alive = false;
						cached.cleanup();

						query_map.delete(key);
					}
				});
			});

			return cached.resource;
		} else {
			return new Query(key, null, () => fn(key, payload));
		}
	};
}

/**
 * @template T
 * @implements {Promise<T>}
 */
export class Query {
	/**
	 * @readonly
	 * @type {string}
	 */
	_key;

	/** @type {RemoteQueryCacheEntry<T> | null} */
	#cached;

	/** @type {boolean} */
	#init = false;
	/** @type {() => Promise<T>} */
	#fn;
	#loading = $state(true);
	/** @type {Array<(value: undefined) => void>} */
	#latest = [];

	/** @type {boolean} */
	#ready = $state(false);
	/** @type {T | undefined} */
	#raw = $state.raw();
	/** @type {Promise<void> | null} */
	#promise = $state.raw(null);
	/** @type {Array<(old: T) => T>} */
	#overrides = $state([]);

	/** @type {T | undefined} */
	#current = $derived.by(() => {
		// don't reduce undefined value
		if (!this.#ready) return undefined;

		return this.#overrides.reduce((v, r) => r(v), /** @type {T} */ (this.#raw));
	});

	#error = $state.raw(undefined);

	/** @type {Promise<T>['then']} */
	// @ts-expect-error TS doesn't understand that the promise returns something
	#then = $derived.by(() => {
		this.#check();

		this.#overrides.length;

		const p = this.#get_promise();

		return (resolve, reject) => {
			const result = (async () => {
				await p;
				// svelte-ignore await_reactivity_loss
				await tick();
				return /** @type {T} */ (this.#current);
			})();

			if (resolve || reject) {
				return result.then(resolve, reject);
			}

			return result;
		};
	});

	/**
	 * @param {string} key
	 * @param {RemoteQueryCacheEntry<T> | null} cached
	 * @param {() => Promise<T>} fn
	 */
	constructor(key, cached, fn) {
		this._key = key;
		this.#cached = cached;
		this.#fn = fn;
	}

	/**
	 * Disallows certain methods/properties if the query was created in a non-reactive context, or is destroyed
	 */
	#check() {
		// TODO iterate on error messages
		if (!this.#cached) {
			throw new Error(
				'This query was not created in a reactive context and is limited to calling `.run`, `.refresh`, and `.set`.'
			);
		}

		if (!this.#cached.alive) {
			throw new Error(
				'This query instance is no longer active and can no longer be used for reactive state access. ' +
					'This typically means you created the query in a tracking context and stashed it somewhere outside of a tracking context.'
			);
		}
	}

	#get_promise() {
		void untrack(() => (this.#promise ??= this.#run()));
		return /** @type {Promise<T>} */ (this.#promise);
	}

	#run() {
		// Prevent state_unsafe_mutation error on first run when the resource is created within the template
		if (this.#init) {
			this.#loading = true;
		} else {
			this.#init = true;
		}

		const { promise, resolve, reject } = with_resolvers();

		this.#latest.push(resolve);

		Promise.resolve(this.#fn())
			.then((value) => {
				// Skip the response if resource was refreshed with a later promise while we were waiting for this one to resolve
				const idx = this.#latest.indexOf(resolve);
				if (idx === -1) return;

				this.#latest.splice(0, idx).forEach((r) => r(undefined));
				this.#ready = true;
				this.#loading = false;
				this.#raw = value;
				this.#error = undefined;

				resolve(undefined);
			})
			.catch((e) => {
				const idx = this.#latest.indexOf(resolve);
				if (idx === -1) return;

				this.#latest.splice(0, idx).forEach((r) => r(undefined));
				this.#error = e;
				this.#loading = false;
				reject(e);
			});

		return promise;
	}

	/** @returns {Promise<T>} */
	run() {
		if (Object.hasOwn(query_responses, this._key)) {
			return Promise.resolve(query_responses[this._key]);
		}
		return this.#fn();
	}

	get then() {
		return this.#then;
	}

	get catch() {
		this.#then;
		return (/** @type {any} */ reject) => {
			return this.#then(undefined, reject);
		};
	}

	get finally() {
		this.#then;
		return (/** @type {any} */ fn) => {
			return this.#then(
				(value) => {
					fn();
					return value;
				},
				(error) => {
					fn();
					throw error;
				}
			);
		};
	}

	get current() {
		this.#check();
		return this.#current;
	}

	get error() {
		this.#check();
		return this.#error;
	}

	/**
	 * Returns true if the resource is loading or reloading.
	 */
	get loading() {
		this.#check();
		return this.#loading;
	}

	/**
	 * Returns true once the resource has been loaded for the first time.
	 */
	get ready() {
		this.#check();
		return this.#ready;
	}

	/**
	 * @returns {Promise<void>}
	 */
	refresh() {
		if (!this.#cached) {
			return query_map.get(this._key)?.resource.refresh() ?? Promise.resolve();
		}

		delete query_responses[this._key];
		return (this.#promise = this.#run());
	}

	/**
	 * @param {T} value
	 */
	set(value) {
		if (!this.#cached) {
			query_map.get(this._key)?.resource.set(value);
			return;
		}

		this.#ready = true;
		this.#loading = false;
		this.#error = undefined;
		this.#raw = value;
		this.#promise = Promise.resolve();
	}

	/**
	 * @param {(old: T) => T} fn
	 * @returns {{ _key: string, release: () => void }}
	 */
	withOverride(fn) {
		if (!this.#cached) {
			const cached = query_map.get(this._key);

			if (cached) {
				return cached.resource.withOverride(fn);
			}
		}

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

	get [Symbol.toStringTag]() {
		return 'Query';
	}
}
