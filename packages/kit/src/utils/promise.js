/**
 * Replacement for `Promise.withResolvers()` that does not require the native
 * static method, which only shipped in Safari 17.4 / Chrome 119 / Firefox 121.
 *
 * The client remote-function runtime is bundled and shipped to browsers verbatim
 * (Vite 8's default build target is Safari 16.4 / Chrome 111) and is not
 * polyfilled, so it must not assume `Promise.withResolvers` exists. The
 * server-side and build-time call sites run on Node 22+ and keep using the
 * native method.
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
