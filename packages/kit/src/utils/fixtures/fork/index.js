import process from 'node:process';
import { setTimeout } from 'node:timers/promises';
import { forked } from '../../fork.js';

export const run = forked(
	import.meta.url,
	/**
	 * @param {{
	 *   action: 'return' | 'undefined' | 'throw' | 'exit' | 'exit-code' | 'exit-error' | 'stdio';
	 *   state?: Int32Array;
	 *   code?: number;
	 *   error?: unknown;
	 * }} options
	 */
	async ({ action, state, code = 0, error = new Error('exit handler failed') }) => {
		if (state) {
			setInterval(() => Atomics.add(state, 3, 1), 1);
			process.on('exit', () => {
				// Make resolving on the result message observably different from waiting for exit.
				Atomics.wait(state, 2, 0, 50);
				Atomics.store(state, 2, 1);
			});
		}

		try {
			await setTimeout(10);
			if (state) Atomics.store(state, 0, 1);

			switch (action) {
				case 'undefined':
					return undefined;
				case 'throw':
					throw new Error('callback failed');
				case 'exit':
					return process.exit(code);
				case 'exit-code':
					process.exitCode = code;
					break;
				case 'exit-error':
					process.on('exit', () => {
						throw error;
					});
					break;
				case 'stdio':
					for (let i = 0; i < 128; i += 1) {
						process.stdout.write('out\n'.repeat(1024));
						process.stderr.write('err\n'.repeat(1024));
					}
			}

			return { answer: 42 };
		} finally {
			if (state) {
				await setTimeout(10);
				Atomics.store(state, 1, 1);
			}
		}
	}
);
