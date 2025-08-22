/** @import { RemoteQueryFunction, RemoteQueryStreamFunction } from '@sveltejs/kit' */
/** @import { RemoteFunctionResponse } from 'types' */
import { app_dir, base } from '__sveltekit/paths';
import { app, goto, remote_responses, started } from '../client.js';
import { tick } from 'svelte';
import { create_remote_function, remote_request } from './shared.svelte.js';
import * as devalue from 'devalue';
import { HttpError, Redirect } from '@sveltejs/kit/internal';

/**
 * @param {string} id
 * @returns {RemoteQueryFunction<any, any>}
 */
export function query(id) {
	return create_remote_function(id, (cache_key, payload) => {
		return new Query(cache_key, async () => {
			if (!started) {
				const result = remote_responses[cache_key];
				if (result) {
					return result;
				}
			}

			const url = `${base}/${app_dir}/remote/${id}${payload ? `?payload=${payload}` : ''}`;

			return await remote_request(url);
		});
	});
}

/**
 * @param {string} id
 * @returns {(arg: any) => Query<any>}
 */
export function query_batch(id) {
	/** @type {{ args: any[], resolvers: Array<{resolve: (value: any) => void, reject: (error: any) => void}> }} */
	let batching = { args: [], resolvers: [] };

	return create_remote_function(id, (cache_key, payload) => {
		return new Query(cache_key, () => {
			if (!started) {
				const result = remote_responses[cache_key];
				if (result) {
					return result;
				}
			}

			// Collect all the calls to the same query in the same macrotask,
			// then execute them as one backend request.
			return new Promise((resolve, reject) => {
				batching.args.push(payload);
				batching.resolvers.push({ resolve, reject });

				if (batching.args.length > 1) return;

				// Wait for the next macrotask - don't use microtask as Svelte runtime uses these to collect changes and flush them,
				// and flushes could reveal more queries that should be batched.
				setTimeout(async () => {
					const batched = batching;
					batching = { args: [], resolvers: [] };

					try {
						const response = await fetch(`${base}/${app_dir}/remote/${id}`, {
							method: 'POST',
							body: JSON.stringify({
								payloads: batched.args
							}),
							headers: {
								'Content-Type': 'application/json'
							}
						});

						if (!response.ok) {
							throw new Error('Failed to execute batch query');
						}

						const result = /** @type {RemoteFunctionResponse} */ (await response.json());
						if (result.type === 'error') {
							throw new HttpError(result.status ?? 500, result.error);
						}

						if (result.type === 'redirect') {
							// TODO double-check this
							await goto(result.location);
							await new Promise((r) => setTimeout(r, 100));
							throw new Redirect(307, result.location);
						}

						const results = devalue.parse(result.result, app.decoders);

						// Resolve individual queries
						for (let i = 0; i < batched.resolvers.length; i++) {
							batched.resolvers[i].resolve(results[i]);
						}
					} catch (error) {
						// Reject all queries in the batch
						for (const resolver of batched.resolvers) {
							resolver.reject(error);
						}
					}
				}, 0);
			});
		});
	});
}

/**
 * @param {string} id
 * @returns {RemoteQueryStreamFunction<any, any>}
 */
export function query_stream(id) {
	return create_remote_function(id, (_, payload) => {
		const url = `${base}/${app_dir}/remote/${id}${payload ? `?payload=${payload}` : ''}`;
		return new QueryStream(url);
	});
}

/**
 * Query stream class that implements both Promise and AsyncIterable interfaces
 * @template T
 * @implements {Partial<Promise<T>>}
 */
class QueryStream {
	/**
	 * The promise next() and then/catch/finally methods return. Is reset after each message from the EventSource.
	 * @type {Promise<any>}
	 */
	// @ts-expect-error TS doesn't see that we assign it in the constructor indirectly through function calls
	#promise;

	/**
	 * The resolve function for the promise.
	 * @type {(value: any) => void}
	 */
	// @ts-expect-error TS doesn't see that we assign it in the constructor indirectly through function calls
	#resolve;

	/**
	 * The reject function for the promise.
	 * @type {(error?: any) => void}
	 */
	// @ts-expect-error TS doesn't see that we assign it in the constructor indirectly through function calls
	#reject;

	/** @type {any} */
	#current = $state.raw();

	/** @type {boolean} */
	#ready = $state(false);

	/** @type {any} */
	#error = $state();

	/** @type {EventSource | undefined} */
	#source;

	/**
	 * How many active async iterators are using this stream.
	 * If there are no active iterators, the EventSource is closed if it's unused.
	 * @type {number} */
	#count = 0;

	/**
	 * The URL of the EventSource.
	 * @type {string}
	 */
	#url;

	/**
	 * Becomes `true` when our query map deletes this stream, which means there's no reactive listener to it anymore.
	 * @type {boolean}
	 */
	#unused = false;

	/**
	 * @param {string} url
	 */
	constructor(url) {
		this.#url = url;
		this.#next();
	}

	#create_promise() {
		this.#reject?.(); // in case there's a dangling listener
		this.#promise = new Promise((resolve, reject) => {
			this.#resolve = resolve;
			this.#reject = reject;
		});
	}

	#next() {
		if (this.#source && this.#source.readyState !== EventSource.CLOSED) return;

		this.#create_promise();
		this.#source = new EventSource(this.#url);

		const source = this.#source;

		/** @param {MessageEvent} event */
		const onMessage = (event) => {
			this.#ready = true;
			this.#error = undefined;

			const message = event.data;

			if (message === '[DONE]') {
				source.close();
				this.#resolve({ done: true, value: undefined });
				return;
			}

			const parsed = devalue.parse(message, app.decoders);
			if (parsed && typeof parsed === 'object' && parsed.type === 'error') {
				source.close();
				this.#reject((this.#error = new HttpError(parsed.status ?? 500, parsed.error)));
				return;
			}

			this.#current = parsed.value;
			this.#resolve({ done: false, value: parsed.value });
			this.#create_promise();
		};

		/** @param {Event} error */
		const onError = (error) => {
			this.#error = error;
			this.#reject(error);
		};

		this.#source.addEventListener('message', onMessage);
		this.#source.addEventListener('error', onError);
	}

	get then() {
		this.#current;

		/**
		 * @param {any} resolve
		 * @param {any} reject
		 */
		return (resolve, reject) => {
			// On first call we return the promise. In all other cases we don't want any delay and return the current value.
			// The getter will self-invalidate when the next message is received.
			if (!this.#ready) {
				return this.#promise.then((v) => v.value).then(resolve, reject);
			} else {
				if (this.#error) {
					return reject(this.#error);
				} else {
					return resolve(this.#current);
				}
			}
		};
	}

	get catch() {
		this.#current;

		return (/** @type {any} */ reject) => {
			return this.then(undefined, reject);
		};
	}

	get finally() {
		this.#current;

		return (/** @type {any} */ fn) => {
			return this.then(
				() => fn(),
				() => fn()
			);
		};
	}

	get current() {
		return this.#current;
	}

	get ready() {
		return this.#ready;
	}

	get error() {
		return this.#error;
	}

	_dispose() {
		this.#unused = true;
		if (this.#count === 0) {
			this.#source?.close();
		}
	}

	[Symbol.asyncIterator]() {
		// Restart the stream in case it was closed previously.
		// Can happen if this is iterated over from a non-reactive context.
		this.#next();
		this.#count++;
		const that = this;

		return {
			next() {
				return that.#promise;
			},
			return() {
				that.#count--;
				if (that.#count === 0 && that.#unused) {
					that.#source?.close();
				}
				return Promise.resolve({ done: true, value: undefined });
			}
		};
	}
}

/**
 * @template T
 * @implements {Partial<Promise<T>>}
 */
export class Query {
	/** @type {string} */
	_key;

	#init = false;
	/** @type {() => Promise<T>} */
	#fn;
	#loading = $state(true);
	/** @type {Array<() => void>} */
	#latest = [];

	/** @type {boolean} */
	#ready = $state(false);
	/** @type {T | undefined} */
	#raw = $state.raw();
	/** @type {Promise<void>} */
	#promise;
	/** @type {Array<(old: T) => T>} */
	#overrides = $state([]);

	/** @type {T | undefined} */
	#current = $derived.by(() => {
		// don't reduce undefined value
		if (!this.#ready) return undefined;

		return this.#overrides.reduce((v, r) => r(v), /** @type {T} */ (this.#raw));
	});

	#error = $state.raw(undefined);

	/** @type {Promise<T>['then']} */
	// @ts-expect-error TS doesn't understand that the promise returns something
	#then = $derived.by(() => {
		const p = this.#promise;
		this.#overrides.length;

		return async (resolve, reject) => {
			try {
				await p;
				// svelte-ignore await_reactivity_loss
				await tick();
				resolve?.(/** @type {T} */ (this.#current));
			} catch (error) {
				reject?.(error);
			}
		};
	});

	/**
	 * @param {string} key
	 * @param {() => Promise<T>} fn
	 */
	constructor(key, fn) {
		this._key = key;
		this.#fn = fn;
		this.#promise = $state.raw(this.#run());
	}

	#run() {
		// Prevent state_unsafe_mutation error on first run when the resource is created within the template
		if (this.#init) {
			this.#loading = true;
		} else {
			this.#init = true;
		}

		// Don't use Promise.withResolvers, it's too new still
		/** @type {() => void} */
		let resolve;
		/** @type {(e?: any) => void} */
		let reject;
		/** @type {Promise<void>} */
		const promise = new Promise((res, rej) => {
			resolve = res;
			reject = rej;
		});

		this.#latest.push(
			// @ts-expect-error it's defined at this point
			resolve
		);

		Promise.resolve(this.#fn())
			.then((value) => {
				// Skip the response if resource was refreshed with a later promise while we were waiting for this one to resolve
				const idx = this.#latest.indexOf(resolve);
				if (idx === -1) return;

				this.#latest.splice(0, idx).forEach((r) => r());
				this.#ready = true;
				this.#loading = false;
				this.#raw = value;
				this.#error = undefined;

				resolve();
			})
			.catch((e) => {
				const idx = this.#latest.indexOf(resolve);
				if (idx === -1) return;

				this.#latest.splice(0, idx).forEach((r) => r());
				this.#error = e;
				this.#loading = false;
				reject(e);
			});

		return promise;
	}

	get then() {
		return this.#then;
	}

	get catch() {
		this.#then;
		return (/** @type {any} */ reject) => {
			return this.#then(undefined, reject);
		};
	}

	get finally() {
		this.#then;
		return (/** @type {any} */ fn) => {
			return this.#then(
				() => fn(),
				() => fn()
			);
		};
	}

	get current() {
		return this.#current;
	}

	get error() {
		return this.#error;
	}

	/**
	 * Returns true if the resource is loading or reloading.
	 */
	get loading() {
		return this.#loading;
	}

	/**
	 * Returns true once the resource has been loaded for the first time.
	 */
	get ready() {
		return this.#ready;
	}

	/**
	 * @returns {Promise<void>}
	 */
	refresh() {
		return (this.#promise = this.#run());
	}

	/**
	 * @param {T} value
	 */
	set(value) {
		this.#ready = true;
		this.#loading = false;
		this.#error = undefined;
		this.#raw = value;
		this.#promise = Promise.resolve();
	}

	/**
	 * @param {(old: T) => T} fn
	 */
	withOverride(fn) {
		this.#overrides.push(fn);

		return {
			_key: this._key,
			release: () => {
				const i = this.#overrides.indexOf(fn);

				if (i !== -1) {
					this.#overrides.splice(i, 1);
				}
			}
		};
	}
}
