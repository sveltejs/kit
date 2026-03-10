import { copyFileSync, existsSync, mkdirSync, readFileSync, rmSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { assert, expect, test } from 'vitest';
import { create_builder } from './builder.js';
import { posixify } from '../../utils/filesystem.js';
import { list_files } from '../utils.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = join(__filename, '..');

test('copy files', () => {
	const cwd = join(__dirname, 'fixtures/basic');
	const outDir = join(cwd, '.svelte-kit');

	/** @type {import('@sveltejs/kit').Config} */
	const mocked = {
		extensions: ['.svelte'],
		kit: {
			appDir: '_app',
			files: {
				assets: join(__dirname, 'fixtures/basic/static')
			},
			outDir
		}
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

	const dest = join(__dirname, 'output');

	rmSync(dest, { recursive: true, force: true });

	expect(builder.writeClient(dest)).toEqual(list_files(dest).map(posixify));
	expect(
		list_files(`${outDir}/output/client`).filter((file) => !file.startsWith('.vite/'))
	).toEqual(list_files(dest));

	rmSync(dest, { recursive: true, force: true });

	expect(builder.writeServer(dest)).toEqual(list_files(dest).map(posixify));
	expect(list_files(`${outDir}/output/server`)).toEqual(list_files(dest));

	rmSync(dest, { force: true, recursive: true });
});

test('compress files', async () => {
	// @ts-expect-error - we don't need the whole config for this test
	const builder = create_builder({
		route_data: []
	});

	const target = fileURLToPath(new URL('./fixtures/compress/foo.css', import.meta.url));
	rmSync(target + '.br', { force: true });
	rmSync(target + '.gz', { force: true });
	await builder.compress(dirname(target));
	assert.ok(existsSync(target + '.br'));
	assert.ok(existsSync(target + '.gz'));
});

test('instrument generates facade with posix paths', () => {
	const fixtureDir = join(__dirname, 'fixtures/instrument');
	const dest = join(__dirname, 'output');

	rmSync(dest, { recursive: true, force: true });
	mkdirSync(join(dest, 'server'), { recursive: true });
	copyFileSync(join(fixtureDir, 'index.js'), join(dest, 'index.js'));
	copyFileSync(
		join(fixtureDir, 'server/instrumentation.server.js'),
		join(dest, 'server/instrumentation.server.js')
	);

	const entrypoint = join(dest, 'index.js');
	const instrumentation = join(dest, 'server', 'instrumentation.server.js');

	// @ts-expect-error - we don't need the whole config for this test
	const builder = create_builder({ route_data: [] });

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
	expect(facade).toContain("import './server/instrumentation.server.js'");
	expect(facade).not.toContain('\\');

	// Cleanup
	rmSync(dest, { recursive: true, force: true });
});
