import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { assert, test } from 'vitest';
import { payload_hash } from '../../src/core/utils.js';
import { hash } from '../../src/utils/hash.js';

/** @param {{ name?: string, package_json?: boolean }} [options] */
function project({ name, package_json = true } = {}) {
	const root = mkdtempSync(join(tmpdir(), 'kit-payload-hash-'));
	if (package_json) writeFileSync(join(root, 'package.json'), JSON.stringify({ name }));
	return root;
}

/**
 * @param {object} options
 * @param {string} options.root
 * @param {string} [options.base]
 * @param {string} [options.app_dir]
 * @param {string} [options.version]
 * @param {boolean} [options.embedded]
 * @returns {import('types').ValidatedKitConfig}
 */
function kit_config({ root, base = '', app_dir = '_app', version = 'v1', embedded = false }) {
	return /** @type {import('types').ValidatedKitConfig} */ (
		/** @type {unknown} */ ({
			outDir: join(root, '.svelte-kit'),
			appDir: app_dir,
			paths: { base },
			version: { name: version },
			embedded
		})
	);
}

test('is independent of version.name', () => {
	const root = project({ name: 'my-app' });

	assert.equal(
		payload_hash(kit_config({ root, version: 'v-alpha' })),
		payload_hash(kit_config({ root, version: 'v-bravo' }))
	);
});

test('differs between projects with different package names', () => {
	assert.notEqual(
		payload_hash(kit_config({ root: project({ name: 'app-one' }) })),
		payload_hash(kit_config({ root: project({ name: 'app-two' }) }))
	);
});

test('differs when paths.base differs', () => {
	const root = project({ name: 'my-app' });

	assert.notEqual(
		payload_hash(kit_config({ root, base: '' })),
		payload_hash(kit_config({ root, base: '/docs' }))
	);
});

test('differs when appDir differs', () => {
	const root = project({ name: 'my-app' });

	assert.notEqual(
		payload_hash(kit_config({ root, app_dir: '_app' })),
		payload_hash(kit_config({ root, app_dir: '_custom' }))
	);
});

test('embedded apps keep the version-derived key for cross-deploy isolation', () => {
	const root = project({ name: 'my-app' });

	assert.equal(
		payload_hash(kit_config({ root, embedded: true, version: 'v-alpha' })),
		hash('v-alpha')
	);
});

test('projects without a package.json still get distinct keys', () => {
	assert.notEqual(
		payload_hash(kit_config({ root: project({ package_json: false }) })),
		payload_hash(kit_config({ root: project({ package_json: false }) }))
	);
});

test('projects with a nameless package.json still get distinct keys', () => {
	assert.notEqual(
		payload_hash(kit_config({ root: project() })),
		payload_hash(kit_config({ root: project() }))
	);
});
