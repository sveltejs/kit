/** @import { RemoteLiveQueryFunction, RemoteQueryFunction } from '@sveltejs/kit' */
/** @import { RemoteFunctionResponse } from 'types' */
import { app_dir, base } from '$app/paths/internal/client';
import { app, goto, live_query_map, query_map, query_responses } from '../client.js';
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
 *   resource: Query<T>;
 *   cleanup: () => void;
 * }} RemoteQueryCacheEntry
 */

/**
 * @template T
 * @typedef {{
 *   count: number;
 *   resource: LiveQuery<T>;
 *   cleanup: () => void;
 * }} RemoteLiveQueryCacheEntry
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
				void entry.resource.refresh();
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
 * @returns {RemoteLiveQueryFunction<any, any>}
 */
export function query_live(id) {
	if (DEV) {
		for (const [key, entry] of live_query_map) {
			if (key === id || key.startsWith(id + '/')) {
				void entry.resource.reconnect();
			}
		}
	}

	return (arg) => new LiveQueryProxy(id, arg);
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
 * @returns {RemoteQueryFunction<Input, Output>}
 */
function create_query_function(id, fn) {
	return (arg) => /** @type {any} */ (new QueryProxy(id, arg, fn));
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
 * @param {Response} response
 * @returns {Promise<ReadableStreamDefaultReader<Uint8Array>>}
 */
async function get_stream_reader(response) {
	const content_type = response.headers.get('content-type') ?? '';

	if (response.ok && content_type.includes('application/json')) {
		const result = await response.json();

		if (result.type === 'redirect') {
			await goto(result.location);
			throw new Redirect(307, result.location);
		}

		if (result.type === 'error') {
			throw new HttpError(result.status ?? 500, result.error);
		}

		throw new Error('Invalid query.live response');
	}

	if (!response.ok) {
		let result;

		try {
			result = await response.json();
		} catch {
			throw new HttpError(response.status, response.statusText);
		}

		if (result.type === 'redirect') {
			await goto(result.location);
			throw new Redirect(307, result.location);
		}

		if (result.type === 'error') {
			throw new HttpError(result.status ?? response.status ?? 500, result.error);
		}

		throw new HttpError(response.status, response.statusText);
	}

	if (!response.body) {
		throw new Error('Expected query.live response body to be a ReadableStream');
	}

	return response.body.getReader();
}

/**
 * @param {ReadableStreamDefaultReader<Uint8Array>} reader
 */
function create_stream_reader(reader) {
	let done = false;
	let buffer = '';
	const text_decoder = new TextDecoder();

	return async () => {
		while (true) {
			const split = buffer.indexOf('\n');
			if (split !== -1) {
				const line = buffer.slice(0, split).trim();
				buffer = buffer.slice(split + 1);

				if (!line) continue;

				const node = JSON.parse(line);

				if (node.type === 'result') {
					return devalue.parse(node.result, app.decoders);
				}

				if (node.type === 'redirect') {
					await goto(node.location);
					throw new Redirect(307, node.location);
				}

				if (node.type === 'error') {
					throw new HttpError(node.status ?? 500, node.error);
				}

				throw new Error('Invalid query.live response');
			}

			if (done) {
				if (buffer.trim()) {
					const node = JSON.parse(buffer.trim());
					buffer = '';

					if (node.type === 'result') {
						return devalue.parse(node.result, app.decoders);
					}

					if (node.type === 'redirect') {
						await goto(node.location);
						throw new Redirect(307, node.location);
					}

					if (node.type === 'error') {
						throw new HttpError(node.status ?? 500, node.error);
					}
				}

				return undefined;
			}

			const chunk = await reader.read();
			done = chunk.done;
			if (chunk.value) {
				buffer += text_decoder.decode(chunk.value, { stream: true });
			}
		}
	};
}

/**
 * @template T
 * @param {string} id
 * @param {string} payload
 * @returns {Promise<AsyncIterableIterator<T>>}
 */
async function create_live_iterator(id, payload) {
	const controller = new AbortController();
	const url = `${base}/${app_dir}/remote/${id}${payload ? `?payload=${payload}` : ''}`;
	const response = await fetch(url, {
		headers: get_remote_request_headers(),
		signal: controller.signal
	});
	const reader = await get_stream_reader(response);
	const next_value = create_stream_reader(reader);

	let closed = false;

	/** @type {AsyncIterableIterator<T>} */
	const iterator = {
		[Symbol.asyncIterator]() {
			return iterator;
		},
		async next() {
			if (closed) {
				return { value: undefined, done: true };
			}

			const value = await next_value();
			if (value === undefined) {
				closed = true;
				return { value: undefined, done: true };
			}

			return { value, done: false };
		},
		async return(value) {
			closed = true;
			controller.abort();
			try {
				await reader.cancel();
			} catch {
				// already closed
			}
			return { value, done: true };
		}
	};

	return iterator;
}

/**
 * @template T
 * @implements {Promise<T>}
 */
export class LiveQuery {
	_key;
	#id;
	#payload;
	#loading = $state(true);
	#ready = $state(false);
	#connected = $state(false);
	#version = $state(0);
	/** @type {T | undefined} */
	#raw = $state.raw();
	/** @type {any} */
	#error = $state.raw(undefined);
	/** @type {Promise<T>} */
	#promise;

	/** @type {Promise<T>['then']} */
	// @ts-expect-error TS doesn't understand that the promise returns something
	#then = $derived.by(() => {
		this.#version;
		const p = this.#promise;

		return (resolve, reject) => {
			const result = p.then(tick).then(() => /** @type {T} */ (this.#raw));

			if (resolve || reject) {
				return result.then(resolve, reject);
			}

			return result;
		};
	});
	/** @type {(value: T | PromiseLike<T>) => void} */
	#resolve_first;
	/** @type {(reason?: any) => void} */
	#reject_first;
	#active = false;
	#destroyed = false;
	#attempt = 0;
	/** @type {ReturnType<typeof setTimeout> | null} */
	#retry_timer = null;
	/** @type {AbortController | null} */
	#controller = null;
	#connection = 0;

	/**
	 * @param {string} id
	 * @param {string} key
	 * @param {string} payload
	 */
	constructor(id, key, payload) {
		this.#id = id;
		this._key = key;
		this.#payload = payload;

		const { promise, resolve, reject } = with_resolvers();
		this.#promise = promise;
		this.#resolve_first = resolve;
		this.#reject_first = reject;

		if (Object.hasOwn(query_responses, key)) {
			this.#set_value(query_responses[key]);
			this.#resolve_first(query_responses[key]);
		}
	}

	#clear_retry() {
		if (this.#retry_timer) {
			clearTimeout(this.#retry_timer);
			this.#retry_timer = null;
		}
	}

	/** @param {T} value */
	#set_value(value) {
		this.#ready = true;
		this.#loading = false;
		this.#error = undefined;
		this.#raw = value;
		this.#version += 1;
	}

	#disconnect_current() {
		this.#controller?.abort();
		this.#controller = null;
		this.#connected = false;
	}

	#schedule_reconnect() {
		if (!this.#active || this.#destroyed || this.#retry_timer) return;

		if (typeof navigator !== 'undefined' && navigator.onLine === false) {
			return;
		}

		const base_delay = Math.min(250 * 2 ** this.#attempt, 10_000);
		const jitter = base_delay * (Math.random() * 0.4 - 0.2);
		const delay = Math.max(0, Math.round(base_delay + jitter));
		this.#attempt += 1;

		this.#retry_timer = setTimeout(() => {
			this.#retry_timer = null;
			void this.#connect_stream();
		}, delay);
	}

	async #connect_stream() {
		if (!this.#active || this.#destroyed) return;

		const connection = ++this.#connection;
		const controller = new AbortController();
		this.#controller = controller;

		const url = `${base}/${app_dir}/remote/${this.#id}${this.#payload ? `?payload=${this.#payload}` : ''}`;

		try {
			const response = await fetch(url, {
				headers: get_remote_request_headers(),
				signal: controller.signal
			});

			if (connection !== this.#connection || !this.#active || this.#destroyed) {
				return;
			}

			const reader = await get_stream_reader(response);
			const next_value = create_stream_reader(reader);
			this.#connected = true;
			this.#attempt = 0;

			while (this.#active && !this.#destroyed && connection === this.#connection) {
				const value = await next_value();
				if (value === undefined) break;

				if (!this.#ready) {
					this.#resolve_first(value);
				}

				this.#set_value(value);
			}
		} catch (error) {
			if (controller.signal.aborted || connection !== this.#connection) {
				return;
			}

			this.#connected = false;
			this.#error = /** @type {any} */ (error);
			if (!this.#ready) {
				this.#loading = false;
				this.#reject_first(error);
			}
		} finally {
			if (connection === this.#connection) {
				this.#connected = false;
				this.#controller = null;

				if (this.#active && !this.#destroyed) {
					this.#schedule_reconnect();
				}
			}
		}
	}

	#on_online = () => {
		if (!this.#active || this.#destroyed) return;
		this.#clear_retry();
		void this.#connect_stream();
	};

	#on_offline = () => {
		this.#disconnect_current();
	};

	#on_pagehide = () => {
		this.#disconnect_current();
	};

	connect() {
		this.#active = true;

		if (typeof window !== 'undefined') {
			window.addEventListener('online', this.#on_online);
			window.addEventListener('offline', this.#on_offline);
			window.addEventListener('pagehide', this.#on_pagehide);
			window.addEventListener('beforeunload', this.#on_pagehide);
		}

		this.#clear_retry();
		if (!this.#controller) {
			void this.#connect_stream();
		}
	}

	disconnect() {
		this.#active = false;
		this.#clear_retry();
		this.#disconnect_current();

		if (typeof window !== 'undefined') {
			window.removeEventListener('online', this.#on_online);
			window.removeEventListener('offline', this.#on_offline);
			window.removeEventListener('pagehide', this.#on_pagehide);
			window.removeEventListener('beforeunload', this.#on_pagehide);
		}
	}

	destroy() {
		this.#destroyed = true;
		this.disconnect();
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
		return this.#raw;
	}

	get error() {
		return this.#error;
	}

	get loading() {
		return this.#loading;
	}

	get ready() {
		return this.#ready;
	}

	get connected() {
		return this.#connected;
	}

	reconnect() {
		if (!this.#active || this.#destroyed) return;
		this.#attempt = 0;
		this.#clear_retry();
		this.#disconnect_current();
		void this.#connect_stream();
	}

	get [Symbol.toStringTag]() {
		return 'LiveQuery';
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

		const entry = this.#get_or_create_cache_entry();

		$effect.pre(() => () => {
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

		return /** @type {RemoteQueryCacheEntry<T>} */ (cached);
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
		const override = /** @type {Query<T>} */ (entry.resource).withOverride(fn);

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

/**
 * @template T
 * @implements {Promise<T>}
 */
class LiveQueryProxy {
	_key;
	#id;
	#payload;
	#active = true;
	#tracking = is_in_effect();

	/**
	 * @param {string} id
	 * @param {any} arg
	 */
	constructor(id, arg) {
		this.#id = id;
		this.#payload = stringify_remote_arg(arg, app.hooks.transport);
		this._key = create_remote_key(id, this.#payload);

		if (!this.#tracking) {
			this.#active = false;
			return;
		}

		const entry = this.#get_or_create_cache_entry();
		entry.resource.connect();

		$effect.pre(() => () => {
			const die = this.#release(entry);
			void tick().then(die);
		});
	}

	/** @returns {RemoteLiveQueryCacheEntry<T>} */
	#get_or_create_cache_entry() {
		let cached = live_query_map.get(this._key);

		if (!cached) {
			const c = (cached = {
				count: 0,
				resource: /** @type {LiveQuery<T>} */ (/** @type {unknown} */ (null)),
				cleanup: /** @type {() => void} */ (/** @type {unknown} */ (null))
			});

			c.cleanup = $effect.root(() => {
				c.resource = new LiveQuery(this.#id, this._key, this.#payload);
			});

			live_query_map.set(this._key, cached);
		}

		cached.count += 1;

		return /** @type {RemoteLiveQueryCacheEntry<T>} */ (cached);
	}

	/**
	 * @param {RemoteLiveQueryCacheEntry<T>} entry
	 * @param {boolean} [deactivate]
	 */
	#release(entry, deactivate = true) {
		this.#active &&= !deactivate;
		entry.count -= 1;

		return () => {
			const cached = live_query_map.get(this._key);
			if (cached?.count === 0) {
				cached.resource.disconnect();
				cached.resource.destroy();
				cached.cleanup();
				live_query_map.delete(this._key);
			}
		};
	}

	#get_cached_query() {
		if (!this.#tracking) {
			throw new Error(
				'This live query was not created in a reactive context and is limited to calling `.run` and `.reconnect`.'
			);
		}

		if (!this.#active) {
			throw new Error(
				'This query instance is no longer active and can no longer be used for reactive state access. ' +
					'This typically means you created the query in a tracking context and stashed it somewhere outside of a tracking context.'
			);
		}

		const cached = live_query_map.get(this._key);

		if (!cached) {
			throw new Error(
				'No cached query found. This should be impossible. Please file a bug report.'
			);
		}

		return /** @type {LiveQuery<T>} */ (cached.resource);
	}

	#safe_get_cached_query() {
		return live_query_map.get(this._key)?.resource;
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

	get connected() {
		return this.#get_cached_query().connected;
	}

	run() {
		if (is_in_effect()) {
			throw new Error(
				'On the client, .run() can only be called outside render, e.g. in universal `load` functions and event handlers. In render, await the query directly'
			);
		}

		return create_live_iterator(this.#id, this.#payload);
	}

	reconnect() {
		this.#safe_get_cached_query()?.reconnect();
	}

	get then() {
		const cached = this.#get_cached_query();
		return cached.then.bind(cached);
	}

	get catch() {
		const cached = this.#get_cached_query();
		return cached.catch.bind(cached);
	}

	get finally() {
		const cached = this.#get_cached_query();
		return cached.finally.bind(cached);
	}

	get [Symbol.toStringTag]() {
		return 'LiveQueryProxy';
	}
}
