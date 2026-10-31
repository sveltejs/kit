/** @import { HttpError } from '@sveltejs/kit' */
import { _goto, query_responses, handle_error } from '../../client.js';
import { HandledHttpError, Redirect } from '@sveltejs/kit/internal';
import { QUERY_OVERRIDE_KEY } from '../shared.svelte.js';
import { noop } from '../../../../utils/functions.js';
import { with_resolvers } from '../../../../utils/promise.js';
import { tick, untrack } from 'svelte';

/** @type {WeakMap<Redirect, Promise<void>>} */
const redirects = new WeakMap();

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
	/** @type {Array<{ resolve: (value: undefined) => void, reject: (reason: any) => void }>} */
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

	/** @type {App.Error | undefined} */
	#error = $state.raw(undefined);

	/** @type {Promise<T>['then']} */
	// @ts-expect-error TS doesn't understand that the promise returns something
	#then = $derived.by(() => {
		const p = this.#get_promise();
		this.#overrides.length;

		return (resolve, reject) => {
			const result = p.then(tick).then(
				() => {
					if (!this.#ready) {
						throw new HandledHttpError(
							this.#error ?? { status: 500, message: 'Query resolved without a value' }
						);
					}

					return /** @type {T} */ (this.#current);
				},
				async (error) => {
					if (!(error instanceof Redirect)) throw error;
					await this.#redirect(error);
					return /** @type {T} */ (undefined);
				}
			);

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

		if (Object.hasOwn(query_responses, key)) {
			const node = query_responses[key];
			delete query_responses[key];

			if (node.e) {
				this.fail(new HandledHttpError(node.e));
			} else {
				this.set(/** @type {T} */ (node.v));
			}
		}
	}

	#get_promise() {
		void untrack(() => (this.#promise ??= this.#run()));
		return /** @type {Promise<T>} */ (this.#promise);
	}

	/** @param {Redirect} redirect */
	#redirect(redirect) {
		// A redirect is not query data. Replay it for cached consumers, while sharing
		// the navigation between concurrent consumers, including batched queries.
		let promise = redirects.get(redirect);

		if (!promise) {
			// Defer navigation so all consumers can share it, even if it settles immediately.
			// Use the internal version to allow redirects to external URLs.
			promise = tick()
				.then(() => _goto(redirect.location))
				.finally(() => redirects.delete(redirect));
			redirects.set(redirect, promise);
		}

		return promise;
	}

	// Awaited consumers handle redirects in #then; reactive reads handle them here.
	start(handle_redirect = true) {
		// there is a really weird bug with untrack and writes and initializations
		// every time you see this comment, try removing the `tick.then` here and see
		// if all the tests still pass with the latest svelte version
		// if they do, congrats, you can remove tick.then
		void tick()
			.then(() => this.#get_promise())
			.catch((error) => {
				if (handle_redirect && error instanceof Redirect) return this.#redirect(error);
			})
			.catch(noop);
	}

	#clear_pending() {
		this.#latest.forEach((r) => r.resolve(undefined));
		this.#latest.length = 0;
	}

	#run() {
		this.#loading = true;

		const { promise, resolve, reject } = with_resolvers();

		// the rejection is surfaced via `.error` / the `then` getter for awaiting
		// consumers — a purely reactive consumer (`.current`) attaches no handler,
		// so make sure the stored promise can never become an unhandled rejection
		promise.catch(noop);

		const request = { resolve, reject };
		this.#latest.push(request);

		Promise.resolve(this.#fn())
			.then((value) => {
				// Skip the response if resource was refreshed with a later promise while we were waiting for this one to resolve
				const idx = this.#latest.indexOf(request);
				if (idx === -1) return;

				// Untrack this to not trigger mutation validation errors which can occur if you do e.g. $derived({ a: await queryA(), b: await queryB() })
				untrack(() => {
					this.#latest.splice(0, idx + 1).forEach((r) => r.resolve(undefined));
					this.#ready = true;
					this.#loading = false;
					this.#raw = value;
					this.#error = undefined;
				});
			})
			.catch(async (e) => {
				// TODO: Our behavior here could be better:
				// - Instead of failing on transport-level errors, we should probably do what
				//   LiveQuery does and preserve the last known good value and retry the connection
				const pending = this.#latest.indexOf(request);
				if (pending === -1) return;

				if (e instanceof Redirect) {
					untrack(() => {
						this.#latest.splice(0, pending + 1).forEach((r) => r.reject(e));
						this.#loading = false;
					});
					return;
				}

				const error = await handle_error(e, {
					params: {},
					route: { id: null },
					url: new URL(location.href)
				});

				// Re-check after the async `handle_error` gap: a later request may have
				// resolved/rejected while we were awaiting and superseded this one, so
				// recompute the index and bail out if this request is no longer current
				const idx = this.#latest.indexOf(request);
				if (idx === -1) return;

				untrack(() => {
					this.#latest.splice(0, idx).forEach((r) => r.resolve(undefined));
					this.#latest.shift();
					this.#error = error;
					this.#loading = false;
				});

				reject(new HandledHttpError(error));
			});

		return promise;
	}

	get then() {
		// TODO this should be unnecessary but due to the bug described
		// in #start, we need to do this in some circumstances
		this.start(false);
		return this.#then;
	}

	get catch() {
		this.start(false);
		this.#then;
		return (/** @type {any} */ reject) => {
			return this.#then(undefined, reject);
		};
	}

	get finally() {
		this.start(false);
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
		this.start();
		return this.#current;
	}

	get error() {
		this.start();
		return this.#error;
	}

	/**
	 * Returns true if the resource is loading or reloading.
	 */
	get loading() {
		this.start();
		return this.#loading;
	}

	/**
	 * Returns true once the resource has been loaded for the first time.
	 */
	get ready() {
		this.start();
		return this.#ready;
	}

	/**
	 * @returns {Promise<void>}
	 */
	refresh() {
		delete query_responses[this.#key];
		const promise = (this.#promise = this.#run()).catch((error) => {
			if (error instanceof Redirect) return this.#redirect(error);
			throw error;
		});
		// Like the run promise, this wrapper may be ignored by reactive consumers.
		promise.catch(noop);
		return promise;
	}

	/**
	 * @param {T} value
	 */
	set(value) {
		// normally consumed in the constructor, but make sure a leftover
		// SSR record can never shadow the newly-set value
		delete query_responses[this.#key];

		// a pending request's promise is settled with the value below; replacing it
		// too would make awaiting consumers settle a second time in a new batch
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

	/** @param {HttpError} error */
	fail(error) {
		// normally consumed in the constructor, but make sure a leftover
		// SSR record can never shadow the newly-set error
		delete query_responses[this.#key];

		this.#clear_pending();
		this.#loading = false;
		this.#error = error.body;

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

	/**
	 * Reset ahead of a navigation that invalidates all, to force newly
	 * rendered queries to get fresh data
	 */
	reset() {
		this.#promise = null;
		delete query_responses[this.#key];
	}

	get [Symbol.toStringTag]() {
		return 'Query';
	}
}
