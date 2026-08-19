import { noop } from './functions.js';

/**
 * Create an async iterator and a function to push values into it
 * @template T
 * @returns {{
 *   iterate: (transform?: (input: T) => T) => AsyncIterable<T>;
 *   add: (promise: Promise<T>) => void;
 * }}
 */
export function create_async_iterator() {
	let resolved = -1;

	/** @type {PromiseWithResolvers<T>[]} */
	const deferred = [];

	return {
		iterate: async function* (transform = (x) => x) {
			// `deferred` can grow while we iterate, as resolved values may add further promises
			for (let i = 0; i < deferred.length; i += 1) {
				yield transform(await deferred[i].promise);
			}
		},
		add: (promise) => {
			const next = Promise.withResolvers();
			void next.promise.catch(noop); // prevent unhandled rejection potentially crashing the process
			deferred.push(next);

			void promise.then(
				(value) => {
					deferred[++resolved].resolve(value);
				},
				(error) => {
					deferred[++resolved].reject(error);
				}
			);
		}
	};
}
