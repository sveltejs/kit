/**
 * @returns {import("types").Deferred & { promise: Promise<any> }}}
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
 * @returns {{
 *   iterator: AsyncIterable<any>;
 *   push: (value: any) => void;
 *   done: () => void;
 * }}
 */
export function create_async_iterator() {
	let deferred = defer();

	return {
		iterator: {
			[Symbol.asyncIterator]() {
				return {
					next: () => deferred.promise
				};
			}
		},
		push: (value) => {
			deferred.fulfil({ value, done: false });
			deferred = defer();
		},
		done: () => {
			deferred.fulfil({ done: true });
		}
	};
}
