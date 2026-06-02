import { test, expect } from 'vitest';
import { spawnSync } from 'node:child_process';
import path from 'node:path';

const cwd = path.resolve(import.meta.dirname, '..');

test('no overridden options warning', () => {
	const result = spawnSync('vitest', ['run', '--config', './vite.custom.config.js', '-t', 'noop'], {
		cwd,
		encoding: 'utf-8'
	});

	expect(result.error).toBeUndefined();
	expect(result.stderr).not.toContain('overridden by SvelteKit');
	expect(result.stderr).toBe('');
});

test('inline plugin options are used instead of svelte.config.js', () => {
	const result = spawnSync(
		'vitest',
		['run', '--config', './vite.inline-options.config.js', '-t', 'noop'],
		{
			cwd,
			encoding: 'utf-8'
		}
	);

	expect(result.status).not.toBe(0);
	expect(result.stderr).toContain(
		"The `router.resolution` option cannot be 'server' if `router.type` is 'hash'"
	);
});
