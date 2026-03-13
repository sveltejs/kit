/** @see https://github.com/microsoft/TypeScript/blob/904e7dd97dc8da1352c8e05d70829dff17c73214/src/lib/es2024.promise.d.ts */

/**
 * @template T
 * @typedef {{
 *   promise: Promise<T>;
 *   resolve: (value: T | PromiseLike<T>) => void;
 *   reject: (reason?: any) => void;
 * }} PromiseWithResolvers<T>
 */

/**
 * TODO: Whenever Node >21 is minimum supported version, we can use `Promise.withResolvers` to avoid this ceremony
 *
 * @template T
 * @returns {PromiseWithResolvers<T>}
 */
export function with_resolvers() {
	let resolve;
	let reject;

	const promise = new Promise((res, rej) => {
		resolve = res;
		reject = rej;
	});

	// @ts-expect-error `resolve` and `reject` are assigned!
	return { promise, resolve, reject };
}

/**
 * @template T
 * @implements {Promise<T>}
 */
export class LazyPromise {
	get [Symbol.toStringTag]() {
		return 'LazyPromise';
	}

	/** @type {() => T | Promise<T>} */
	#fn;
	/** @type {Promise<T>} */
	#promise;
	/** @type {(value: T | PromiseLike<T>) => void} */
	#resolve;
	/** @type {(reason?: any) => void} */
	#reject;
	/** @type {boolean} */
	#started = false;

	/** @param {() => T | Promise<T>} fn */
	constructor(fn) {
		const { promise, resolve, reject } = with_resolvers();
		this.#promise = promise;
		this.#resolve = resolve;
		this.#reject = reject;
		this.#fn = fn;
	}

	#start() {
		if (this.#started) return;
		this.#started = true;
		try {
			// we need to call `fn` synchronously so that we hit `hydratable` synchronously
			// so that it doesn't get microtasked out of hydration
			// TODO at some distant point in the future this can be Promise.try(fn).then(resolve, reject);
			Promise.resolve(this.#fn()).then(this.#resolve, this.#reject);
		} catch (error) {
			this.#reject(error);
		}
	}

	/** @type {Promise<T>['then']} */
	then(onfulfilled, onrejected) {
		this.#start();
		return this.#promise.then(onfulfilled, onrejected);
	}

	/** @type {Promise<T>['catch']} */
	catch(onrejected) {
		this.#start();
		return this.#promise.catch(onrejected);
	}

	/** @type {Promise<T>['finally']} */
	finally(onfinally) {
		this.#start();
		return this.#promise.finally(onfinally);
	}
}
