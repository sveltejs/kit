import { execFileSync } from 'node:child_process';
import { expect, test } from 'vitest';

for (const conflict of ['primitive', 'major']) {
	test(`folded routes reject ${conflict} runtime conflicts`, () => {
		expect(() =>
			execFileSync('pnpm', ['build'], {
				cwd: import.meta.dirname,
				env: { ...process.env, RUNTIME_CONFLICT: conflict },
				stdio: 'pipe'
			})
		).toThrow(/normalize to the same Netlify pattern.*different runtimes/);
	});
}
