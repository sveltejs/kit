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

const query_proxy_options = {
	tracking_only_properties: new Set([
		'then',
		'catch',
		'finally',
		'current',
		'error',
		'loading',
		'ready'
	]),
	limited_error:
		// TODO same as below
		'This query was not created in a reactive context and is limited to calling `.run`, `.refresh`, and `.set`.',
	deactivated_error:
		// TODO this error needs work -- ideally it's just a sentence and a link to docs
		'This query instance is no longer active and can no longer be used for reactive state access. ' +
		'This typically means you created the query in a tracking context and stashed it somewhere outside of a tracking context.'
};

const raw_hydratable_result = Symbol();

/**
 * Client helper for hydratable data with transport support.
 * Decodes only when hydratable returns serialized data from SSR.
 *
 * @template T
 * @param {string} key
 * @param {Record<string, (value: any) => any>} decoders
 * @param {() => T | Promise<T>} fn
 * @returns {Promise<T>}
 */
function client_hydratable_transport(key, decoders, fn) {
	return Promise.resolve(
		/** @type {Promise<{ value: any } | string>} */ (
			unfriendly_hydratable(key, () =>
				Promise.resolve(fn()).then((value) => ({ [raw_hydratable_result]: true, value }))
			)
		)
	).then((value) => {
		if (typeof value === 'object' && value && Object.hasOwn(value, raw_hydratable_result)) {
			return value.value;
		}

		return devalue.parse(/** @type {string} */ (value), decoders);
	});
}

/**
 * @param {() => void} noop
 * @returns {boolean} Whether the pre effect was added successfully (indicates we are in a tracking context)
 */
function safe_pre_effect(noop = () => {}) {
	try {
		$effect.pre(noop);
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
				entry.resource.refresh?.();
			}
		}
	}

	const fn = create_query_function(id, ({ cache_key, payload }) => {
		return new Query(cache_key, async () => {
			const url = `${base}/${app_dir}/remote/${id}${payload ? `?payload=${payload}` : ''}`;

			return client_hydratable_transport(cache_key, app.decoders, async () => {
				const serialized = await remote_request(url, get_remote_request_headers());
				return devalue.parse(serialized, app.decoders);
			});
		});
	});

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

	const fn = create_query_function(id, ({ cache_key, payload }) => {
		return new Query(cache_key, () => {
			return client_hydratable_transport(
				cache_key,
				app.decoders,
				() =>
					/** @type {Promise<any>} */ (
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
					)
			);
		});
	});

	return fn;
}

/**
 * @template {(arg: { cache_key: string; payload: string }) => Query<any>} Create
 * @template [Arg=any]
 * @param {string} id
 * @param {Create} create
 * @returns {(arg: Arg) => ReturnType<Create>}
 */
function create_query_function(id, create) {
	return (arg) => {
		const payload = stringify_remote_arg(arg, app.hooks.transport);
		const cache_key = create_remote_key(id, payload);

		const tracking = safe_pre_effect();
		let active = true;

		let cache_entry = query_map.get(cache_key);
		let resource = cache_entry?.resource;
		let cleanup = cache_entry?.cleanup ?? (() => {});
		if (!resource) {
			if (tracking) {
				// this prevents the created resource from being associated with its current parent effect,
				// which is basically just coincidentally whichever effect is active when it's created
				cleanup = $effect.root(() => {
					resource = create({ cache_key, payload });
				});
			} else {
				resource = create({ cache_key, payload });
			}
		}

		const get_resource = () => {
			const cache_entry = query_map.get(cache_key);

			return {
				cached: !!cache_entry,
				resource: cache_entry?.resource ?? resource
			};
		};

		const wrapper = new Proxy(resource, {
			get(_, property) {
				const { cached, resource } = get_resource();
				const tracking_only = query_proxy_options.tracking_only_properties.has(
					/** @type {string} */ (property)
				);

				if (tracking_only) {
					if (!active) {
						throw new Error(query_proxy_options.deactivated_error);
					}

					if (!tracking) {
						throw new Error(query_proxy_options.limited_error);
					}
				}

				// TODO: calling `withOverride` while `cached` is false needs to create the resource
				// and cache it for the duration of the override. This can be a followup as it's not any buggier
				// than it is today
				if (property === 'refresh' || property === 'set') {
					if (!cached) {
						return {
							set: () => {},
							refresh: () => Promise.resolve()
						}[property];
					}

					return resource[property]?.bind(resource);
				}

				const value = resource[property];

				if (typeof value === 'function') {
					return value.bind(resource);
				}

				return value;
			}
		});

		if (tracking) {
			if (!cache_entry) {
				cache_entry = { count: 0, resource, cleanup };
				// we need to set this synchronously to avoid possibly creating
				// multiple resources for subsequent synchronous calls with the same payload
				query_map.set(cache_key, cache_entry);
			}

			cache_entry.count += 1;

			$effect.pre(() => () => {
				active = false;

				const cache_entry = query_map.get(cache_key);
				if (!cache_entry) return;
				cache_entry.count -= 1;
				void tick().then(() => {
					const cache_entry = query_map.get(cache_key);
					if (cache_entry?.count === 0) {
						cache_entry.cleanup();
						query_map.delete(cache_key);
					}
				});
			});

			return wrapper;
		}

		return wrapper;
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
		const p = this.#get_promise();
		// eagerly start the lazy promise if this is our first time seeing it -- makes sure `hydratable` is hit synchronously
		p.then(
			() => {},
			() => {}
		);
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
