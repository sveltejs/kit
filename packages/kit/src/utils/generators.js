/**
 * This method is necessary because we can't yield from inside a callback,
 * so we smooth other an internal less ergonomic callback API
 * @template {(...args: any) => void} Fn
 * @param {Fn} fn
 * @returns {Parameters<Fn> extends [...infer InitPs, (value: infer Value, done: boolean) => void] ? (...args: InitPs) => AsyncGenerator<Value, undefined, undefined> : never}
 */
export function to_generator(fn) {
	// @ts-ignore yeah TS this return type is fucked up, I know
	return async function* (...args) {
		/** @type {(v: any) => void} */
		let fulfill;
		/** @type {(v: any) => void} */
		let reject;
		let promise = new Promise((f, r) => {
			fulfill = f;
			reject = r;
		});
		// Ensure it runs after we enter the loop to not swallow the first eager result
		Promise.resolve()
			.then(() =>
				fn(
					...args,
					/**
					 *@param {any} result
					 * @param {boolean} done
					 */
					(result, done) => {
						fulfill({ result, done });
						if (!done) {
							promise = new Promise((r) => {
								fulfill = r;
							});
						}
					}
				)
			)
			// catch and rethrow to avoid unhandled promise rejection
			.catch((e) => reject(e));

		while (true) {
			const { result, done } = await promise;
			yield result;
			if (done) return undefined;
		}
	};
}
