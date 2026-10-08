import { copyFileSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join, dirname, extname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { assert, expect, test } from 'vitest';
import { create_builder } from './builder.js';
import { walk } from '../../utils/filesystem.js';

/**
 * @param {string} outDir
 * @param {import('types').ManifestData['assets']} [assets]
 */
function create_test_builder(outDir, assets = []) {
	return create_builder({
		// @ts-expect-error - only fields used by these tests are provided
		config: { outDir },
		// @ts-expect-error - only fields used by these tests are provided
		build_data: {
			out_dir: join(outDir, 'output'),
			app_path: '',
			manifest_data: {
				assets,
				nodes: [],
				hooks: { client: null, server: null, universal: null },
				routes: [],
				params: ''
			},
			server_manifest: {}
		},
		server_metadata: { nodes: [], routes: new Map(), remotes: new Map() },
		route_data: [],
		prerendered: { pages: new Map(), assets: new Map(), paths: [], redirects: new Map() },
		prerender_map: new Map(),
		app_manifest: { assets: [], immutable: [], prerendered: [], routes: [] },
		// @ts-expect-error - logging is not used by these tests
		log: {},
		// @ts-expect-error - only root is used by these tests
		vite_config: { root: '' },
		remotes: [],
		explicit_env_config: null
	});
}

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

	const builder = create_test_builder(dest);
	const initializer = builder.createInstrumentationInitializer({ outputDirectory: dest });

	builder.instrument({
		entrypoint,
		instrumentation,
		initializer,
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
	const builder = create_test_builder(out_dir);
	const initializer = builder.createInstrumentationInitializer({
		outputDirectory: dirname(entrypoint),
		environment: `export default { VALUE: 'set' };`
	});

	builder.instrument({
		entrypoint,
		instrumentation,
		initializer
	});

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

test('initializer can target copied server output', () => {
	const dest = join(import.meta.dirname, 'output');
	const server = join(dest, 'server');

	rmSync(dest, { recursive: true, force: true });
	mkdirSync(server, { recursive: true });
	writeFileSync(join(server, 'env.js'), 'export function set_env() {}');

	const builder = create_test_builder(join(dest, '.svelte-kit'));
	const initializer = builder.createInstrumentationInitializer({
		outputDirectory: join(dest, 'functions'),
		serverDirectory: server
	});
	const source = readFileSync(initializer, 'utf8');

	expect(source).toContain('import { set_env } from "../server/env.js";');
	expect(source).not.toContain('.svelte-kit');
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
	const builder = create_test_builder(dest);
	const initializer = builder.createInstrumentationInitializer({
		outputDirectory: dest,
		environment: 'export default {};'
	});
	builder.instrument({
		entrypoint,
		instrumentation,
		initializer,
		module: {
			generateText: ({ initializer, instrumentation, start }) =>
				`import ${JSON.stringify(`./${initializer}`)};\nimport ${JSON.stringify(`./${instrumentation}`)};\nexport { default } from ${JSON.stringify(`./${start}`)};`
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
	mkdirSync(join(dest, 'output', 'server'), { recursive: true });
	writeFileSync(join(dest, 'output', 'server', 'env.js'), 'export function set_env() {}');
	writeFileSync(join(dest, '__sveltekit_env.js'), 'existing');
	writeFileSync(join(dest, '__sveltekit_env_init.js'), 'existing');

	const builder = create_test_builder(dest);
	const initializer = builder.createInstrumentationInitializer({ outputDirectory: dest });
	builder.instrument({ entrypoint, instrumentation, initializer });
	expect(readFileSync(join(dest, '__sveltekit_env.js'), 'utf8')).toBe(
		'export default process.env;'
	);
	expect(readFileSync(join(dest, '__sveltekit_env_init.js'), 'utf8')).not.toBe('existing');
	rmSync(dest, { recursive: true, force: true });
});

test.each([
	{ file: 'pages/index.html', pathname: '/', type: 'text/html' },
	{ file: 'pages/nested/index.html', pathname: '/nested/', type: 'text/html' },
	{ file: 'pages/about.css.html', pathname: '/about.css', type: 'text/html' },
	{ file: 'pages/redirect.html', pathname: '/redirect', type: 'text/html' },
	{ file: 'dependencies/favicon.ico', pathname: '/favicon.ico', type: 'image/x-icon' },
	{ file: 'data/payload.json', pathname: '/payload.json', type: 'application/json' }
])('mimeTypes includes the generated extension of $file', ({ file, pathname, type }) => {
	const dest = join(import.meta.dirname, 'output');
	const builder = create_test_builder(dest);
	builder.prerendered.paths.push(pathname);
	const output = join(dest, 'output');
	const prerendered = join(output, 'prerendered', file);
	mkdirSync(join(output, 'client'), { recursive: true });
	mkdirSync(dirname(prerendered), { recursive: true });
	writeFileSync(prerendered, '');
	writeFileSync(join(output, 'client', 'app.js'), '');
	try {
		expect(builder.mimeTypes).toEqual({ '.js': 'text/javascript', [extname(file)]: type });
	} finally {
		rmSync(dest, { recursive: true, force: true });
	}
});

test('mimeTypes works without prerendered output', () => {
	const dest = join(import.meta.dirname, 'output');
	const builder = create_test_builder(dest);
	mkdirSync(join(dest, 'output', 'client'), { recursive: true });
	writeFileSync(join(dest, 'output', 'client', 'app.js'), '');
	try {
		expect(builder.mimeTypes).toEqual({ '.js': 'text/javascript' });
	} finally {
		rmSync(dest, { recursive: true, force: true });
	}
});

test('mimeTypes preserves manifest types while scanning multiple outputs', () => {
	const dest = join(import.meta.dirname, 'output');
	const builder = create_test_builder(dest, [
		{ file: 'document.html', type: 'application/xhtml+xml' }
	]);
	const files = [
		'client/document.html',
		'client/favicon.ico',
		'prerendered/pages/index.html',
		'prerendered/dependencies/payload.unknown',
		'prerendered/dependencies/assets.css/extensionless'
	];
	try {
		for (const file of files) {
			const target = join(dest, 'output', file);
			mkdirSync(dirname(target), { recursive: true });
			writeFileSync(target, '');
		}
		expect(builder.mimeTypes).toEqual({
			'.html': 'application/xhtml+xml',
			'.ico': 'image/x-icon',
			'.unknown': ''
		});
	} finally {
		rmSync(dest, { recursive: true, force: true });
	}
});
