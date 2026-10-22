/** @import { HttpError } from '@sveltejs/kit' */
/** @import { Update } from '../shared.svelte.js' */
/**
 * @typedef {object} PendingRequest
 * @property {number} id its number (see `next_request_id`)
 * @property {boolean} fails_with_successor whether its callers fail if the request that settles
 *   it fails. That's the case for the reads that overlapped a mutation's update, and for the fresh
 *   read started to decide between them (see `#reconcile`). Other requests resolve and leave the
 *   error to the query
 * @property {Promise<void>} promise
 * @property {(value: undefined) => void} resolve
 * @property {(error: unknown) => void} reject
 */
import { query_responses, handle_error } from '../../client.js';
import { HandledHttpError } from '@sveltejs/kit/internal';
import { QUERY_OVERRIDE_KEY, next_request_id } from '../shared.svelte.js';
import { noop } from '../../../../utils/functions.js';
import { with_resolvers } from '../../../../utils/promise.js';
import { tick, untrack } from 'svelte';

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
	/**
	 * This query's requests that haven't been settled yet, oldest first
	 * @type {PendingRequest[]}
	 */
	#pending = [];
	/** The highest number of a request whose value or error has been applied (see `next_request_id`) */
	#applied = 0;
	/** The number taken when the latest mutation's update arrived */
	#mutation_received = 0;
	/** Responses to requests numbered below this are ignored, while a fresh read decides (see `#reconcile`) */
	#ignore_before = 0;

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

	start() {
		// there is a really weird bug with untrack and writes and initializations
		// every time you see this comment, try removing the `tick.then` here and see
		// if all the tests still pass with the latest svelte version
		// if they do, congrats, you can remove tick.then
		void tick()
			.then(() => this.#get_promise())
			.catch(noop);
	}

	/**
	 * Settles the pending requests sent before `sent`, which a value from a later
	 * request supersedes. Requests sent after it stay pending
	 * @param {number} [sent]
	 */
	#settle_superseded(sent = Infinity) {
		const newer = this.#pending.findIndex((request) => request.id > sent);
		const superseded = this.#pending.splice(0, newer === -1 ? this.#pending.length : newer);
		for (const request of superseded) request.resolve(undefined);
	}

	/**
	 * Takes a value or error that came in another request's response, and settles the
	 * pending requests it supersedes: all of them if `update` isn't given, otherwise
	 * the ones sent before the request that carried it.
	 *
	 * A read's value is ignored if a request of this query sent after it has already
	 * responded, or while a fresh request is deciding (see `#reconcile`). A read and a
	 * mutation that overlap can't be ordered by when they were sent: the read may have
	 * run before or after the mutation committed. So a fresh request decides when a
	 * mutation's update arrives while a request of this query sent after the mutation
	 * has responded or is still pending, and when another query's response brings a
	 * value of this query that it read while the mutation was in flight
	 * @param {Update | undefined} update
	 * @returns {'ignore' | 'apply' | 'reconcile'}
	 */
	#receive(update) {
		if (!update) {
			this.#settle_superseded();
			return 'apply';
		}

		const { sent, mutation } = update;

		if (!mutation) {
			if (sent < this.#applied || sent < this.#ignore_before) return 'ignore';

			// sent before the latest mutation's update arrived, and after the mutation, so it may have
			// read before the mutation committed. A read of this query sent since then decides, and if
			// there is none yet, a fresh one does
			if (sent < this.#mutation_received) {
				const later_read = this.#pending.some((request) => request.id > this.#mutation_received);
				if (!later_read) this.#reconcile();
				return 'ignore';
			}
		}

		this.#settle_superseded(sent);
		const overlaps = this.#applied > sent || this.#pending.length > 0;
		this.#applied = Math.max(this.#applied, sent);
		if (mutation) this.#mutation_received = next_request_id();

		return mutation && overlaps ? 'reconcile' : 'apply';
	}

	/**
	 * Starts the fresh request that decides after a mutation's update overlapped
	 * other requests of this query, or a read of another query that brought a value of
	 * this one (see `#receive`). The requests sent before it
	 * don't apply their responses, and are settled when it responds
	 */
	#reconcile() {
		this.#ignore_before = next_request_id();
		for (const request of this.#pending) request.fails_with_successor = true;
		const promise = this.#run(true);

		// a pending request's promise settles when the fresh one responds, so the query can
		// keep it. Otherwise awaiting the query has to wait for the fresh request
		if (!this.#pending.some((request) => request.promise === this.#promise)) {
			this.#promise = promise;
		}
	}

	/** @param {boolean} [fresh] whether this is the fresh read started by `#reconcile` */
	#run(fresh = false) {
		this.#loading = true;

		const { promise, resolve, reject } = with_resolvers();

		// the rejection is surfaced via `.error` / the `then` getter for awaiting
		// consumers — a purely reactive consumer (`.current`) attaches no handler,
		// so make sure the stored promise can never become an unhandled rejection
		promise.catch(noop);

		/** @type {PendingRequest} */
		const request = {
			id: next_request_id(),
			fails_with_successor: fresh,
			promise,
			resolve,
			reject
		};
		this.#pending.push(request);

		Promise.resolve(this.#fn())
			.then((value) => {
				// Skip the response if resource was refreshed with a later promise while we were waiting for this one to resolve,
				// or if it overlapped a mutation's update, after which a later request decides
				const idx = this.#pending.indexOf(request);
				if (idx === -1 || request.id < this.#ignore_before) return;

				// Untrack this to not trigger mutation validation errors which can occur if you do e.g. $derived({ a: await queryA(), b: await queryB() })
				untrack(() => {
					this.#pending.splice(0, idx + 1).forEach((r) => r.resolve(undefined));
					this.#applied = request.id;
					this.#ready = true;
					this.#loading = this.#pending.length > 0;
					this.#raw = value;
					this.#error = undefined;
				});
			})
			.catch(async (e) => {
				// TODO: Our behavior here could be better:
				// - We should not reject on redirects, but should hook into the router
				//   to ensure the query is properly refreshed before the navigation completes
				// - Instead of failing on transport-level errors, we should probably do what
				//   LiveQuery does and preserve the last known good value and retry the connection
				if (this.#pending.indexOf(request) === -1 || request.id < this.#ignore_before) return;

				const error = await handle_error(e, {
					params: {},
					route: { id: null },
					url: new URL(location.href)
				});

				// Re-check after the async `handle_error` gap: a later request may have
				// resolved/rejected while we were awaiting and superseded this one, so
				// recompute the index and bail out if this request is no longer current
				const idx = this.#pending.indexOf(request);
				if (idx === -1 || request.id < this.#ignore_before) return;

				const handled = new HandledHttpError(error);

				untrack(() => {
					const superseded_requests = this.#pending.splice(0, idx);
					for (const superseded of superseded_requests) {
						if (superseded.fails_with_successor) superseded.reject(handled);
						else superseded.resolve(undefined);
					}

					this.#pending.shift();
					this.#applied = request.id;
					this.#error = error;
					this.#loading = this.#pending.length > 0;
				});

				reject(handled);
			});

		return promise;
	}

	get then() {
		// TODO this should be unnecessary but due to the bug described
		// in #start, we need to do this in some circumstances
		this.start();
		return this.#then;
	}

	get catch() {
		this.start();
		this.#then;
		return (/** @type {any} */ reject) => {
			return this.#then(undefined, reject);
		};
	}

	get finally() {
		this.start();
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
		return (this.#promise = this.#run());
	}

	/**
	 * @param {T} value
	 * @param {Update} [update] where the value came from, if it came in another request's response
	 */
	set(value, update) {
		// normally consumed in the constructor, but make sure a leftover
		// SSR record can never shadow the newly-set value
		delete query_responses[this.#key];

		// a pending request's promise is settled with the value below; replacing it
		// too would make awaiting consumers settle a second time in a new batch
		const in_flight = this.#pending.length > 0;

		const action = this.#receive(update);
		if (action === 'ignore') return;

		this.#ready = true;
		this.#loading = this.#pending.length > 0;
		this.#error = undefined;
		this.#raw = value;

		if (action === 'reconcile') {
			this.#reconcile();
		} else if (!in_flight) {
			this.#promise = Promise.resolve();
		}
	}

	/**
	 * @param {HttpError} error
	 * @param {Update} [update] where the error came from, if it came in another request's response
	 */
	fail(error, update) {
		// normally consumed in the constructor, but make sure a leftover
		// SSR record can never shadow the newly-set error
		delete query_responses[this.#key];

		const action = this.#receive(update);
		if (action === 'ignore') return;

		this.#loading = this.#pending.length > 0;
		this.#error = error.body;

		if (action === 'reconcile') {
			this.#reconcile();
			return;
		}

		// a request sent after the one that failed is still pending, and settles the promise
		if (this.#loading) return;

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
