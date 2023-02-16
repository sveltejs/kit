import { fileURLToPath } from 'node:url';
import child_process from 'node:child_process';

/**
 * Runs a task in a subprocess so any dangling stuff gets killed upon completion.
 * The subprocess needs to be the file `forked` is called in, and `forked` needs to be called eagerly at the top level.
 * @template T
 * @template U
 * @param {string} module `import.meta.url` of the file
 * @param {(opts: T) => U} callback The function that is invoked in the subprocess
 * @returns {(opts: T) => Promise<U>} A function that when called starts the subprocess
 */
export function forked(module, callback) {
	if (process.env.SVELTEKIT_FORK && process.send) {
		process.send({ type: 'ready', module });

		process.on(
			'message',
			/** @param {any} data */ async (data) => {
				if (data?.type === 'args' && data.module === module) {
					if (process.send) {
						process.send({
							type: 'result',
							module,
							payload: await callback(data.payload)
						});
					}
				}
			}
		);
	}

	/**
	 * @param {T} opts
	 * @returns {Promise<U>}
	 */
	const fn = function (opts) {
		return new Promise((fulfil, reject) => {
			const child = child_process.fork(fileURLToPath(module), {
				stdio: 'inherit',
				env: {
					...process.env,
					SVELTEKIT_FORK: 'true'
				},
				serialization: 'advanced'
			});

			child.on(
				'message',
				/** @param {any} data */ (data) => {
					if (data?.type === 'ready' && data.module === module) {
						child.send({
							type: 'args',
							module,
							payload: opts
						});
					}

					if (data?.type === 'result' && data.module === module) {
						child.kill();
						fulfil(data.payload);
					}
				}
			);

			child.on('exit', (code) => {
				if (code) {
					reject(new Error(`Failed with code ${code}`));
				}
			});
		});
	};

	return fn;
}
