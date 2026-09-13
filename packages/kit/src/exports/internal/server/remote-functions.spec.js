import { expect, test } from 'vitest';
import { init_remote_functions } from './remote-functions.js';

test.each(['sync', 'async'])(
	're-registering aliased prerender functions preserves %s input errors',
	async (mode) => {
		const cause = new Error('original input error');
		const fail = () => {
			throw cause;
		};
		const inputs = mode === 'async' ? () => Promise.resolve().then(fail) : fail;
		const remote = Object.assign(() => undefined, { __: { type: 'prerender', inputs } });
		const module = { first: remote, second: remote };

		init_remote_functions(module, 'src/routes/data.remote.js', 'hash');
		init_remote_functions(module, 'src/routes/data.remote.js', 'hash');

		await expect(Promise.resolve().then(() => remote.__.inputs())).rejects.toBe(cause);
	}
);
