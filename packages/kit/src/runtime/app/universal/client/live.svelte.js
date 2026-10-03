import { tick } from 'svelte';
import { HandledHttpError } from '@sveltejs/kit/internal';
import { universal_responses } from '../../../client/client.js';
import { noop } from '../../../../utils/functions.js';
import { with_resolvers } from '../../../../utils/promise.js';
import { SharedIterator } from '../../../../utils/shared-iterator.js';
import { UNIVERSAL_RESOURCE, pin_while_resolving } from './cache.svelte.js';
import { to_app_error } from './errors.js';

/**
 * The client-side live query resource. It iterates the async iterable returned by the user's function
 * while it is in use, and stops iterating once it is no longer used.
 *
 * @template T
 */
export class UniversalLiveQuery {
	/** @type {string} */
	#key;

	/** @type {() => AsyncIterable<T> | Promise<AsyncIterable<T>>} */
	#fn;

	#loading = $state(true);
	#ready = $state(false);
	#connected = $state(false);
	#done = $state(false);

	/** @type {T | undefined} */
	#raw = $state.raw();

	/** @type {App.Error | undefined} */
	#error = $state.raw(undefined);

	/** @type {Promise<void>} */
	#promise;

	/** @type {((value: void) => void) | null} */
	#resolve_first = null;

	/** @type {((reason?: any) => void) | null} */
	#reject_first = null;

	/** Incremented for each new iteration, so that stale iterations can stop */
	#run_id = 0;

	/** @type {AsyncIterator<T> | null} */
	#iterator = null;

	#started = false;

	/** @type {SharedIterator<T>} */
	#fan_out = new SharedIterator();

	/** @type {Array<{ resolve: (value: any) => void, reject: (reason: any) => void }>} */
	#reconnect_waiters = [];

	/** @type {Promise<T>['then']} */
	// @ts-expect-error TS doesn't understand that the promise returns something
	#then = $derived.by(() => {
		const p = this.#promise;

		return (resolve, reject) => {
			const result = p.then(tick).then(() => /** @type {T} */ (this.#raw));

			if (resolve || reject) {
				return result.then(resolve, reject);
			}

			return result;
		};
	});

	/**
	 * @param {string} key
	 * @param {() => AsyncIterable<T> | Promise<AsyncIterable<T>>} fn
	 */
	constructor(key, fn) {
		this.#key = key;
		this.#fn = fn;
		Object.defineProperty(this, UNIVERSAL_RESOURCE, { value: key });

		// awaiting a live query resolves to the first value, thereafter to the current value
		const { promise, resolve, reject } = with_resolvers();
		promise.catch(noop);
		this.#promise = $state.raw(promise);
		this.#resolve_first = resolve;
		this.#reject_first = reject;

		// reuse the first value computed during SSR. We still start iterating on the client,
		// but the user sees the server-rendered value until the client yields a new one
		if (Object.hasOwn(universal_responses.q, key)) {
			const node = universal_responses.q[key];
			delete universal_responses.q[key];

			if (node.e) {
				this.#fail(new HandledHttpError(node.e));
			} else {
				this.#set(/** @type {T} */ (node.v));
			}
		}
	}

	#start() {
		if (this.#started) return;
		this.#started = true;

		// don't start iterating synchronously while Svelte is rendering
		void tick().then(() => this.#iterate());
	}

	async #iterate() {
		const run_id = ++this.#run_id;

		this.#done = false;
		this.#error = undefined;

		try {
			const iterator = (await this.#fn())[Symbol.asyncIterator]();

			if (run_id !== this.#run_id) {
				await iterator.return?.();
				return;
			}

			this.#iterator = iterator;
			this.#connected = true;

			while (true) {
				const { done, value } = await iterator.next();
				if (run_id !== this.#run_id) return;

				if (done) {
					this.#done = true;
					this.#fan_out.done();
					this.#reconnect_waiters.splice(0).forEach((w) => w.resolve(undefined));
					break;
				}

				this.#set(value);
			}
		} catch (e) {
			if (run_id !== this.#run_id) return;
			this.#fail(new HandledHttpError(await to_app_error(e)));
		} finally {
			if (run_id === this.#run_id) {
				this.#connected = false;
				this.#iterator = null;
			}
		}
	}

	/** Stop the current iteration (if any) */
	#stop() {
		this.#run_id++;
		this.#connected = false;
		void this.#iterator?.return?.()?.catch(noop);
		this.#iterator = null;
	}

	/** @param {T} value */
	#set(value) {
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

		this.#reconnect_waiters.splice(0).forEach((w) => w.resolve(undefined));

		this.#fan_out.push(value);
	}

	/** @param {HandledHttpError} error */
	#fail(error) {
		this.#loading = false;
		this.#error = error.body;
		this.#done = true;

		if (this.#reject_first) {
			this.#reject_first(error);
			this.#resolve_first = null;
			this.#reject_first = null;
		} else {
			const promise = Promise.reject(error);
			promise.catch(noop);
			this.#promise = promise;
		}

		this.#reconnect_waiters.splice(0).forEach((w) => w.reject(error));

		this.#fan_out.fail(error);
	}

	/**
	 * Stops the current iteration and starts a new one by calling the function again.
	 * Resolves once the first value of the new iteration has arrived.
	 * @returns {Promise<void>}
	 */
	reconnect() {
		this.#stop();
		this.#started = true;

		if (this.#fan_out.closed) {
			this.#fan_out = new SharedIterator();
		}

		const { promise, resolve, reject } = with_resolvers();
		promise.catch(noop);
		this.#reconnect_waiters.push({ resolve, reject });

		void this.#iterate();

		return /** @type {Promise<void>} */ (promise);
	}

	invalidate() {
		return this.reconnect();
	}

	destroy() {
		this.#stop();
		this.#started = false;
		this.#fan_out.done();
	}

	/**
	 * Iterate the values yielded by this live query. Multiple iterators share the underlying iteration.
	 * @returns {AsyncGenerator<T, void, void>}
	 */
	[Symbol.asyncIterator]() {
		this.#start();

		return this.#fan_out.subscribe(
			this.#ready && this.#error === undefined
				? { initial_value: { value: /** @type {T} */ (this.#raw) } }
				: undefined
		);
	}

	get then() {
		this.#start();
		return pin_while_resolving(this.#key, this, this.#then);
	}

	get catch() {
		this.#start();
		this.#then;
		return (/** @type {any} */ reject) => this.#then(undefined, reject);
	}

	get finally() {
		this.#start();
		this.#then;
		return (/** @type {any} */ fn) =>
			this.#then(
				(value) => {
					fn();
					return value;
				},
				(error) => {
					fn();
					throw error;
				}
			);
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

	get [Symbol.toStringTag]() {
		return 'UniversalLiveQuery';
	}
}
