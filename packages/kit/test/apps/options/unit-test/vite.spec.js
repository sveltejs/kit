import { test, expect } from 'vitest';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { createFilter, resolveConfig } from 'vite';
import { sveltekit } from '@sveltejs/kit/vite';
import { bullet_list } from '../../../../src/utils/format.js';

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
	expect(result.stderr).not.toContain('transform_index_html_unsupported');
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
	expect(result.stderr).toContainKitDiagnostic('transform_index_html_unsupported', {
		contains: [bullet_list(['app-html-transform'])]
	});
});

/** @type {Array<[import('vite').BuildOptions, boolean | 'esbuild' | 'lightningcss']>} */
const css_minify_cases = [
	[{}, true],
	[{ minify: false }, false],
	[{ minify: true }, true],
	[{ minify: 'oxc' }, true],
	[{ cssMinify: false }, false],
	[{ cssMinify: true, minify: false }, true],
	[{ cssMinify: 'esbuild' }, 'esbuild'],
	[{ cssMinify: 'esbuild', minify: false }, 'esbuild'],
	[{ cssMinify: 'lightningcss', minify: false }, 'lightningcss']
];

test.each(css_minify_cases)('CSS minification for %j resolves to %s', async (build, expected) => {
	const config = await resolveConfig(
		{
			configFile: false,
			build,
			plugins: [
				sveltekit({
					files: { src: 'source', routes: 'source/pages', appTemplate: 'source/template.html' },
					outDir: '.custom-out-dir'
				})
			]
		},
		'build'
	);

	for (const name of ['ssr', 'client']) {
		expect(config.environments[name].build.cssMinify).toBe(expected);
	}
});
