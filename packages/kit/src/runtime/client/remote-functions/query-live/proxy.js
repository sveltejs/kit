import { app, live_query_map } from '../../client.js';
import { is_in_effect, QUERY_RESOURCE_KEY } from '../shared.svelte.js';
import { create_remote_key, stringify_remote_arg } from '../../../shared.js';
import { LiveQuery } from './instance.svelte.js';
import { cache } from './cache.js';
import { create_live_iterator } from './iterator.js';

/**
 * @template T
 * @implements {Promise<T>}
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

	#get_cached_query() {
		const cached = live_query_map.get(this.#id)?.get(this.#payload);

		if (!cached) {
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

	get connected() {
		return this.#get_cached_query().connected;
	}

	get done() {
		return this.#get_cached_query().done;
	}

	run() {
		// TODO; should this just hook into the existing iterator?
		if (is_in_effect()) {
			throw new Error(
				'On the client, .run() can only be called outside render, e.g. in universal `load` functions and event handlers. In render, await the query directly'
			);
		}

		return create_live_iterator(this.#id, this.#payload);
	}

	reconnect() {
		return this.#get_cached_query().reconnect();
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
