import { getReleasePlan } from '@changesets/get-release-plan';
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { assert, test } from 'vitest';
import { adapters } from '../adapters.js';

test('adapter versions are up to date', async () => {
	// check if we have a major release planned
	const { releases } = await getReleasePlan(fileURLToPath(new URL('../../../', import.meta.url)));
	const planned_versions = new Map(releases.map((release) => [release.name, release.newVersion]));

	for (const adapter of adapters) {
		const dir = adapter.module.replace('@sveltejs/', '');
		const package_json = new URL(`../../${dir}/package.json`, import.meta.url);
		if (!existsSync(package_json)) {
			continue;
		}

		/** @type {{ version: string }} */
		const { version } = JSON.parse(readFileSync(package_json, 'utf-8'));
		const adapter_version = planned_versions.get(adapter.module) ?? version;
		const [major] = adapter_version.split('.');

		assert.equal(adapter.version, major, `${adapter.name} adapter is outdated`);
	}
});
