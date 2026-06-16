/**
 * A pull-style async iterator that fans out a single stream of values to
 * multiple `for await (...)` consumers. Each subscriber gets its own
 * `AsyncGenerator` whose `.next()` resolves whenever a value is pushed via
 * `push(value)`. Multiple consumers see the same values without each one
 * driving an independent underlying source.
 *
 * Backpressure is **latest-wins**: if values arrive faster than a particular
 * consumer drains its iterator, only the most-recently-pushed value is kept
 * pending for that subscriber. Earlier undrained values are dropped. This is
 * appropriate for live data streams (reactive state replication), not for
 * event logs where every value must be delivered.
 *
 * Lifecycle hooks are exposed via the constructor:
 *
 *   - `start()` is called when the subscriber count transitions
 *     from 0 to 1 (e.g. to start a pump pulling from a real source).
 *   - `stop()` is called when the subscriber count transitions
 *     from non-zero back to 0 (e.g. to tear down that pump).
 *
 * Either hook may be omitted.
 *
 * The owner is responsible for calling `push(value)` to broadcast values,
 * `done()` to signal natural completion to all subscribers, and `fail(error)`
 * to broadcast a terminal error. After `done()` or `fail()`, the iterator
 * rejects further `subscribe()` calls with the terminal state appropriately.
 *
 * @template T
 */
export class SharedIterator {
	/**
	 * @typedef {object} Subscriber
	 * @property {{ value: any } | null} pending
	 * @property {{ error: unknown } | null} pending_error
	 * @property {boolean} finished
	 * @property {((result: IteratorResult<any, void>) => void) | null} waiting_resolve
	 * @property {((reason: unknown) => void) | null} waiting_reject
	 */

	/** @type {Set<Subscriber>} */
	#subscribers = new Set();

	/** @type {((instance: SharedIterator<T>) => (() => void)) | undefined} */
	#start = undefined;

	/** @type {(() => void) | undefined} */
	#stop = undefined;

	/** Once `done()` or `fail()` has been broadcast, no new values are accepted. */
	#closed = false;

	/** @type {unknown} */
	#terminal_error = undefined;

	/**
	 * @param {(instance: SharedIterator<T>) => (() => void)} [start]
	 */
	constructor(start) {
		this.#start = start;
	}

	/** @param {T} value */
	push(value) {
		if (this.#closed) return;
		for (const subscriber of this.#subscribers) {
			if (subscriber.waiting_resolve) {
				const resolve = subscriber.waiting_resolve;
				subscriber.waiting_resolve = null;
				subscriber.waiting_reject = null;
				resolve({ value, done: false });
			} else {
				subscriber.pending = { value };
			}
		}
	}

	/**
	 * Signal natural completion to all current subscribers, and to any future
	 * subscriber (which will receive an immediately-done iterator).
	 */
	done() {
		if (this.#closed) return;
		this.#closed = true;
		for (const subscriber of this.#subscribers) {
			subscriber.finished = true;
			if (subscriber.waiting_resolve) {
				const resolve = subscriber.waiting_resolve;
				subscriber.waiting_resolve = null;
				subscriber.waiting_reject = null;
				resolve({ value: undefined, done: true });
			}
		}
		this.#subscribers.clear();
	}

	/**
	 * Broadcast a terminal error. All current subscribers will reject their
	 * next `.next()` call with `error`. Future subscribers will also reject
	 * their first `.next()`.
	 *
	 * @param {unknown} error
	 */
	fail(error) {
		if (this.#closed) return;
		this.#closed = true;
		this.#terminal_error = error;
		for (const subscriber of this.#subscribers) {
			subscriber.finished = true;
			if (subscriber.waiting_reject) {
				const reject = subscriber.waiting_reject;
				subscriber.waiting_resolve = null;
				subscriber.waiting_reject = null;
				reject(error);
			} else {
				subscriber.pending_error = { error };
			}
		}
		this.#subscribers.clear();
	}

	/**
	 * Subscribe to the shared stream. Returns an `AsyncGenerator<T>` that
	 * yields every value pushed after this call (and, if `initial_value` is
	 * provided, that value as the first yield).
	 *
	 * @param {{ initial_value?: { value: T } }} [options]
	 *   `initial_value` lets the caller seed the iterator with a synchronously-
	 *   available current value before any new pushes arrive (e.g. the
	 *   "last-seen value" of a reactive resource). Pass it wrapped in an
	 *   object so `undefined` can be distinguished from "no initial value".
	 * @returns {AsyncGenerator<T, void, void>}
	 */
	subscribe(options) {
		/** @type {Subscriber} */
		const subscriber = {
			pending: options?.initial_value ? { value: options.initial_value.value } : null,
			pending_error:
				this.#closed && this.#terminal_error !== undefined ? { error: this.#terminal_error } : null,
			finished: this.#closed && this.#terminal_error === undefined,
			waiting_resolve: null,
			waiting_reject: null
		};

		if (!subscriber.finished && subscriber.pending_error === null) {
			this.#subscribers.add(subscriber);
		}

		if (!this.#closed) {
			this.#stop ??= this.#start?.(this);
		}

		const unsubscribe = () => {
			subscriber.finished = true;
			const was_present = this.#subscribers.delete(subscriber);

			if (was_present && this.#subscribers.size === 0) {
				this.#stop?.();
			}
		};

		/** @type {AsyncGenerator<T, void, void>} */
		const iterator = {
			next() {
				if (subscriber.pending_error) {
					const { error } = subscriber.pending_error;
					subscriber.pending_error = null;
					unsubscribe();
					return Promise.reject(error);
				}

				if (subscriber.pending) {
					const { value } = subscriber.pending;
					subscriber.pending = null;
					return Promise.resolve({ value, done: false });
				}

				if (subscriber.finished) {
					return Promise.resolve({ value: undefined, done: true });
				}

				return new Promise((resolve, reject) => {
					subscriber.waiting_resolve = resolve;
					subscriber.waiting_reject = reject;
				});
			},
			return(value) {
				unsubscribe();
				if (subscriber.waiting_resolve) {
					const resolve = subscriber.waiting_resolve;
					subscriber.waiting_resolve = null;
					subscriber.waiting_reject = null;
					resolve({ value: undefined, done: true });
				}
				return Promise.resolve({ value: /** @type {void} */ (value), done: true });
			},
			throw(error) {
				unsubscribe();
				if (subscriber.waiting_reject) {
					const reject = subscriber.waiting_reject;
					subscriber.waiting_resolve = null;
					subscriber.waiting_reject = null;
					reject(error);
				}
				return Promise.reject(error);
			},
			[Symbol.asyncIterator]() {
				return iterator;
			}
		};

		return iterator;
	}
}
