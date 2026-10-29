import { afterEach, assert, beforeEach, test, vi } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import process from 'node:process';

/** @type {string} */
let cwd;

vi.mock('../adapters.js', () => ({
	adapters: [
		{
			name: 'Fake',
			test: () => true,
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
});

afterEach(() => {
	vi.restoreAllMocks();
	fs.rmSync(cwd, { recursive: true, force: true });
});

test('exposes the Vite config of the detected adapter', async () => {
	const { default: adapter } = await import('../index.js');
	const result = adapter();

	assert.equal(result.name, 'fake-adapter');
	assert.deepEqual(result.vite, { plugins: [{ name: 'fake-adapter-plugin' }] });
});
