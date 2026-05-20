/** @import { PromiseWithResolvers } from '../../../../utils/promise.js' */
import { app } from '../../client.js';
import * as devalue from 'devalue';
import { HttpError, Redirect } from '@sveltejs/kit/internal';
import { noop, once } from '../../../../utils/functions.js';
import { with_resolvers } from '../../../../utils/promise.js';
import { tick } from 'svelte';
import { unfriendly_hydratable } from '../../../shared.js';
import { create_live_iterator } from './iterator.js';

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
					on_connect_failed(error);
					break;
				}

				if (error instanceof HttpError) {
					// Server intentionally sent an error. Surface it and stop.
					this.fail(error);
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
		// `fail` is terminal — once a live query has hard-failed, the only way to start
		// streaming again is via `reconnect()`. Mark it done and abort any in-flight
		// request so that callers from outside the main loop (e.g. `apply_reconnections`)
		// don't leave the loop spinning.
		this.#done = true;
		void this.#interrupt?.();

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
