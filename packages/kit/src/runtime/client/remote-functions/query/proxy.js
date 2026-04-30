import { app, query_map } from '../../client.js';
import { pin_in_effect, QUERY_OVERRIDE_KEY, QUERY_RESOURCE_KEY } from '../shared.svelte.js';
import { create_remote_key, stringify_remote_arg } from '../../../shared.js';
import { Query } from './instance.svelte.js';
import { cache } from './cache.js';

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

		const key = this.#key;
		const payload = this.#payload;
		const entry = cache.ensure_entry(
			this.#id,
			this.#payload,
			// IMPORTANT: This cannot close over `this` or it becomes impossible to
			// garbage collect the QueryProxy and thus impossible to evict cache entries.
			() => new Query(key, () => fn(key, payload))
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
		const fn_ref = this.#fn;
		const key_ref = this.#key;
		const payload_ref = this.#payload;
		// The override increments `proxy_count` to keep the cache entry alive until the
		// release function is called.
		const entry = cache.ensure_entry(
			this.#id,
			this.#payload,
			// IMPORTANT: This cannot close over `this` or it becomes impossible to
			// garbage collect the QueryProxy and thus impossible to evict cache entries.
			() => new Query(key_ref, () => fn_ref(key_ref, payload_ref))
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
		pin_in_effect(query_map, cache, this.#id, this.#payload);
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
