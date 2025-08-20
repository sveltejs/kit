/** @import { RemoteQueryFunction } from '@sveltejs/kit' */
import { app_dir, base } from '__sveltekit/paths';
import { remote_responses, started } from '../client.js';
import { tick } from 'svelte';
import { create_remote_function, remote_request } from './shared.svelte.js';

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
