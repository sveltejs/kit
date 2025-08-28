/**
 * @returns {import('types').Deferred & { promise: Promise<any> }}}
 */
function defer() {
	let fulfil;
	let reject;

	const promise = new Promise((f, r) => {
		fulfil = f;
		reject = r;
	});

	// @ts-expect-error
	return { promise, fulfil, reject };
}

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

	const deferred = [defer()];

	return {
		iterate: (transform = (x) => x) => {
			return {
				[Symbol.asyncIterator]() {
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
				deferred[deferred.length - 1].fulfil({
					value,
					done: false
				});
				deferred.push(defer());

				if (--count === 0) {
					deferred[deferred.length - 1].fulfil({ done: true });
				}
			});
		}
	};
}
