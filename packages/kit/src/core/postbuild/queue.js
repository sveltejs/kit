/** @import { PromiseWithResolvers } from '../../utils/promise.js' */
import { with_resolvers } from '../../utils/promise.js';

/**
 * @typedef {{
 *   fn: () => Promise<any>,
 *   fulfil: (value: any) => void,
 *   reject: (error: Error) => void
 * }} Task
 */

/** @param {number} concurrency */
export function queue(concurrency) {
	/** @type {Task[]} */
	const tasks = [];
	const { promise, resolve, reject } = /** @type {PromiseWithResolvers<void>} */ (with_resolvers());

	let current = 0;
	let closed = false;
	/** @type {Error | undefined} */
	let error;

	promise.catch(() => {
		// this is necessary in case a catch handler is never added
		// to the done promise by the user
	});

	function settle() {
		closed = true;
		if (error) {
			reject(error);
		} else {
			resolve();
		}
	}

	function dequeue() {
		if (current < concurrency) {
			const task = tasks.shift();

			if (task) {
				current += 1;
				const promise = Promise.resolve(task.fn());

				void promise
					.then(task.fulfil, (err) => {
						task.reject(err);
						error ??= err;
					})
					.then(() => {
						current -= 1;
						dequeue();
					});
			} else if (current === 0) {
				settle();
			}
		}
	}

	return {
		/** @param {() => any} fn */
		add: (fn) => {
			if (closed) throw new Error('Cannot add tasks to a queue that has ended');

			const promise = new Promise((fulfil, reject) => {
				tasks.push({ fn, fulfil, reject });
			});

			dequeue();
			return promise;
		},

		done: () => {
			if (current === 0) {
				settle();
			}

			return promise;
		}
	};
}
