import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { assert, beforeAll, describe, test } from 'vitest';
import { deploy } from '../../../../../test-utils/deploy.vitest.js';

const app = deploy(import.meta.dirname, {
	VERCEL_SKEW_PROTECTION_ENABLED: '',
	VERCEL_DEPLOYMENT_ID: ''
});
const output = path.join(app, '.vercel/output');

/**
 * @typedef {{
 *   deploymentId?: string;
 *   overrides: Record<string, { path: string }>;
 *   routes: Array<{
 *     src?: string;
 *     has?: Array<{ type: string; key: string; value: string }>;
 *     transforms?: Array<{ type: string; op: string; target: { key: string }; args?: string[] }>;
 *     continue?: boolean;
 *   }>;
 * }} VercelConfig
 */

/** @type {VercelConfig} */
let config;
beforeAll(() => (config = JSON.parse(fs.readFileSync(`${output}/config.json`, 'utf8'))));

/** @param {VercelConfig} vercel_config */
function find_skew_route(vercel_config) {
	return vercel_config.routes.find((route) =>
		route.transforms?.some(
			(t) =>
				t.type === 'response.headers' &&
				t.target.key === 'Set-Cookie' &&
				t.args?.some((arg) => arg.startsWith('__vdpl='))
		)
	);
}

/**
 * @param {Record<string, string>} env
 * @param {string} [version_name]
 */
function run_build(env, version_name) {
	const config_path = path.join(app, 'vite.config.ts');
	const original = fs.readFileSync(config_path, 'utf8');

	try {
		if (version_name !== undefined) {
			fs.writeFileSync(
				config_path,
				original.replace(
					"paths: { base: '/base' },",
					`paths: { base: '/base' },\n\t\t\tversion: { name: ${JSON.stringify(version_name)} },`
				)
			);
		}

		return spawnSync(process.execPath, ['node_modules/vite/bin/vite.js', 'build'], {
			cwd: app,
			encoding: 'utf8',
			env: {
				...process.env,
				VERCEL_SKEW_PROTECTION_ENABLED: '',
				VERCEL_DEPLOYMENT_ID: '',
				...env
			}
		});
	} finally {
		fs.writeFileSync(config_path, original);
	}
}

test('prerendered pages are written below the base path', () => {
	assert.deepEqual(config.overrides, {
		'base/index.html': { path: 'base' },
		'base/prerendered/a.html': { path: 'base/prerendered/a' }
	});
});

test('overrides refer to files that exist', () => {
	for (const file of Object.keys(config.overrides)) {
		assert.ok(fs.existsSync(`${output}/static/${file}`), `${file} does not exist`);
	}
});

test('omits deploymentId and skew protection route when skew protection is disabled', () => {
	assert.equal('deploymentId' in config, false);
	assert.equal(find_skew_route(config), undefined);
});

describe('skew protection', () => {
	test('emits deploymentId and skew cookies from default SvelteKit version for prebuilt builds', () => {
		const result = run_build({ VERCEL_SKEW_PROTECTION_ENABLED: '1' });
		assert.equal(result.status, 0, result.stdout + result.stderr);

		/** @type {VercelConfig} */
		const built_config = JSON.parse(fs.readFileSync(`${output}/config.json`, 'utf8'));
		const { version } = JSON.parse(
			fs.readFileSync(`${output}/static/base/_app/version.json`, 'utf8')
		);

		assert.equal(built_config.deploymentId, version);
		assert.deepEqual(find_skew_route(built_config)?.transforms?.[0].args, [
			`__vdpl=${version}; Path=/base/; SameSite=Strict; Secure; HttpOnly`,
			'__vdpl=; Path=/base/_app/version.json; SameSite=Strict; Secure; HttpOnly'
		]);
	});

	test('emits deploymentId and skew cookies from explicit SvelteKit version.name', () => {
		const result = run_build({ VERCEL_SKEW_PROTECTION_ENABLED: '1' }, 'release-1_0');
		assert.equal(result.status, 0, result.stdout + result.stderr);

		/** @type {VercelConfig} */
		const built_config = JSON.parse(fs.readFileSync(`${output}/config.json`, 'utf8'));

		assert.equal(built_config.deploymentId, 'release-1_0');
		assert.deepEqual(find_skew_route(built_config)?.transforms?.[0].args, [
			'__vdpl=release-1_0; Path=/base/; SameSite=Strict; Secure; HttpOnly',
			'__vdpl=; Path=/base/_app/version.json; SameSite=Strict; Secure; HttpOnly'
		]);
	});

	test('uses VERCEL_DEPLOYMENT_ID and omits config deploymentId on Vercel-hosted builds', () => {
		const result = run_build(
			{
				VERCEL_SKEW_PROTECTION_ENABLED: '1',
				VERCEL_DEPLOYMENT_ID: 'dpl_vercel123'
			},
			'a'.repeat(40)
		);
		assert.equal(result.status, 0, result.stdout + result.stderr);

		/** @type {VercelConfig} */
		const built_config = JSON.parse(fs.readFileSync(`${output}/config.json`, 'utf8'));

		assert.equal('deploymentId' in built_config, false);
		assert.deepEqual(find_skew_route(built_config)?.transforms?.[0].args, [
			'__vdpl=dpl_vercel123; Path=/base/; SameSite=Strict; Secure; HttpOnly',
			'__vdpl=; Path=/base/_app/version.json; SameSite=Strict; Secure; HttpOnly'
		]);
	});

	test('fails the build when prebuilt version.name violates Vercel deploymentId rules', () => {
		const result = run_build({ VERCEL_SKEW_PROTECTION_ENABLED: '1' }, 'dpl_invalid');
		assert.notEqual(result.status, 0);
		assert.include(result.stdout + result.stderr, 'must not start with "dpl_"');
	});

	test('treats VERCEL_SKEW_PROTECTION_ENABLED=0 as disabled', () => {
		const result = run_build({ VERCEL_SKEW_PROTECTION_ENABLED: '0' }, 'a'.repeat(40));
		assert.equal(result.status, 0, result.stdout + result.stderr);

		/** @type {VercelConfig} */
		const built_config = JSON.parse(fs.readFileSync(`${output}/config.json`, 'utf8'));

		assert.equal('deploymentId' in built_config, false);
		assert.equal(find_skew_route(built_config), undefined);
	});
});
