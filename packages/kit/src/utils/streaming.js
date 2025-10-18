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
	let count = 0;
	let accessed = false;

	const deferred = [with_resolvers()];

	return {
		iterate: (transform = (x) => x) => {
			return {
				[Symbol.asyncIterator]() {
					accessed = true;
					if (count === 0) {
						deferred[deferred.length - 1].resolve({ done: true });
					}

					return {
						next: async () => {
							const next = await deferred[0].promise;

							if (!next.done) {
								deferred.shift();
								return { value: transform(next.value), done: false };
							}

							return next;
						}
					};
				}
			};
		},
		add: (promise) => {
			count += 1;

			void promise.then((value) => {
				deferred[deferred.length - 1].resolve({
					value,
					done: false
				});
				deferred.push(with_resolvers());

				if (--count === 0 && accessed) {
					deferred[deferred.length - 1].resolve({ done: true });
				}
			});
		}
	};
}
