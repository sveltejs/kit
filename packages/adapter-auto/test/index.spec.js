import { afterEach, assert, beforeEach, test, vi } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import process from 'node:process';

/** @type {string} */
let cwd;

/** @type {boolean} */
let detected;

vi.mock('../adapters.js', () => ({
	adapters: [
		{
			name: 'Fake',
			test: () => detected,
			module: 'fake-adapter',
			version: '1'
		}
	]
}));

beforeEach(() => {
	cwd = fs.mkdtempSync(path.join(os.tmpdir(), 'adapter-auto-'));

	const pkg_dir = path.join(cwd, 'node_modules/fake-adapter');
	fs.mkdirSync(pkg_dir, { recursive: true });
	fs.writeFileSync(
		path.join(pkg_dir, 'package.json'),
		JSON.stringify({ name: 'fake-adapter', type: 'module', exports: { '.': './index.js' } })
	);
	fs.writeFileSync(
		path.join(pkg_dir, 'index.js'),
		`export default () => ({
			name: 'fake-adapter',
			adapt: () => {},
			vite: { plugins: [{ name: 'fake-adapter-plugin' }] }
		});`
	);

	vi.spyOn(process, 'cwd').mockReturnValue(cwd);
	vi.resetModules();
});

afterEach(() => {
	vi.restoreAllMocks();
	fs.rmSync(cwd, { recursive: true, force: true });
});

test('exposes the Vite config of the detected adapter', async () => {
	detected = true;

	const { default: adapter } = await import('../index.js');
	const result = adapter();

	assert.equal(result.name, 'fake-adapter');
	assert.deepEqual(result.vite, { plugins: [{ name: 'fake-adapter-plugin' }] });
});

test('falls back to a warning when no environment is detected', async () => {
	detected = false;

	const { default: adapter } = await import('../index.js');
	const result = adapter();

	assert.equal(result.name, '@sveltejs/adapter-auto');
	assert.equal(result.vite, undefined);

	const warn = vi.fn();
	await result.adapt(/** @type {any} */ ({ log: { warn } }));
	assert.equal(warn.mock.calls.length, 1);
	assert.throws(() => result.supports?.read?.({ config: {}, route: { id: '/' } }));
});
