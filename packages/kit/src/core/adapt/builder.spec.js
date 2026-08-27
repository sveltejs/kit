import { copyFileSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { assert, expect, test } from 'vitest';
import { create_builder } from './builder.js';
import { walk } from '../../utils/filesystem.js';

test('copy files', () => {
	const cwd = join(import.meta.dirname, 'fixtures/basic');
	const outDir = join(cwd, '.svelte-kit');

	/** @type {import('@sveltejs/kit/vite').Config} */
	const mocked = {
		extensions: ['.svelte'],
		appDir: '_app',
		files: {
			assets: join(import.meta.dirname, 'fixtures/basic/static')
		},
		outDir
	};

	const builder = create_builder({
		config: /** @type {import('types').ValidatedConfig} */ (mocked),
		// @ts-expect-error
		build_data: {},
		// @ts-expect-error
		server_metadata: {},
		route_data: [],
		// @ts-expect-error
		prerendered: {
			paths: []
		},
		// @ts-expect-error
		prerender_map: {},
		// @ts-expect-error
		log: {}
	});

	const dest = join(import.meta.dirname, 'output');

	rmSync(dest, { recursive: true, force: true });

	expect(builder.writeClient(dest)).toEqual([...walk(dest)]);
	expect([...walk(`${outDir}/output/client`)].filter((file) => !file.startsWith('.vite/'))).toEqual(
		[...walk(dest)]
	);

	rmSync(dest, { recursive: true, force: true });

	expect(builder.writeServer(dest)).toEqual([...walk(dest)]);
	expect([...walk(`${outDir}/output/server`)]).toEqual([...walk(dest)]);

	rmSync(dest, { force: true, recursive: true });
});

test('compress files', async () => {
	const builder = create_builder({
		// @ts-expect-error - we don't need the whole config for this test
		build_data: {},
		route_data: []
	});

	const targets = [
		fileURLToPath(new URL('./fixtures/compress/foo.css', import.meta.url)),
		fileURLToPath(new URL('./fixtures/compress/foo.md', import.meta.url)),
		fileURLToPath(new URL('./fixtures/compress/foo.mdx', import.meta.url))
	];
	for (const target of targets) {
		rmSync(target + '.br', { force: true });
		rmSync(target + '.gz', { force: true });
	}
	const compressed = await builder.compress(dirname(targets[0]));
	for (const target of targets) {
		assert.ok(existsSync(target + '.br'));
		assert.ok(existsSync(target + '.gz'));
	}
	assert.deepEqual(compressed.sort(), ['foo.css', 'foo.md', 'foo.mdx']);
});

test('compress returns an empty array for a directory that does not exist', async () => {
	const builder = create_builder({
		// @ts-expect-error - we don't need the whole config for this test
		build_data: {},
		route_data: []
	});

	assert.deepEqual(await builder.compress('does/not/exist'), []);
});

test('instrument generates facade with posix paths', () => {
	const fixtureDir = join(import.meta.dirname, 'fixtures/instrument');
	const dest = join(import.meta.dirname, 'output');

	rmSync(dest, { recursive: true, force: true });
	mkdirSync(join(dest, 'server'), { recursive: true });
	copyFileSync(join(fixtureDir, 'index.js'), join(dest, 'index.js'));
	copyFileSync(
		join(fixtureDir, 'server/instrumentation.server.js'),
		join(dest, 'server/instrumentation.server.js')
	);

	const entrypoint = join(dest, 'index.js');
	const instrumentation = join(dest, 'server', 'instrumentation.server.js');

	const builder = create_builder({
		// @ts-expect-error - we don't need the whole build data for this test
		build_data: { app_path: '' },
		// @ts-expect-error - we don't need the whole config for this test
		config: { outDir: dest },
		route_data: []
	});

	builder.instrument({
		entrypoint,
		instrumentation,
		module: { exports: ['default'] }
	});

	// Read the generated facade
	const facade = readFileSync(entrypoint, 'utf-8');

	// Verify it uses forward slashes (not backslashes)
	// On Windows, path.relative() returns 'server\instrumentation.server.js'
	// The fix ensures this becomes 'server/instrumentation.server.js'
	expect(facade).toContain('import "./server/instrumentation.server.js"');
	expect(facade).not.toContain('\\');

	// Cleanup
	rmSync(dest, { recursive: true, force: true });
});

test('instrument initializes environment before instrumentation', async () => {
	const dest = join(import.meta.dirname, 'output');
	const entrypoint = join(dest, 'functions', 'index.js');
	const instrumentation = join(dest, 'server', 'instrumentation.server.js');
	const out_dir = dest;
	const env = join(out_dir, 'output', 'server', 'env.js');

	rmSync(dest, { recursive: true, force: true });
	mkdirSync(dirname(entrypoint), { recursive: true });
	mkdirSync(dirname(instrumentation), { recursive: true });
	mkdirSync(dirname(env), { recursive: true });
	writeFileSync(entrypoint, `export default globalThis.order;`);
	writeFileSync(
		instrumentation,
		`globalThis.order.push(['instrumentation', globalThis.env_value]);`
	);
	writeFileSync(
		env,
		`export function set_env(env) { globalThis.env_value = env.VALUE; globalThis.order.push(['env', env.VALUE]); }`
	);

	// @ts-expect-error - we don't need the whole config for this test
	const builder = create_builder({ config: { outDir: out_dir }, route_data: [] });
	let env_path;

	builder.instrument({
		entrypoint,
		instrumentation,
		environment: {
			generateInit: ({ importSpecifier }) => {
				env_path = importSpecifier;
				return `import { set_env } from ${JSON.stringify(importSpecifier)}; set_env({ VALUE: 'set' });`;
			}
		}
	});

	expect(env_path).toBe('../output/server/env.js');
	const facade = readFileSync(entrypoint, 'utf8');
	expect(facade.indexOf('__sveltekit_env_init.js')).toBeLessThan(
		facade.indexOf('server/instrumentation.server.js')
	);

	// @ts-expect-error test-only state shared by generated modules
	globalThis.order = [];
	const url = pathToFileURL(entrypoint);
	url.search = String(Date.now());
	const result = await import(url.href);
	expect(result.default).toEqual([
		['env', 'set'],
		['instrumentation', 'set']
	]);
	// @ts-expect-error test-only state shared by generated modules
	delete globalThis.order;
	// @ts-expect-error test-only state shared by generated modules
	delete globalThis.env_value;
	rmSync(dest, { recursive: true, force: true });
});

test('instrument passes environment initializer to custom facade', () => {
	const dest = join(import.meta.dirname, 'output');
	const entrypoint = join(dest, 'index.js');
	const instrumentation = join(dest, 'instrumentation.server.js');
	const env = join(dest, 'output', 'server', 'env.js');

	rmSync(dest, { recursive: true, force: true });
	mkdirSync(dirname(env), { recursive: true });
	writeFileSync(entrypoint, 'export default true;');
	writeFileSync(instrumentation, '');
	writeFileSync(env, 'export function set_env() {}');

	// @ts-expect-error - we don't need the whole config for this test
	const builder = create_builder({ config: { outDir: dest }, route_data: [] });
	builder.instrument({
		entrypoint,
		instrumentation,
		environment: {
			generateInit: ({ importSpecifier }) => `import ${JSON.stringify(importSpecifier)};`
		},
		module: {
			generateText: ({ environment, instrumentation, start }) =>
				`import ${JSON.stringify(`./${environment}`)};\nimport ${JSON.stringify(`./${instrumentation}`)};\nexport { default } from ${JSON.stringify(`./${start}`)};`
		}
	});

	const facade = readFileSync(entrypoint, 'utf8');
	expect(facade).toContain('import "./__sveltekit_env_init.js";');
	rmSync(dest, { recursive: true, force: true });
});

test('instrument replaces an environment initializer', () => {
	const dest = join(import.meta.dirname, 'output');
	const entrypoint = join(dest, 'index.js');
	const instrumentation = join(dest, 'instrumentation.server.js');

	rmSync(dest, { recursive: true, force: true });
	mkdirSync(dest, { recursive: true });
	writeFileSync(entrypoint, 'export default true;');
	writeFileSync(instrumentation, '');
	writeFileSync(join(dest, '__sveltekit_env_init.js'), 'existing');

	// @ts-expect-error - we don't need the whole config for this test
	const builder = create_builder({ config: { outDir: dest }, route_data: [] });
	builder.instrument({ entrypoint, instrumentation, environment: {} });
	expect(readFileSync(join(dest, '__sveltekit_env_init.js'), 'utf8')).not.toBe('existing');
	rmSync(dest, { recursive: true, force: true });
});
