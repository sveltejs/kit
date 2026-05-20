import { test, expect } from 'vitest';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

// TODO: change to import.meta.dir in version-3 branch
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const cwd = path.resolve(__dirname, '..');

test('no overridden options warning', () => {
	const result = spawnSync('vitest', ['run', '--config', './vite.custom.config.js', '-t', 'noop'], {
		cwd,
		encoding: 'utf-8'
	});

	expect(result.error).toBeUndefined();
	expect(result.stderr).not.toContain('overridden by SvelteKit');
	expect(result.stderr).toBe('');
});
