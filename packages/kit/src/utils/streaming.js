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
	let returned = -1;

	/** @type {PromiseWithResolvers<T>[]} */
	const deferred = [];

	return {
		iterate: (transform = (x) => x) => {
			return {
				[Symbol.asyncIterator]() {
					return {
						next: async () => {
							const next = deferred[++returned];
							if (!next) return { value: null, done: true };

							const value = await next.promise;
							return { value: transform(value), done: false };
						}
					};
				}
			};
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
