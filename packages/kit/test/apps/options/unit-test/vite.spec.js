import { test, expect } from 'vitest';
import { spawnSync } from 'node:child_process';
import path from 'node:path';

const timeout = 60_000;

const cwd = path.resolve(import.meta.dirname, '..');

test('no overridden options warning', { timeout }, () => {
	const result = spawnSync(
		'pnpm',
		['vitest', 'run', '--config', './vite.custom.config.js', '-t', 'noop'],
		{
			cwd,
			stdio: 'pipe',
			encoding: 'utf-8',
			timeout
		}
	);

	expect(result.error).toBeUndefined();
	expect(result.stderr).not.toContain('overridden by SvelteKit');
	expect(result.stderr).toBe('');
});
