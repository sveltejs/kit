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
 * @param {Set<string>} safe_keys
 * @param {() => Promise<T>} fn
 * @returns {Promise<T>}
 */
export function lazy_promise(safe_keys, fn) {
	const { promise, resolve, reject } = with_resolvers();
	let started = false;

	return new Proxy(promise, {
		get(target, prop, receiver) {
			if (!started && typeof prop === 'string' && !safe_keys.has(prop)) {
				started = true;

				try {
					// we need to call `fn` synchronously so that we hit `hydratable` synchronously
					// so that it doesn't get microtasked out of hydration
					// TODO at some distant point in the future this can be Promise.try(fn).then(resolve, reject);
					Promise.resolve(fn()).then(resolve, reject);
				} catch (error) {
					reject(error);
				}
			}

			const value = Reflect.get(target, prop, receiver);
			if (typeof value === 'function') {
				return value.bind(target);
			}
			return value;
		}
	});
}
