import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import { assert, beforeAll, test } from 'vitest';
import { compare, format_report, snapshot } from './classify.js';

const timeout = 180_000;

const app_dir = fileURLToPath(new URL('./app', import.meta.url));
const immutable_dir = path.join(app_dir, '.svelte-kit/output/client/_app/immutable');

/** @param {string} version */
function build(version) {
	fs.rmSync(path.join(app_dir, '.svelte-kit/output'), { recursive: true, force: true });
	execSync('pnpm build', {
		cwd: app_dir,
		stdio: 'pipe',
		timeout,
		env: { ...process.env, SK_VERSION: version }
	});

	return {
		version,
		chunks: snapshot(immutable_dir, version),
		prerendered_page: fs.readFileSync(
			path.join(app_dir, '.svelte-kit/output/prerendered/pages/prerendered.html'),
			'utf-8'
		)
	};
}

/**
 * @param {ReturnType<typeof compare>} result
 * @param {string} when
 */
function assert_bundle_unchanged(result, when) {
	assert.equal(result.mutable.length, 0, `chunks mutated ${when}:\n${format_report(result)}`);
	assert.equal(result.rotated.length, 0, `chunks rotated ${when}:\n${format_report(result)}`);
}

/** @type {ReturnType<typeof build>} */
let control_a;
/** @type {ReturnType<typeof build>} */
let control_b;
/** @type {ReturnType<typeof build>} */
let bumped;

beforeAll(() => {
	control_a = build('version-alpha');
	control_b = build('version-alpha');
	bumped = build('version-bravo');
}, timeout);

test('the same version builds an identical client bundle', () => {
	assert_bundle_unchanged(compare(control_a.chunks, control_b.chunks), 'at a fixed version');
});

test('bumping kit.version.name rotates no client chunks', () => {
	assert_bundle_unchanged(
		compare(control_a.chunks, bumped.chunks),
		'after a version bump with no app-code change'
	);
});

test('the server-rendered payload carries the version of its own build', () => {
	for (const { version, prerendered_page } of [control_a, bumped]) {
		assert.include(prerendered_page, `version: "${version}"`);
	}
});
