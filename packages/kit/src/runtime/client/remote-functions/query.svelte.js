/** @import { RemoteQueryFunction } from '@sveltejs/kit' */
import { app_dir, base } from '$app/paths/internal/client';
import { app, query_map, query_responses } from '../client.js';
import {
	get_remote_request_headers,
	QUERY_FUNCTION_ID,
	QUERY_OVERRIDE_KEY,
	QUERY_RESOURCE_KEY,
	remote_request
} from './shared.svelte.js';
import * as devalue from 'devalue';
import { DEV } from 'esm-env';
import { noop } from '../../../utils/functions.js';
import { with_resolvers } from '../../../utils/promise.js';
import { tick, untrack } from 'svelte';
import { create_remote_key, stringify_remote_arg, unfriendly_hydratable } from '../../shared.js';
import { CacheController } from './cache.svelte.js';

/** @type {CacheController<Query<any>>} */
const cache = new CacheController(query_map);

/**
 * @param {string} id
 * @returns {RemoteQueryFunction<any, any>}
 */
export function query(id) {
	if (DEV) {
		// If this reruns as part of HMR, refresh all live entries.
		const entries = query_map.get(id);

		if (entries) {
			for (const { resource } of entries.values()) {
				void resource.refresh();
			}
		}
	}

	/** @type {RemoteQueryFunction<any, any>} */
	const wrapper = (arg) => {
		return new QueryProxy(id, arg, async (key, payload) => {
			if (Object.hasOwn(query_responses, key)) {
				const value = query_responses[key];
				delete query_responses[key];
				return value;
			}

			const url = `${base}/${app_dir}/remote/${id}${payload ? `?payload=${payload}` : ''}`;

			const serialized = await unfriendly_hydratable(key, () =>
				remote_request(url, get_remote_request_headers())
			);

			return devalue.parse(serialized, app.decoders);
		});
	};

	Object.defineProperty(wrapper, QUERY_FUNCTION_ID, { value: id });

	return wrapper;
}

/**
 * The actual query instance. There should only ever be one active query instance per key.
 *
 * @template T
 * @implements {Promise<T>}
 */
export class Query {
	/** @type {string} */
	#key;

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

	/** @type {any} */
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
		this.#key = key;
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

	#clear_pending() {
		this.#latest.forEach((r) => r(undefined));
		this.#latest.length = 0;
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
				// TODO: Our behavior here could be better:
				// - We should not reject on redirects, but should hook into the router
				//   to ensure the query is properly refreshed before the navigation completes
				// - Instead of failing on transport-level errors, we should probably do what
				//   LiveQuery does and preserve the last known good value and retry the connection
				const idx = this.#latest.indexOf(resolve);
				if (idx === -1) return;

				untrack(() => {
					this.#latest.splice(0, idx).forEach((r) => r(undefined));
					this.#error = e;
					this.#loading = false;
				});

				reject(e);
			});

		return promise;
	}

	get then() {
		// TODO this should be unnecessary but due to the bug described
		// in #start, we need to do this in some circumstances
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
		delete query_responses[this.#key];
		return (this.#promise = this.#run());
	}

	/**
	 * @param {T} value
	 */
	set(value) {
		this.#clear_pending();
		this.#ready = true;
		this.#loading = false;
		this.#error = undefined;
		this.#raw = value;
		this.#promise = Promise.resolve();
	}

	/**
	 * @param {unknown} error
	 */
	fail(error) {
		this.#clear_pending();
		this.#loading = false;
		this.#error = error;

		const promise = Promise.reject(error);

		promise.catch(noop);
		this.#promise = promise;
	}

	/**
	 * @param {(old: T) => T} fn
	 * @returns {(() => void) & { [QUERY_OVERRIDE_KEY]: string }}
	 */
	withOverride(fn) {
		this.#overrides.push(fn);

		const release = /** @type {(() => void) & { [QUERY_OVERRIDE_KEY]: string }} */ (
			() => {
				const i = this.#overrides.indexOf(fn);

				if (i !== -1) {
					this.#overrides.splice(i, 1);
				}
			}
		);

		Object.defineProperty(release, QUERY_OVERRIDE_KEY, { value: this.#key });

		return release;
	}

	get [Symbol.toStringTag]() {
		return 'Query';
	}
}

/**
 * Manages the caching layer between the user and the actual {@link Query} instance. This is the thing
 * the developer actually gets to interact with in their application code.
 *
 * @template T
 * @implements {Promise<T>}
 */
export class QueryProxy {
	#id;
	#key;
	#payload;
	#fn;

	/**
	 * @param {string} id
	 * @param {any} arg
	 * @param {(key: string, payload: string) => Promise<T>} fn
	 */
	constructor(id, arg, fn) {
		this.#id = id;
		this.#payload = stringify_remote_arg(arg, app.hooks.transport);
		this.#key = create_remote_key(id, this.#payload);
		Object.defineProperty(this, QUERY_RESOURCE_KEY, { value: this.#key });
		this.#fn = fn;

		const entry = cache.ensure_entry(
			this.#id,
			this.#payload,
			() => new Query(this.#key, () => this.#fn(this.#key, this.#payload))
		);

		cache.ref(this, entry, this.#id, this.#payload);
	}

	#get_cached_query() {
		const cached = query_map.get(this.#id)?.get(this.#payload);

		if (!cached) {
			// Sanity check: a live proxy should always keep its cache entry alive via
			// `proxy_count`, and the invalidation paths never locally evict entries.
			throw new Error(
				'No cached query found. This should be impossible. Please file a bug report.'
			);
		}

		return cached.resource;
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

	refresh() {
		return this.#get_cached_query().refresh();
	}

	/** @type {Query<T>['set']} */
	set(value) {
		this.#get_cached_query().set(value);
	}

	/** @type {Query<T>['withOverride']} */
	withOverride(fn) {
		// The override increments `proxy_count` to keep the cache entry alive until the
		// release function is called.
		const entry = cache.ensure_entry(
			this.#id,
			this.#payload,
			() => new Query(this.#key, () => this.#fn(this.#key, this.#payload))
		);

		const deref = cache.manual_ref(entry, this.#id, this.#payload);

		const override = entry.resource.withOverride(fn);

		const release = /** @type {(() => void) & { [QUERY_OVERRIDE_KEY]: string }} */ (
			() => {
				override();
				deref();
			}
		);

		Object.defineProperty(release, QUERY_OVERRIDE_KEY, { value: override[QUERY_OVERRIDE_KEY] });

		return release;
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
