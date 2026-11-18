import fs from 'node:fs';
import path from 'node:path';
import { assert, expect, onTestFinished, test, vi } from 'vitest';
import * as vite from 'vite';
import { validate_config } from '../../../core/config/index.js';
import { hash } from '../../../utils/hash.js';
import { plugin_remote } from './remote.js';

// Inspect the collection, not the manifest object: duplicate hashes in the
// collection already produce the correct manifest, but retain every transform.
test('remote metadata stays unique across dev transforms', async () => {
	const root = fs.mkdtempSync(path.resolve('test/remote-metadata-'));
	onTestFinished(() => fs.rmSync(root, { recursive: true, force: true }));

	const set_metadata = vi.fn();
	const server = await vite.createServer({
		configFile: false,
		root,
		logLevel: 'silent',
		plugins: [
			plugin_remote(
				validate_config({ experimental: { remoteFunctions: true } }),
				() => ({ root, vite }),
				() => null,
				set_metadata
			)
		],
		server: { port: 0 },
		optimizeDeps: { noDiscovery: true, include: [] }
	});
	onTestFinished(() => server.close());
	await server.listen();

	const environment = server.environments.ssr;
	const files = ['first.remote.js', 'second.remote.js'];
	for (const file of files) {
		fs.writeFileSync(path.join(root, file), 'export const value = 0;');
	}
	await environment.transformRequest(`/${files[0]}`);

	const metadata_call = set_metadata.mock.lastCall;
	assert(metadata_call);
	const { remotes } = metadata_call[0];
	const expected = files.map((file) => ({ hash: hash(file), file }));
	expect([...remotes.values()]).toEqual(expected.slice(0, 1));

	// The reference passed to the manifest stays live as modules are discovered.
	await environment.transformRequest(`/${files[1]}`);
	expect([...remotes.values()]).toEqual(expected);

	for (let i = 1; i <= 3; i++) {
		fs.writeFileSync(path.join(root, files[0]), `export const value = ${i};`);
		environment.moduleGraph.invalidateAll();
		const result = await environment.transformRequest(`/${files[0]}`);
		expect(result?.code).toContain(`const value = ${i};`);
		expect([...remotes.values()]).toEqual(expected);
	}
});
