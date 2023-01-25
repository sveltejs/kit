import { fileURLToPath } from 'node:url';
import child_process from 'node:child_process';

/**
 * @template T
 * @template U
 * @param {string} module
 * @param {(opts: T) => U} callback
 * @returns {(opts: T) => Promise<U>}
 */
export function forked(module, callback) {
	if (process.env.SVELTEKIT_FORK) {
		process.on(
			'message',
			/** @param {any} data */ async (data) => {
				if (data.type === 'args' && data.module === module) {
					if (process.send) {
						process.send({
							type: 'result',
							module,
							payload: await callback(data.payload)
						});

						process.exit(0);
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
			// do prerendering in a subprocess so any dangling stuff gets killed upon completion
			const script = fileURLToPath(new URL(module, import.meta.url));

			const child = child_process.fork(script, {
				stdio: 'inherit',
				env: {
					SVELTEKIT_FORK: 'true'
				},
				serialization: 'advanced'
			});

			child.on(
				'message',
				/** @param {any} data */ (data) => {
					if (data.type === 'result' && data.module === module) {
						fulfil(data.payload);
					}
				}
			);

			child.on('exit', (code) => {
				if (code) {
					reject(new Error(`Failed with code ${code}`));
				}
			});

			child.send({
				type: 'args',
				module,
				payload: opts
			});
		});
	};

	return fn;
}
