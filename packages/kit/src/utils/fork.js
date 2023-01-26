import { fileURLToPath } from 'node:url';
import child_process from 'node:child_process';
import { dirname } from 'node:path';
import { existsSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs';
import * as devalue from 'devalue';

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
	/**
	 * @param {string} random
	 */
	function args_to_path(random) {
		return fileURLToPath(dirname(module) + '/__sveltekit_args__' + random);
	}
	/**
	 * @param {string} random
	 */
	function result_to_path(random) {
		return fileURLToPath(dirname(module) + '/__sveltekit_result__' + random);
	}

	if (process.env.SVELTEKIT_FORK) {
		try {
			const random = process.argv[2];
			if (process.argv[3] !== module) {
				// @ts-expect-error guard against this getting called again with a different module
				return;
			}
			console.trace('hello', process.argv[3], module);
			console.trace('hi2', args_to_path(random), existsSync(args_to_path(random)));
			const data = devalue.parse(readFileSync(args_to_path(random), 'utf-8'));
			unlinkSync(args_to_path(random));
			const run = async () => {
				try {
					const result = await callback(data);
					writeFileSync(result_to_path(random), devalue.stringify(result), 'utf-8');
					process.exit(0);
				} catch (err) {
					console.error(err);
					process.exit(1);
				}
			};
			run();
		} catch (e) {
			console.error(e);
			process.exit(1);
		}
		// @ts-expect-error return irrelevant in sub process
		return;
	}

	/**
	 * @param {T} opts
	 * @returns {Promise<U>}
	 */
	const fn = function (opts) {
		return new Promise((fulfil, reject) => {
			const script = fileURLToPath(new URL(module, import.meta.url));
			const random = Math.random().toString(36).slice(2);

			writeFileSync(args_to_path(random), devalue.stringify(opts), 'utf-8');
			console.trace('starting sub', args_to_path(random), existsSync(args_to_path(random)));
			const child = child_process.fork(script, [random, module], {
				stdio: 'inherit',
				env: {
					SVELTEKIT_FORK: 'true'
				}
			});

			child.on('exit', (code) => {
				if (code) {
					reject(new Error(`Failed with code ${code}`));
				} else {
					const result = readFileSync(result_to_path(random), 'utf-8');
					unlinkSync(result_to_path(random));
					fulfil(devalue.parse(result));
				}
			});
		});
	};

	return fn;
}
