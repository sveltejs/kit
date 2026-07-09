import { assert, test } from 'vitest';
import { execSync } from 'node:child_process';
import path from 'node:path';

const timeout = 60_000;

test(
	'*.remote.js files cannot be used without the experimental.remoteFunctions flag',
	{
		timeout
	},
	() => {
		assert.throws(
			() =>
				execSync('pnpm build', {
					cwd: path.join(import.meta.dirname, 'apps/remote-function-without-flag'),
					stdio: 'pipe',
					timeout
				}),
			/To enable remote functions, add the following to your SvelteKit plugin in `vite.config.js`:[\s\S]*remoteFunctions: true/
		);
	}
);
