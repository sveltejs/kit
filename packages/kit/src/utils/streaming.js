import { noop } from './functions.js';
import { with_resolvers } from './promise.js';

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

	/** @type {import('./promise.js').PromiseWithResolvers<T>[]} */
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
			/** @type {import('./promise.js').PromiseWithResolvers<T>} */
			const next = with_resolvers();
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
