import { test, expect } from 'vitest';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import fs from 'node:fs';
import { createFilter, resolveConfig } from 'vite';
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

test('sync generates types without the SvelteKit plugin', { timeout }, () => {
	const temp = path.join(cwd, '.test-tmp');
	fs.mkdirSync(temp, { recursive: true });
	const root = fs.mkdtempSync(path.join(temp, 'sync-'));

	try {
		fs.writeFileSync(
			path.join(root, 'vite.config.js'),
			'export default { root: import.meta.dirname };'
		);
		fs.mkdirSync(path.join(root, 'src/routes'), { recursive: true });
		fs.writeFileSync(
			path.join(root, 'src/routes/+page.server.js'),
			'export const load = () => ({ message: "hello" });'
		);

		const result = spawnSync(
			process.execPath,
			[
				'node_modules/@sveltejs/kit/svelte-kit.js',
				'sync',
				'--config',
				path.join(root, 'vite.config.js')
			],
			{ cwd, encoding: 'utf-8', timeout }
		);

		expect(result.error).toBeUndefined();
		expect(result.status, result.stderr).toBe(0);
		expect(fs.existsSync(path.join(root, 'node_modules/$app/tsconfig.json'))).toBe(true);
		expect(
			fs.readFileSync(path.join(root, '.svelte-kit/types/src/routes/$types.d.ts'), 'utf-8')
		).toContain('PageServerLoad');
		expect(fs.existsSync(path.join(root, 'node_modules/$app/types/index.d.ts'))).toBe(true);
		expect(fs.existsSync(path.join(root, 'node_modules/$app/types/env.d.ts'))).toBe(true);
	} finally {
		fs.rmSync(root, { recursive: true, force: true });
	}
});

test.each(['build', 'serve'])(
	'sync generates fresh types with compile plugin apply: %s',
	{ timeout },
	(apply) => {
		const temp = path.join(cwd, '.test-tmp');
		fs.mkdirSync(temp, { recursive: true });
		const root = fs.mkdtempSync(path.join(temp, 'sync-'));

		try {
			fs.writeFileSync(
				path.join(root, 'vite.config.js'),
				`
					import { sveltekit } from '@sveltejs/kit/vite';
					const plugins = await sveltekit({ files: { src: 'source' }, outDir: '.custom-output' });
					plugins.find((plugin) => plugin.name === 'vite-plugin-sveltekit-compile').apply = '${apply}';
					export default { root: import.meta.dirname, plugins };
				`
			);
			fs.mkdirSync(path.join(root, 'source/routes'), { recursive: true });
			fs.writeFileSync(
				path.join(root, 'source/app.html'),
				'<html><head>%sveltekit.head%</head><body>%sveltekit.body%</body></html>'
			);
			fs.writeFileSync(
				path.join(root, 'source/routes/+page.server.js'),
				'export const load = () => ({ message: "hello" });'
			);
			fs.writeFileSync(
				path.join(root, 'source/env.js'),
				'export const variables = import.meta.env.MODE === "custom" ? { CUSTOM_MODE: {} } : { OTHER_MODE: {} };'
			);

			const result = spawnSync(
				process.execPath,
				[
					'node_modules/@sveltejs/kit/svelte-kit.js',
					'sync',
					'--config',
					path.join(root, 'vite.config.js'),
					'--mode',
					'custom'
				],
				{ cwd, encoding: 'utf-8', timeout }
			);

			expect(result.error).toBeUndefined();
			expect(result.status, result.stderr).toBe(0);
			expect(fs.existsSync(path.join(root, 'node_modules/$app/tsconfig.json'))).toBe(true);
			expect(
				fs.readFileSync(path.join(root, '.custom-output/types/source/routes/$types.d.ts'), 'utf-8')
			).toContain('PageServerLoad');
			expect(fs.existsSync(path.join(root, 'node_modules/$app/types/index.d.ts'))).toBe(true);
			const env_types = fs.readFileSync(
				path.join(root, 'node_modules/$app/types/env.d.ts'),
				'utf-8'
			);
			expect(env_types).toContain('CUSTOM_MODE');
			expect(env_types).not.toContain('OTHER_MODE');
			expect(fs.existsSync(path.join(root, '.custom-output/generated/build/server.js'))).toBe(
				apply === 'build'
			);
		} finally {
			fs.rmSync(root, { recursive: true, force: true });
		}
	}
);
