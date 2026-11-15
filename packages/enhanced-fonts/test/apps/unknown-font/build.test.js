import { execFileSync } from 'node:child_process';
import { expect, test } from 'vitest';

test('unknown Font cssVariable throws at build/SSR', () => {
	try {
		execFileSync('pnpm', ['exec', 'vite', 'build'], {
			cwd: import.meta.dirname,
			encoding: 'utf8',
			stdio: ['ignore', 'pipe', 'pipe']
		});
		throw new Error('expected build to fail');
	} catch (err) {
		if (err instanceof Error && err.message === 'expected build to fail') throw err;
		const text = `${err.stdout ?? ''}\n${err.stderr ?? ''}\n${err.message}`;
		expect(text).toMatch(/Unknown font cssVariable "--font-not-in-config"/);
	}
}, 120_000);
