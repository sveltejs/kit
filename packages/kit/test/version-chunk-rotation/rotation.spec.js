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
	const result = compare(control_a.chunks, control_b.chunks);

	assert.equal(
		result.rotated.length,
		0,
		`build is nondeterministic at a fixed version — ${result.rotated.length} chunk(s) rotated:\n${format_report(result)}`
	);
	assert.equal(
		result.mutable.length,
		0,
		`mutable chunks at a fixed version:\n${format_report(result)}`
	);
});

test('bumping kit.version.name rotates no client chunks', () => {
	const result = compare(control_a.chunks, bumped.chunks);

	assert.equal(
		result.mutable.length,
		0,
		`chunks changed bytes under a stable filename (breaks immutable caching):\n${format_report(result)}`
	);
	assert.equal(
		result.rotated.length,
		0,
		`a version bump rotated ${result.rotated.length} client chunk(s) with no app-code change (#12260):\n${format_report(result)}`
	);
});

test('the server-rendered payload carries the version of its own build', () => {
	for (const { version, prerendered_page } of [control_a, bumped]) {
		assert.include(
			prerendered_page,
			`version: "${version}"`,
			`the payload of the "${version}" build should carry that version`
		);
	}
});
