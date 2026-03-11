/** @import { RemoteQueryFunction } from '@sveltejs/kit' */
/** @import { RemoteFunctionResponse } from 'types' */
import { app_dir, base } from '$app/paths/internal/client';
import { app, goto, query_map, remote_responses } from '../client.js';
import {
	create_remote_function,
	get_remote_request_headers,
	remote_request,
	unfriendly_hydratable
} from './shared.svelte.js';
import * as devalue from 'devalue';
import { HttpError, Redirect } from '@sveltejs/kit/internal';
import { DEV } from 'esm-env';
import { with_resolvers } from '../../../utils/promise.js';
import { tick } from 'svelte';

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
				entry.resource.refresh?.();
			}
		}
	}

	const fn = create_remote_function(
		id,
		({ cache_key, payload }) => {
			return new Query(cache_key, async () => {
				return unfriendly_hydratable(cache_key, async () => {
					const url = `${base}/${app_dir}/remote/${id}${payload ? `?payload=${payload}` : ''}`;
					const result = await remote_request(url, get_remote_request_headers());
					return devalue.parse(result, app.decoders);
				});
			});
		},
		({ cache_key, get_resource }) => {
			return new LimitedQuery(cache_key, get_resource);
		}
	);

	return fn;
}

/**
 * @param {string} id
 * @returns {RemoteQueryFunction<any, any>}
 */
export function query_batch(id) {
	/** @type {Map<string, Array<{resolve: (value: any) => void, reject: (error: any) => void}>>} */
	// eslint-disable-next-line svelte/prefer-svelte-reactivity -- we don't need reactivity for this
	let batching = new Map();

	const fn = create_remote_function(
		id,
		({ cache_key, payload }) => {
			return new Query(cache_key, () => {
				/** @returns {Promise<any>} */
				const fetch_fn = () => {
					// Collect all the calls to the same query in the same macrotask,
					// then execute them as one backend request.
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
				};

				return unfriendly_hydratable(cache_key, fetch_fn);
			});
		},
		({ cache_key, get_resource }) => {
			return new LimitedQuery(cache_key, get_resource);
		}
	);

	return fn;
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
	/** @type {Promise<void>} */
	#promise;
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
		const p = this.#promise;
		this.#overrides.length;

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
	 * @param {() => Promise<T>} fn
	 */
	constructor(key, fn) {
		this._key = key;
		this.#fn = fn;
		this.#promise = $state.raw(this.#run());
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
		if (Object.hasOwn(remote_responses, this._key)) {
			return Promise.resolve(remote_responses[this._key]);
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
		return this.#current;
	}

	get error() {
		return this.#error;
	}

	/**
	 * Returns true if the resource is loading or reloading.
	 */
	get loading() {
		return this.#loading;
	}

	/**
	 * Returns true once the resource has been loaded for the first time.
	 */
	get ready() {
		return this.#ready;
	}

	/**
	 * @returns {Promise<void>}
	 */
	refresh() {
		delete remote_responses[this._key];
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
 * @template T
 * @implements {Promise<T>}
 */
class LimitedQuery {
	/** @type {string} */
	_key;

	/** @type {() => { cached: boolean, resource: Query<T> }} */
	#get_query;

	/** @returns {never} */
	#limited_error() {
		throw new Error(
			'This query was not created in a reactive context and is limited to calling `.run`, `.refresh`, and `.set`.'
		);
	}

	/**
	 * @param {string} key
	 * @param {() => { cached: boolean, resource: Query<T> }} get_query
	 */
	constructor(key, get_query) {
		this._key = key;
		this.#get_query = get_query;
	}

	/** @returns {Promise<T>} */
	run() {
		return this.#get_query().resource.run();
	}

	/** @type {Promise<T>['then']} */
	then() {
		this.#limited_error();
	}

	/** @type {Promise<T>['catch']} */
	catch() {
		this.#limited_error();
	}

	/** @type {Promise<T>['finally']} */
	finally() {
		this.#limited_error();
	}

	/** @type {Query<T>['current']} */
	get current() {
		return this.#limited_error();
	}

	/** @type {Query<T>['error']} */
	get error() {
		return this.#limited_error();
	}

	/** @type {Query<T>['loading']} */
	get loading() {
		return this.#limited_error();
	}

	/** @type {Query<T>['ready']} */
	get ready() {
		return this.#limited_error();
	}

	/** @type {Query<T>['refresh']} */
	refresh() {
		const query = this.#get_query();
		if (!query.cached) {
			return Promise.resolve();
		}
		return query.resource.refresh();
	}

	/** @type {Query<T>['set']} */
	set(value) {
		const query = this.#get_query();
		if (!query.cached) {
			return;
		}
		query.resource.set(value);
	}

	/** @type {Query<T>['withOverride']} */
	withOverride() {
		this.#limited_error();
	}

	get [Symbol.toStringTag]() {
		return 'LimitedQuery';
	}
}
