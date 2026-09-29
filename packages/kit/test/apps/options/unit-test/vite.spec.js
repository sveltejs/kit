import { test, expect } from 'vitest';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { createFilter, resolveConfig } from 'vite';

const timeout = 60_000;

const cwd = path.resolve(import.meta.dirname, '..');

test('ignores all outDir files except generated files', async () => {
	const config = await resolveConfig(
		{ configFile: path.join(cwd, 'vite.custom.config.js') },
		'serve'
	);
	const is_ignored = createFilter(config.server.watch.ignored);
	const out_dir = path.resolve(cwd, '.custom-out-dir').replaceAll('\\', '/');

	expect(is_ignored(`${out_dir}/tsconfig.json`)).toBe(true);
	expect(is_ignored(`${out_dir}/.svelte-check/tsconfig.json`)).toBe(true);
	expect(is_ignored(`${out_dir}/types/a/$types.d.ts`)).toBe(true);
	expect(is_ignored(`${out_dir}/generated`)).toBe(false);
	expect(is_ignored(`${out_dir}/generated/root.js`)).toBe(false);
	expect(is_ignored(`${out_dir}/generated/client/app.js`)).toBe(false);
});

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

test('no transformIndexHtml warning for the Vitest browser loader', { timeout }, () => {
	const result = spawnSync(
		'pnpm',
		['vitest', 'run', '--config', './vite.custom.config.js', '-t', 'noop'],
		{
			cwd,
			env: { ...process.env, TEST_HTML_TRANSFORM_PLUGIN: 'vitest:browser:loader' },
			stdio: 'pipe',
			encoding: 'utf-8',
			timeout
		}
	);

	expect(result.error).toBeUndefined();
	expect(result.status).toBe(0);
	expect(result.stdout).not.toContain('transformIndexHtml');
});

test('transformIndexHtml warning for app plugins', { timeout }, () => {
	const result = spawnSync(
		'pnpm',
		['vitest', 'run', '--config', './vite.custom.config.js', '-t', 'noop'],
		{
			cwd,
			env: { ...process.env, TEST_HTML_TRANSFORM_PLUGIN: 'app-html-transform' },
			stdio: 'pipe',
			encoding: 'utf-8',
			timeout
		}
	);

	expect(result.error).toBeUndefined();
	expect(result.status).toBe(0);
	expect(result.stdout).toContain('transformIndexHtml');
	expect(result.stdout).toContain('app-html-transform');
});
