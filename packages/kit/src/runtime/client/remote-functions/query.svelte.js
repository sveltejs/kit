/** @import { RemoteQueryFunction } from '@sveltejs/kit' */
/** @import { RemoteFunctionResponse } from 'types' */
import { app_dir, base } from '$app/paths/internal/client';
import { app, query_map, query_responses } from '../client.js';
import {
	get_remote_request_headers,
	handle_remote_redirect,
	is_in_effect,
	register_fork,
	remote_request
} from './shared.svelte.js';
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
 *   resource: Query<T>;
 *   cleanup: () => void;
 * }} RemoteQueryCacheEntry
 */

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

	return (arg) => {
		return new QueryProxy(id, arg, async (key, payload) => {
			const url = `${base}/${app_dir}/remote/${id}${payload ? `?payload=${payload}` : ''}`;

			const serialized = await unfriendly_hydratable(key, () =>
				remote_request(url, get_remote_request_headers(), key)
			);

			return devalue.parse(serialized, app.decoders);
		});
	};
}

/**
 * @param {string} id
 * @returns {RemoteQueryFunction<any, any>}
 */
export function query_batch(id) {
	/** @type {Map<string, Array<{resolve: (value: any) => void, reject: (error: any) => void}>>} */
	// eslint-disable-next-line svelte/prefer-svelte-reactivity -- we don't need reactivity for this
	let batching = new Map();

	return (arg) => {
		return new QueryProxy(id, arg, async (key, payload) => {
			const serialized = await unfriendly_hydratable(key, () => {
				return new Promise((resolve, reject) => {
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
								return handle_remote_redirect(key, result.location);
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

			return devalue.parse(serialized, app.decoders);
		});
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
		const p = this.#get_promise();
		this.#overrides.length;

		return (resolve, reject) => {
			const result = p.then(tick).then(() => /** @type {T} */ (this.#current));

			if (resolve || reject) {
				return result.then(resolve, reject);
			}

			return result;
		};
	});

	/**
	 * @param {string} key
	 * @param {() => Promise<T>} fn
	 */
	constructor(key, fn) {
		this._key = key;
		this.#fn = fn;
	}

	#get_promise() {
		void untrack(() => (this.#promise ??= this.#run()));
		return /** @type {Promise<T>} */ (this.#promise);
	}

	#start() {
		// there is a really weird bug with untrack and writes and initializations
		// every time you see this comment, try removing the `tick.then` here and see
		// if all the tests still pass with the latest svelte version
		// if they do, congrats, you can remove tick.then
		void tick().then(() => this.#get_promise());
	}

	#run() {
		this.#loading = true;

		const { promise, resolve, reject } = with_resolvers();

		this.#latest.push(resolve);

		Promise.resolve(this.#fn())
			.then((value) => {
				// Skip the response if resource was refreshed with a later promise while we were waiting for this one to resolve
				const idx = this.#latest.indexOf(resolve);
				if (idx === -1) return;

				// Untrack this to not trigger mutation validation errors which can occur if you do e.g. $derived({ a: await queryA(), b: await queryB() })
				untrack(() => {
					this.#latest.splice(0, idx).forEach((r) => r(undefined));
					this.#ready = true;
					this.#loading = false;
					this.#raw = value;
					this.#error = undefined;
				});

				resolve(undefined);
			})
			.catch((e) => {
				const idx = this.#latest.indexOf(resolve);
				if (idx === -1) return;

				untrack(() => {
					this.#latest.splice(0, idx).forEach((r) => r(undefined));
					this.#error = e;
					this.#loading = false;
				});

				if (e instanceof Redirect) this.#promise = null; // allow retries after redirects

				reject(e);
			});

		return promise;
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
		this.#start();
		return this.#current;
	}

	get error() {
		this.#start();
		return this.#error;
	}

	/**
	 * Returns true if the resource is loading or reloading.
	 */
	get loading() {
		this.#start();
		return this.#loading;
	}

	/**
	 * Returns true once the resource has been loaded for the first time.
	 */
	get ready() {
		this.#start();
		return this.#ready;
	}

	/**
	 * @returns {Promise<void>}
	 */
	refresh() {
		delete query_responses[this._key];
		return (this.#promise = this.#run());
	}

	/**
	 * @param {T} value
	 */
	set(value) {
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

/**
 * Manages the caching layer between the user and the actual {@link Query} instance.
 *
 * @template T
 * @implements {Promise<T>}
 */
class QueryProxy {
	_key;
	#payload;
	#fn;
	#active = true;
	/** @type {(() => void) | null} */
	#release_fork = null;
	/**
	 * Whether this proxy was created in a tracking context.
	 * @readonly
	 */
	#tracking = is_in_effect();

	/**
	 * @param {string} id
	 * @param {any} arg
	 * @param {(key: string, payload: string) => Promise<T>} fn
	 */
	constructor(id, arg, fn) {
		this.#payload = stringify_remote_arg(arg, app.hooks.transport);
		this._key = create_remote_key(id, this.#payload);
		this.#fn = fn;

		if (!this.#tracking) {
			this.#active = false;
			return;
		}

		// A bit duplicative with #get_or_create_cache_entry but this way we can reuse
		// register_fork in the remote prerender function, too.
		this.#release_fork = register_fork(this._key);

		const entry = this.#get_or_create_cache_entry();

		$effect.pre(() => () => {
			/** @type {() => void} */ (this.#release_fork)();

			const die = this.#release(entry);
			void tick().then(die);
		});
	}

	/** @returns {RemoteQueryCacheEntry<T>} */
	#get_or_create_cache_entry() {
		let cached = query_map.get(this._key);

		if (!cached) {
			const c = (cached = {
				count: 0,
				resource: /** @type {Query<T>} */ (/** @type {unknown} */ (null)),
				cleanup: /** @type {() => void} */ (/** @type {unknown} */ (null))
			});

			c.cleanup = $effect.root(() => {
				c.resource = new Query(this._key, () => this.#fn(this._key, this.#payload));
			});

			query_map.set(this._key, cached);
		}

		cached.count += 1;

		return cached;
	}

	/**
	 * @param {RemoteQueryCacheEntry<T>} entry
	 * @param {boolean} [deactivate]
	 * @returns
	 */
	#release(entry, deactivate = true) {
		this.#active &&= !deactivate;
		entry.count -= 1;

		return () => {
			// have to get this again in case it was cleaned up by someone else, then re-added and now
			// we're cleaning it up. this seems extremely unlikely but it literally can't hurt
			const cached = query_map.get(this._key);
			if (cached?.count === 0) {
				cached.cleanup();
				query_map.delete(this._key);
			}
		};
	}

	#get_cached_query() {
		// TODO iterate on error messages
		if (!this.#tracking) {
			throw new Error(
				'This query was not created in a reactive context and is limited to calling `.run`, `.refresh`, and `.set`.'
			);
		}

		if (!this.#active) {
			throw new Error(
				'This query instance is no longer active and can no longer be used for reactive state access. ' +
					'This typically means you created the query in a tracking context and stashed it somewhere outside of a tracking context.'
			);
		}

		const cached = query_map.get(this._key);

		if (!cached) {
			// The only case where `this.#active` can be `true` is when we've added an entry to `query_map`, and the
			// only way that entry can get removed is if this instance (and all others) have been deactivated.
			// So if we get here, someone (us, check git blame and point fingers) did `entry.count -= 1` improperly.
			throw new Error(
				'No cached query found. This should be impossible. Please file a bug report.'
			);
		}

		return cached.resource;
	}

	#safe_get_cached_query() {
		return query_map.get(this._key)?.resource;
	}

	get current() {
		return this.#get_cached_query().current;
	}

	get error() {
		return this.#get_cached_query().error;
	}

	get loading() {
		return this.#get_cached_query().loading;
	}

	get ready() {
		return this.#get_cached_query().ready;
	}

	run() {
		if (is_in_effect()) {
			throw new Error(
				'On the client, .run() can only be called outside render, e.g. in universal `load` functions and event handlers. In render, await the query directly'
			);
		}

		if (Object.hasOwn(query_responses, this._key)) {
			return Promise.resolve(query_responses[this._key]);
		}
		return this.#fn(this._key, this.#payload);
	}

	refresh() {
		return this.#safe_get_cached_query()?.refresh() ?? Promise.resolve();
	}

	/** @type {Query<T>['set']} */
	set(value) {
		this.#safe_get_cached_query()?.set(value);
	}

	/** @type {Query<T>['withOverride']} */
	withOverride(fn) {
		const entry = this.#get_or_create_cache_entry();
		const override = entry.resource.withOverride(fn);

		return {
			_key: override._key,
			release: () => {
				override.release();
				this.#release(entry, false)();
			}
		};
	}

	/** @type {Query<T>['then']} */
	get then() {
		const cached = this.#get_cached_query();
		return cached.then.bind(cached);
	}

	/** @type {Query<T>['catch']} */
	get catch() {
		const cached = this.#get_cached_query();
		return cached.catch.bind(cached);
	}

	/** @type {Query<T>['finally']} */
	get finally() {
		const cached = this.#get_cached_query();
		return cached.finally.bind(cached);
	}

	get [Symbol.toStringTag]() {
		return 'QueryProxy';
	}
}
