/** @import { RemoteLiveQuery, RemoteLiveQueryFunction } from '@sveltejs/kit' */
/** @import { PromiseWithResolvers } from '../../../utils/promise.js' */
import { app_dir, base } from '$app/paths/internal/client';
import { app, live_query_map } from '../client.js';
import {
	get_remote_request_headers,
	handle_side_channel_response,
	is_in_effect,
	QUERY_FUNCTION_ID,
	QUERY_RESOURCE_KEY
} from './shared.svelte.js';
import * as devalue from 'devalue';
import { HttpError, Redirect } from '@sveltejs/kit/internal';
import { DEV } from 'esm-env';
import { noop, once } from '../../../utils/functions.js';
import { with_resolvers } from '../../../utils/promise.js';
import { tick } from 'svelte';
import { create_remote_key, stringify_remote_arg, unfriendly_hydratable } from '../../shared.js';
import { read_ndjson } from '../ndjson.js';

/**
 * @template T
 * @typedef {{
 *   count: number;
 *   resource: LiveQuery<T>;
 *   cleanup: () => void;
 * }} RemoteLiveQueryCacheEntry
 */

/**
 * @param {string} id
 * @returns {RemoteLiveQueryFunction<any, any>}
 */
export function query_live(id) {
	if (DEV) {
		// If this reruns as part of HMR, refresh the query
		const entries = live_query_map.get(id);

		if (entries) {
			for (const entry of entries.values()) {
				void entry.resource.reconnect();
			}
		}
	}

	/** @type {RemoteLiveQueryFunction<any, any>} */
	const wrapper = (arg) => /** @type {RemoteLiveQuery<any>} */ (new LiveQueryProxy(id, arg));

	Object.defineProperty(wrapper, QUERY_FUNCTION_ID, { value: id });

	return wrapper;
}

/**
 * @param {Response} response
 * @returns {Promise<ReadableStreamDefaultReader<Uint8Array>>}
 */
async function get_stream_reader(response) {
	const content_type = response.headers.get('content-type') ?? '';

	if (response.ok && content_type.includes('application/json')) {
		// we can end up here if we e.g. redirect in `handle`
		const result = await response.json();
		await handle_side_channel_response(result);
		throw new HttpError(500, 'Invalid query.live response');
	}

	if (!response.ok) {
		const result = await response.json().catch(() => ({
			type: 'error',
			status: response.status,
			error: response.statusText
		}));

		throw new HttpError(result.status ?? response.status ?? 500, result.error);
	}

	if (!response.body) {
		throw new Error('Expected query.live response body to be a ReadableStream');
	}

	return response.body.getReader();
}

/**
 * Yields deserialized results from a ReadableStream of newline-delimited JSON
 * @param {ReadableStreamDefaultReader<Uint8Array>} reader
 */
async function* read_live_ndjson(reader) {
	for await (const node of read_ndjson(reader)) {
		if (node.type === 'result') {
			yield devalue.parse(node.result, app.decoders);
			continue;
		}

		await handle_side_channel_response(node);
		throw new HttpError(500, 'Invalid query.live response');
	}
}

/**
 * @template T
 * @param {string} id
 * @param {string} payload
 * @param {AbortController} [controller]
 * @param {() => void} [on_connect]
 * @returns {AsyncGenerator<T>}
 */
export async function* create_live_iterator(
	id,
	payload,
	controller = new AbortController(),
	on_connect = noop
) {
	const url = `${base}/${app_dir}/remote/${id}${payload ? `?payload=${payload}` : ''}`;
	/** @type {ReadableStreamDefaultReader<Uint8Array> | null} */
	let reader = null;

	try {
		const response = await fetch(url, {
			headers: get_remote_request_headers(),
			signal: controller.signal
		});
		reader = await get_stream_reader(response);

		on_connect();

		yield* read_live_ndjson(reader);
	} finally {
		try {
			await reader?.cancel();
		} catch {
			// already closed
		}
	}
}

/**
 * @template T
 * @implements {Promise<T>}
 */
export class LiveQuery {
	#id;
	#payload;
	#loading = $state(true);
	#ready = $state(false);
	/** Is there a current connection to the server? */
	#connected = $state(false);
	/**
	 * Have we been told by the server that we have completed iteration and are done?
	 * When this is `true`, the only way to start live-updating again is to call `.reconnect()`.
	 */
	#done = $state(false);
	/** @type {T | undefined} */
	#raw = $state.raw();
	/** @type {any} */
	#error = $state.raw(undefined);
	/** @type {Promise<void>} */
	#promise;
	/** @type {((value: void) => void) | null} */
	#resolve_first = null;
	/** @type {((reason?: any) => void) | null} */
	#reject_first = null;
	/**
	 * Interrupt the main loop, causing the current connection (if active) to be closed
	 * and unscheduling any future automatic reconnection attempts. Returns a promise that
	 * resolves when the main loop has fully stopped.
	 * @type {(() => Promise<void>) | null}
	 */
	#interrupt = null;
	#attempt = 0;

	/** @type {Promise<T>['then']} */
	// @ts-expect-error TS doesn't understand that the promise returns something
	#then = $derived.by(() => {
		const p = /** @type {Promise<T>} */ (this.#promise);

		return (resolve, reject) => {
			const result = p.then(tick).then(() => /** @type {T} */ (this.#raw));

			if (resolve || reject) {
				return result.then(resolve, reject);
			}

			return result;
		};
	});

	/**
	 * @param {string} id
	 * @param {string} key
	 * @param {string} payload
	 */
	constructor(id, key, payload) {
		this.#id = id;
		this.#payload = payload;

		// the semantics of awaiting a live query are a bit weird, but it's basically:
		// - It's a promise that resolves to the first value from the server
		// - Thereafter, it's a promise that immediately resolves to the current value
		const { promise, resolve, reject } = with_resolvers();
		this.#promise = $state.raw(promise);
		this.#resolve_first = resolve;
		this.#reject_first = reject;

		const serialized = unfriendly_hydratable(key, () => undefined);
		if (serialized !== undefined) {
			this.set(devalue.parse(serialized, app.decoders));
		}
	}

	/**
	 * @param {number} attempt
	 * @returns {number}
	 */
	static #calculate_retry_delay(attempt) {
		const base_delay = Math.min(250 * 2 ** attempt, 10_000);
		const jitter = base_delay * (Math.random() * 0.4 - 0.2);
		return Math.max(0, Math.round(base_delay + jitter));
	}

	/** @param {{ on_connect: () => void, on_connect_failed: (reason: any) => void }} [on_connect_handlers] */
	async #main({ on_connect, on_connect_failed } = { on_connect: noop, on_connect_failed: noop }) {
		// this means we're already running the main loop
		if (this.#interrupt) return;

		/** @type {PromiseWithResolvers<void>} */
		const { promise: stopped, resolve: on_stop } = with_resolvers();

		while (!this.#done) {
			const controller = new AbortController();

			this.#interrupt = () => {
				controller.abort();
				return stopped;
			};

			const generator = create_live_iterator(this.#id, this.#payload, controller, () => {
				this.#connected = true;
				this.#attempt = 0;
				on_connect();
			});

			try {
				const { done, value } = await generator.next();

				// TODO how much special handling does this need?
				// should we even try to reconnect if this is the case?
				if (done && !this.#ready) {
					throw new Error('Live query completed before yielding a value');
				}

				this.set(value);

				for await (const value of generator) {
					this.set(value);
				}

				this.#done = true;
			} catch (error) {
				if (controller.signal.aborted) break;

				if (error instanceof Redirect) {
					// goto() was already called by handle_side_channel_response.
					// Reconnect promptly
					// TODO this really needs to hook into the router so the reconnect can
					// finish before applying the navigation
					this.#attempt = 0;
					continue;
				}

				if (!this.#ready) {
					// If we haven't successfully connected and received a value yet, surface the error
					this.fail(error);
					this.#done = true;
					on_connect_failed(error);
					break;
				}

				if (error instanceof HttpError) {
					// Server intentionally sent an error. Surface it and stop.
					this.fail(error);
					this.#done = true;
					break;
				}

				// Network/transport error — transient.
				// Preserve last good value (or keep initial promise pending).

				if (typeof navigator !== 'undefined' && !navigator.onLine) break;

				const delay = LiveQuery.#calculate_retry_delay(this.#attempt++);
				/** @type {boolean} */
				const interrupted = await new Promise((resolve) => {
					this.#interrupt = () => {
						resolve(true);
						return stopped;
					};
					setTimeout(() => resolve(false), delay);
				});
				if (interrupted) break;
			} finally {
				this.#connected = false;
			}
		}

		this.#interrupt = null;
		on_stop();
	}

	#on_online = () => {
		if (this.#done) return;
		if (this.#interrupt) return;
		this.#main().catch(noop);
	};

	#on_offline = () => {
		void this.#interrupt?.();
	};

	#on_pagehide = () => {
		void this.#interrupt?.();
	};

	#on_pageshow = (/** @type {PageTransitionEvent} */ e) => {
		if (e.persisted) {
			this.#on_online();
		}
	};

	#start = once(() => {
		if (typeof window !== 'undefined') {
			window.addEventListener('online', this.#on_online);
			window.addEventListener('offline', this.#on_offline);
			window.addEventListener('pagehide', this.#on_pagehide);
			window.addEventListener('beforeunload', this.#on_pagehide);
			window.addEventListener('pageshow', this.#on_pageshow);
		}

		this.#main().catch(noop);
	});

	destroy() {
		if (typeof window !== 'undefined') {
			window.removeEventListener('online', this.#on_online);
			window.removeEventListener('offline', this.#on_offline);
			window.removeEventListener('pagehide', this.#on_pagehide);
			window.removeEventListener('beforeunload', this.#on_pagehide);
			window.removeEventListener('pageshow', this.#on_pageshow);
		}

		void this.#interrupt?.();
	}

	get then() {
		this.#start();
		return this.#then;
	}

	get catch() {
		this.#start();
		this.#then;
		return (/** @type {any} */ reject) => {
			return this.#then(undefined, reject);
		};
	}

	get finally() {
		this.#start();
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
		return this.#raw;
	}

	get error() {
		this.#start();
		return this.#error;
	}

	get loading() {
		this.#start();
		return this.#loading;
	}

	get ready() {
		this.#start();
		return this.#ready;
	}

	get connected() {
		this.#start();
		return this.#connected;
	}

	get done() {
		this.#start();
		return this.#done;
	}

	async reconnect() {
		await this.#interrupt?.();
		/** @type {PromiseWithResolvers<void>} */
		const { promise, resolve: on_connect, reject: on_connect_failed } = with_resolvers();
		promise.catch(noop);
		this.#done = false;
		this.#attempt = 0;
		this.#main({ on_connect, on_connect_failed }).catch(noop);
		await promise;
	}

	/** @param {T} value */
	set(value) {
		this.#ready = true;
		this.#loading = false;
		this.#error = undefined;
		this.#raw = value;

		if (this.#resolve_first) {
			this.#resolve_first();
			this.#resolve_first = null;
			this.#reject_first = null;
		} else {
			this.#promise = Promise.resolve();
		}
	}

	/** @param {unknown} error */
	fail(error) {
		this.#loading = false;
		this.#error = error;

		if (this.#reject_first) {
			this.#reject_first(error);
			this.#resolve_first = null;
			this.#reject_first = null;
		} else {
			const promise = Promise.reject(error);
			promise.catch(noop);
			this.#promise = promise;
		}
	}

	get [Symbol.toStringTag]() {
		return 'LiveQuery';
	}
}

/**
 * @template T
 * @implements {Promise<T>}
 */
class LiveQueryProxy {
	#key;
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
		this.#key = create_remote_key(id, this.#payload);
		Object.defineProperty(this, QUERY_RESOURCE_KEY, { value: this.#key });

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

	/** @returns {RemoteLiveQueryCacheEntry<T>} */
	#get_or_create_cache_entry() {
		let query_instances = live_query_map.get(this.#id);

		if (!query_instances) {
			query_instances = new Map();
			live_query_map.set(this.#id, query_instances);
		}

		let this_instance = query_instances.get(this.#payload);

		if (!this_instance) {
			const c = (this_instance = {
				count: 0,
				resource: /** @type {LiveQuery<T>} */ (/** @type {unknown} */ (null)),
				cleanup: /** @type {() => void} */ (/** @type {unknown} */ (null))
			});

			c.cleanup = $effect.root(() => {
				c.resource = new LiveQuery(this.#id, this.#key, this.#payload);
			});

			query_instances.set(this.#payload, this_instance);
		}

		this_instance.count += 1;

		return this_instance;
	}

	/**
	 * @param {RemoteLiveQueryCacheEntry<T>} entry
	 * @param {boolean} [deactivate]
	 */
	#release(entry, deactivate = true) {
		this.#active &&= !deactivate;
		entry.count -= 1;

		return () => {
			const query_instances = live_query_map.get(this.#id);
			const this_instance = query_instances?.get(this.#payload);

			if (this_instance?.count === 0) {
				this_instance.resource.destroy();
				this_instance.cleanup();
				query_instances?.delete(this.#payload);
			}

			if (query_instances?.size === 0) {
				live_query_map.delete(this.#id);
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

		const cached = live_query_map.get(this.#id)?.get(this.#payload);

		if (!cached) {
			throw new Error(
				'No cached query found. This should be impossible. Please file a bug report.'
			);
		}

		return cached.resource;
	}

	#safe_get_cached_query() {
		return live_query_map.get(this.#id)?.get(this.#payload)?.resource;
	}

	get current() {
		return this.#safe_get_cached_query()?.current;
	}

	get error() {
		return this.#safe_get_cached_query()?.error;
	}

	get loading() {
		return this.#safe_get_cached_query()?.loading ?? false;
	}

	get ready() {
		return this.#safe_get_cached_query()?.ready ?? false;
	}

	get connected() {
		return this.#safe_get_cached_query()?.connected ?? false;
	}

	get done() {
		return this.#safe_get_cached_query()?.done ?? false;
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
		return this.#safe_get_cached_query()?.reconnect() ?? Promise.resolve();
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
