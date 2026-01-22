import { assert, test } from 'vitest';
import { adapters } from '../adapters.js';
import { existsSync, readFileSync } from 'node:fs';

test('adapter versions are up to date', () => {
	for (const adapter of adapters) {
		const dir = adapter.module.replace('@sveltejs/', '');
		const package_json = `../${dir}/package.json`;
		if (!existsSync(package_json)) {
			continue;
		}
		const adapter_version = JSON.parse(readFileSync(package_json, 'utf-8')).version;
		const [major] = adapter_version.split('.');
		assert.equal(adapter.version, major, `${adapter.name} adapter is outdated`);
	}
});
