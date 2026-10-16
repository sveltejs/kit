import { assert, expect, test, vi } from 'vitest';
import { adapters } from '../adapters.js';
import { existsSync, readFileSync } from 'node:fs';

test('detects Cloudflare Workers builds but not Pages builds', () => {
	const cloudflare = adapters.find((adapter) => adapter.module === '@sveltejs/adapter-cloudflare');
	assert.ok(cloudflare);

	try {
		vi.stubEnv('WORKERS_CI', '');
		vi.stubEnv('CF_PAGES', '1');
		expect(cloudflare.test()).toBe(false);

		vi.stubEnv('CF_PAGES', '');
		vi.stubEnv('WORKERS_CI', '1');
		expect(cloudflare.test()).toBe(true);
	} finally {
		vi.unstubAllEnvs();
	}
});

test('adapter versions are up to date', () => {
	for (const adapter of adapters) {
		const dir = adapter.module.replace('@sveltejs/', '');
		const package_json = `../${dir}/package.json`;
		if (!existsSync(package_json)) {
			continue;
		}
		const adapter_version = JSON.parse(readFileSync(package_json, 'utf-8')).version;
		const [major] = adapter_version.split('.');

		// TODO get rid of `next` support once we exit pre-release mode
		if (adapter.version === 'next') {
			console.warn(`Update ${adapter.name} config to use a stable version`);
		} else {
			assert.equal(adapter.version, major, `${adapter.name} adapter is outdated`);
		}
	}
});
