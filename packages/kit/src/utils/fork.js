import { fileURLToPath } from 'node:url';
import { Worker, parentPort } from 'node:worker_threads';
import process from 'node:process';
import { setImmediate } from 'node:timers';

/**
 * Runs a task in a worker that exits upon completion, stopping any dangling work.
 * The worker needs to be the file `forked` is called in, and `forked` needs to be called eagerly at the top level.
 * @template T
 * @template U
 * @param {string} module `import.meta.url` of the file
 * @param {(opts: T) => Promise<U>} callback The function invoked in the worker. It must await all required work and asynchronous cleanup.
 * @returns {(opts: T) => Promise<U>} A function that starts the worker and resolves after it has exited, including synchronous exit handlers
 */
export function forked(module, callback) {
	if (process.env.SVELTEKIT_FORK && parentPort) {
		parentPort.on(
			'message',
			/** @param {any} data */ async (data) => {
				if (data?.type === 'args' && data.module === module) {
					const payload = await callback(data.payload);

					// Flush buffered output before exiting, rather than cutting off pending writes.
					await Promise.all(
						[process.stdout, process.stderr].map(
							(stream) =>
								new Promise((fulfil, reject) => {
									stream.write('', (error) => (error ? reject(error) : fulfil(undefined)));
								})
						)
					);

					parentPort?.postMessage({
						type: 'result',
						module,
						payload
					});

					// Unlike worker.terminate(), this runs synchronous process.on('exit') handlers.
					// Exit outside this async callback so errors in exit handlers are uncaught
					// exceptions, rather than promise rejections after Node has started exiting.
					setImmediate(() => process.exit());
				}
			}
		);

		parentPort.postMessage({ type: 'ready', module });
	}

	/**
	 * @param {T} opts
	 * @returns {Promise<U>}
	 */
	return function (opts) {
		return new Promise((fulfil, reject) => {
			const worker = new Worker(fileURLToPath(module), {
				env: {
					...process.env,
					SVELTEKIT_FORK: 'true',
					FORCE_COLOR: '1'
				}
			});

			/** @type {{ payload: U } | undefined} */
			let result;
			/** @type {{ error: unknown } | undefined} */
			let failure;

			worker.on(
				'message',
				/** @param {any} data */ (data) => {
					if (data?.type === 'ready' && data.module === module) {
						worker.postMessage({
							type: 'args',
							module,
							payload: opts
						});
					}

					if (data?.type === 'result' && data.module === module) {
						result = data;
					}
				}
			);

			worker.once('error', (error) => {
				failure = { error };
			});

			worker.once('exit', (code) => {
				if (failure) {
					reject(failure.error);
				} else if (code) {
					const error = new Error(`Failed with code ${code}`);
					error.stack = error.message;
					reject(error);
				} else if (!result) {
					reject(new Error('Worker exited without returning a result'));
				} else {
					// All messages are delivered before 'exit'. Wait until cleanup has finished.
					fulfil(result.payload);
				}
			});
		});
	};
}
