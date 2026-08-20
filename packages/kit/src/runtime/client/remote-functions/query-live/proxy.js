import { app, live_query_map } from '../../client.js';
import { pin_in_effect, pin_while_resolving, QUERY_RESOURCE_KEY } from '../shared.svelte.js';
import { create_remote_key, stringify_remote_arg } from '../../../shared.js';
import { LiveQuery } from './instance.svelte.js';
import { cache } from './cache.js';

/**
 * @template T
 * @implements {Promise<T>}
 * @implements {AsyncIterable<T>}
 */
export class LiveQueryProxy {
	#key;
	#id;
	#payload;

	/**
	 * @param {string} id
	 * @param {any} arg
	 */
	constructor(id, arg) {
		this.#id = id;
		this.#payload = stringify_remote_arg(arg, app.hooks.transport);
		this.#key = create_remote_key(id, this.#payload);
		Object.defineProperty(this, QUERY_RESOURCE_KEY, { value: this.#key });

		// Capture key/payload in locals so the create_resource closure doesn't capture
		// `this` (the LiveQueryProxy), which would prevent the FinalizationRegistry from
		// observing the proxy as unreachable and so leak the first proxy for a given key.
		const key = this.#key;
		const payload = this.#payload;
		const entry = cache.ensure_entry(this.#id, payload, () => new LiveQuery(id, key, payload));

		cache.ref(this, entry, this.#id, payload);
	}

	#get_cache_entry() {
		const cached = live_query_map.get(this.#id)?.get(this.#payload);

		if (!cached) {
			throw new Error(
				'No cached query found. This should be impossible. Please file a bug report.'
			);
		}

		return cached;
	}

	#get_cached_query() {
		return this.#get_cache_entry().resource;
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

	get done() {
		return this.#get_cached_query().done;
	}

	/**
	 * @deprecated Use `for await (const value of liveQuery())` instead.
	 * @returns {AsyncGenerator<T>}
	 */
	run() {
		throw new Error(
			'`.run()` has been removed from live queries. Use `for await (const value of liveQuery())` instead.'
		);
	}

	reconnect() {
		return this.#get_cached_query().reconnect();
	}

	/**
	 * @returns {AsyncGenerator<T, void, void>}
	 */
	async *[Symbol.asyncIterator]() {
		const entry = this.#get_cache_entry();
		const release = cache.manual_ref(entry, this.#id, this.#payload);

		try {
			yield* entry.resource;
		} finally {
			release();
		}
	}

	get then() {
		pin_in_effect(live_query_map, cache, this.#id, this.#payload);
		const cached = this.#get_cached_query();
		return pin_while_resolving(
			live_query_map,
			cache,
			this.#id,
			this.#payload,
			cached.then.bind(cached)
		);
	}

	get catch() {
		pin_in_effect(live_query_map, cache, this.#id, this.#payload);
		const cached = this.#get_cached_query();
		return pin_while_resolving(
			live_query_map,
			cache,
			this.#id,
			this.#payload,
			cached.catch.bind(cached)
		);
	}

	get finally() {
		pin_in_effect(live_query_map, cache, this.#id, this.#payload);
		const cached = this.#get_cached_query();
		return pin_while_resolving(
			live_query_map,
			cache,
			this.#id,
			this.#payload,
			cached.finally.bind(cached)
		);
	}

	get [Symbol.toStringTag]() {
		return 'LiveQueryProxy';
	}
}
