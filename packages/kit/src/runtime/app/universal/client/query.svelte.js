/** @import { UniversalInternals } from '../shared.js' */
import { tick, untrack } from 'svelte';
import { HandledHttpError } from '@sveltejs/kit/internal';
import { to_app_error } from './errors.js';
import { universal_responses } from '../../../client/client.js';
import { noop } from '../../../../utils/functions.js';
import { with_resolvers } from '../../../../utils/promise.js';
import { attach_internals, create_internals } from '../shared.js';
import {
	UNIVERSAL_FUNCTION,
	UNIVERSAL_OVERRIDE,
	UNIVERSAL_RESOURCE,
	get_key,
	get_resource,
	pin_resource,
	pin_while_resolving
} from './cache.svelte.js';
import { UniversalLiveQuery } from './live.svelte.js';

/**
 * The client-side query resource. There's only ever one active resource per key.
 *
 * This closely mirrors the `Query` class used for remote functions, with the difference
 * that the function runs locally instead of fetching from a server endpoint.
 *
 * @template T
 * @implements {Promise<T>}
 */
export class UniversalQuery {
	/** @type {string} */
	#key;

	/** @type {() => Promise<T>} */
	#fn;

	#loading = $state(true);

	/** @type {Array<(value: undefined) => void>} */
	#latest = [];

	#ready = $state(false);

	/** @type {T | undefined} */
	#raw = $state.raw();

	/** @type {Promise<void> | null} */
	#promise = $state.raw(null);

	/** @type {Array<(old: T) => T>} */
	#overrides = $state([]);

	/** @type {T | undefined} */
	#current = $derived.by(() => {
		if (!this.#ready) return undefined;
		return this.#overrides.reduce((v, r) => r(v), /** @type {T} */ (this.#raw));
	});

	/** @type {App.Error | undefined} */
	#error = $state.raw(undefined);

	/** @type {Promise<T>['then']} */
	// @ts-expect-error TS doesn't understand that the promise returns something
	#then = $derived.by(() => {
		const p = this.#get_promise();
		this.#overrides.length;

		return (resolve, reject) => {
			const result = p.then(tick).then(() => {
				if (!this.#ready) {
					throw new HandledHttpError(
						this.#error ?? { status: 500, message: 'Query resolved without a value' }
					);
				}

				return /** @type {T} */ (this.#current);
			});

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
		Object.defineProperty(this, UNIVERSAL_RESOURCE, { value: key });

		// reuse the result computed during SSR, so that we don't run the function again during hydration
		if (Object.hasOwn(universal_responses.q, key)) {
			const node = universal_responses.q[key];
			delete universal_responses.q[key];

			if (node.e) {
				this.#fail(new HandledHttpError(node.e));
			} else {
				this.set(/** @type {T} */ (node.v));
			}
		}
	}

	#get_promise() {
		void untrack(() => (this.#promise ??= this.#run()));
		return /** @type {Promise<void>} */ (this.#promise);
	}

	#start() {
		// see the comment in the remote `Query` class as to why the `tick` is necessary
		void tick()
			.then(() => this.#get_promise())
			.catch(noop);
	}

	#clear_pending() {
		this.#latest.forEach((r) => r(undefined));
		this.#latest.length = 0;
	}

	#run() {
		this.#loading = true;

		const { promise, resolve, reject } = with_resolvers();
		promise.catch(noop);

		this.#latest.push(resolve);

		Promise.resolve()
			.then(() => this.#fn())
			.then((value) => {
				// a later run superseded this one
				const idx = this.#latest.indexOf(resolve);
				if (idx === -1) return;

				untrack(() => {
					this.#latest.splice(0, idx + 1).forEach((r) => r(undefined));
					this.#ready = true;
					this.#loading = false;
					this.#raw = value;
					this.#error = undefined;
				});
			})
			.catch(async (e) => {
				if (this.#latest.indexOf(resolve) === -1) return;

				const error = await to_app_error(e);

				const idx = this.#latest.indexOf(resolve);
				if (idx === -1) return;

				untrack(() => {
					this.#latest.splice(0, idx).forEach((r) => r(undefined));
					this.#latest.shift();
					this.#error = error;
					this.#loading = false;
				});

				reject(new HandledHttpError(error));
			});

		return promise;
	}

	get then() {
		this.#start();
		return pin_while_resolving(this.#key, this, this.#then);
	}

	get catch() {
		this.#start();
		this.#then;
		return pin_while_resolving(this.#key, this, (/** @type {any} */ reject) =>
			this.#then(undefined, reject)
		);
	}

	get finally() {
		this.#start();
		this.#then;
		return pin_while_resolving(this.#key, this, (/** @type {any} */ fn) =>
			this.#then(
				(value) => {
					fn();
					return value;
				},
				(error) => {
					fn();
					throw error;
				}
			)
		);
	}

	get current() {
		this.#start();
		return this.#current;
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

	/**
	 * Re-runs the query function
	 * @returns {Promise<void>}
	 */
	refresh() {
		delete universal_responses.q[this.#key];
		return (this.#promise = this.#run());
	}

	invalidate() {
		return this.refresh();
	}

	/**
	 * @param {T} value
	 */
	set(value) {
		delete universal_responses.q[this.#key];

		const in_flight = this.#latest.length > 0;

		this.#clear_pending();
		this.#ready = true;
		this.#loading = false;
		this.#error = undefined;
		this.#raw = value;

		if (!in_flight) {
			this.#promise = Promise.resolve();
		}
	}

	/** @param {HandledHttpError} error */
	#fail(error) {
		this.#clear_pending();
		this.#loading = false;
		this.#error = error.body;

		const promise = Promise.reject(error);
		promise.catch(noop);
		this.#promise = promise;
	}

	/**
	 * Optimistically override the value until the returned function is called
	 * @param {(old: T) => T} fn
	 */
	withOverride(fn) {
		this.#overrides.push(fn);

		// keep the resource alive while the override is active
		const unpin = pin_resource(this.#key, this);

		const release = () => {
			const i = this.#overrides.indexOf(fn);
			if (i !== -1) this.#overrides.splice(i, 1);
			unpin();
		};

		Object.defineProperty(release, UNIVERSAL_OVERRIDE, { value: this });

		return release;
	}

	get [Symbol.toStringTag]() {
		return 'UniversalQuery';
	}
}

/**
 * @template {Function} F
 * @param {F} fn
 * @param {UniversalInternals} internals
 * @returns {F}
 */
function mark_function(fn, internals) {
	Object.defineProperty(fn, UNIVERSAL_FUNCTION, { value: internals });
	return attach_internals(fn, internals);
}

/**
 * Client-side version of `query` from `$app/universal`.
 * @template Input
 * @template Output
 * @param {(arg: Input) => Output | Promise<Output>} fn
 */
export function query(fn) {
	const __ = create_internals('query');

	/** @param {Input} arg */
	const wrapper = (arg) => {
		const key = get_key(__, arg);
		return get_resource(__, key, () => new UniversalQuery(key, async () => fn(arg)));
	};

	return mark_function(wrapper, __);
}

/**
 * Client-side version of `query.batch` from `$app/universal`.
 * Calls that happen within the same macrotask are batched into a single invocation of `fn`.
 * @template Input
 * @template Output
 * @param {(args: Input[]) => ((arg: Input, idx: number) => Output) | Promise<(arg: Input, idx: number) => Output>} fn
 */
function batch(fn) {
	const __ = create_internals('query_batch');

	/** @type {Map<string, { arg: Input, resolvers: Array<{ resolve: (value: any) => void, reject: (error: any) => void }> }>} */
	let pending = new Map();

	/**
	 * @param {string} key
	 * @param {Input} arg
	 * @returns {Promise<Output>}
	 */
	const enqueue = (key, arg) => {
		if (pending.size === 0) {
			// use a macrotask (rather than a microtask) so that Svelte can flush and reveal more queries to batch
			setTimeout(async () => {
				const batch = pending;
				pending = new Map();

				const entries = Array.from(batch.values());
				const args = entries.map((entry) => entry.arg);

				try {
					const get_result = await fn(args);

					entries.forEach((entry, i) => {
						try {
							const result = get_result(entry.arg, i);
							entry.resolvers.forEach((r) => r.resolve(result));
						} catch (error) {
							entry.resolvers.forEach((r) => r.reject(error));
						}
					});
				} catch (error) {
					for (const entry of entries) {
						entry.resolvers.forEach((r) => r.reject(error));
					}
				}
			}, 0);
		}

		return new Promise((resolve, reject) => {
			const existing = pending.get(key);

			if (existing) {
				existing.resolvers.push({ resolve, reject });
			} else {
				pending.set(key, { arg, resolvers: [{ resolve, reject }] });
			}
		});
	};

	/** @param {Input} arg */
	const wrapper = (arg) => {
		const key = get_key(__, arg);
		return get_resource(__, key, () => new UniversalQuery(key, () => enqueue(key, arg)));
	};

	return mark_function(wrapper, __);
}

/**
 * Client-side version of `query.live` from `$app/universal`.
 * @template Input
 * @template Output
 * @param {(arg: Input) => AsyncIterable<Output> | Promise<AsyncIterable<Output>>} fn
 */
function live(fn) {
	const __ = create_internals('query_live');

	/** @param {Input} arg */
	const wrapper = (arg) => {
		const key = get_key(__, arg);
		return get_resource(__, key, () => new UniversalLiveQuery(key, () => fn(arg)));
	};

	return mark_function(wrapper, __);
}

query.batch = batch;
query.live = live;
