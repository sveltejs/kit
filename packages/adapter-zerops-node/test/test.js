import { expect } from 'vitest';
import { fileURLToPath } from 'node:url';
import { readFileSync, existsSync, mkdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { Builder } from '@sveltejs/kit/src/core/build/builder.js';
import { test } from 'vitest';
import adapter from '../index.js';

const __dirname = fileURLToPath(new URL('.', import.meta.url));

/**
 * @param {string} path
 */
function read(path) {
	return readFileSync(path, 'utf-8');
}

test('generates zerops.yml and builds app', async () => {
	const cwd = join(__dirname, 'fixtures');

	const builder = new Builder({
		cwd,
		config: {
			kit: {
				appDir: '_app',
				files: {
					assets: 'static',
					routes: 'src/routes'
				},
				paths: {
					base: ''
				}
			}
		},
		// @ts-expect-error - partial mock
		routes: [],
		log: {
			warn: () => {},
			info: () => {},
			minor: () => {}
		}
	});

	await adapter().adapt(builder);

	// Check if zerops.yml generated
	const zeropsConfig = read(join(cwd, 'zerops.yml'));
	expect(zeropsConfig).toMatch(/zerops:/);
	expect(zeropsConfig).toMatch(/setup: app/);
	expect(zeropsConfig).toMatch(/base: nodejs@20/);
	expect(zeropsConfig).toMatch(/port: 3000/);

	// Check build directory exists
	expect(existsSync(join(cwd, 'build'))).toBe(true);
});

test('respects out option', async () => {
	const cwd = join(__dirname, 'fixtures');
	const customOut = 'custom-build';

	const builder = new Builder({
		cwd,
		config: {
			kit: {
				appDir: '_app',
				files: {
					assets: 'static',
					routes: 'src/routes'
				},
				paths: {
					base: ''
				}
			}
		},
		// @ts-expect-error - partial mock
		routes: [],
		log: {
			warn: () => {},
			info: () => {},
			minor: () => {}
		}
	});

	await adapter({ out: customOut }).adapt(builder);

	// Check custom build directory exists
	expect(existsSync(join(cwd, customOut))).toBe(true);
});

test('respects port option', async () => {
	const cwd = join(__dirname, 'fixtures');
	const customPort = 4000;

	const builder = new Builder({
		cwd,
		config: {
			kit: {
				appDir: '_app',
				files: {
					assets: 'static',
					routes: 'src/routes'
				},
				paths: {
					base: ''
				}
			}
		},
		// @ts-expect-error - partial mock
		routes: [],
		log: {
			warn: () => {},
			info: () => {},
			minor: () => {}
		}
	});

	await adapter({ port: Port }).adapt(builder);

	// Check if zerops.yml has port
	const zeropsConfig = read(join(cwd, 'zerops.yml'));
	expect(zeropsConfig).toMatch(new RegExp(`port: ${Port}`));
});

test('create generates required files', async () => {
	const cwd = join(__dirname, 'fixtures', 'create-test');
	
	// Clean up test directory
	if (existsSync(cwd)) {
		rmSync(cwd, { recursive: true, force: true });
	}
	mkdirSync(cwd, { recursive: true });

	const { create } = await import('../create.js');
	create(cwd);

}); 