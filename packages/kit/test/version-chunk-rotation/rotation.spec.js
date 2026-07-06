// Reproduction gate for sveltejs/kit#12260: `kit.version.name` leaks into
// content-hashed client chunks, so a version bump rotates their hashed filenames — and
// every chunk that imports them — even when the app code is byte-identical. That
// defeats the immutable caching of `_app/immutable/**`.
//
// This suite builds the fixture app under ./app three times and diffs the emitted
// client chunks: twice at the SAME version (CONTROL — proves the build is otherwise
// deterministic) and once at a DIFFERENT version (VARIABLE — a version bump must
// rotate 0 chunks and mutate 0 chunks).
//
// EXPECTED STATE: the VARIABLE test is RED on kit without the version-decoupling fix —
// it reproduces the bug. It turns GREEN, with no edits here, once the fix keeps the
// version off the client import graph. The CONTROL test and classify.spec.js are GREEN
// today. (If red CI is noisy before the fix lands, `test.skip` the VARIABLE test with a
// TODO referencing the follow-up — but the default is an honest, un-skipped gate.)

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

/**
 * Build the fixture with the given `kit.version.name` and snapshot its client
 * bundle. Output is cleaned first so the snapshot reflects only this build.
 * @param {string} version
 */
function build(version) {
	fs.rmSync(path.join(app_dir, '.svelte-kit/output'), { recursive: true, force: true });
	execSync('pnpm build', {
		cwd: app_dir,
		stdio: 'pipe',
		timeout,
		env: { ...process.env, SK_VERSION: version }
	});
	return snapshot(immutable_dir, version);
}

/** @type {ReturnType<typeof snapshot>} */
let control_a;
/** @type {ReturnType<typeof snapshot>} */
let control_b;
/** @type {ReturnType<typeof snapshot>} */
let bumped;

beforeAll(() => {
	control_a = build('version-alpha');
	control_b = build('version-alpha');
	bumped = build('version-bravo');
}, timeout);

test('the same version builds an identical client bundle', () => {
	const r = compare(control_a, control_b);
	assert.equal(
		r.rotated.length,
		0,
		`build is nondeterministic at a fixed version — ${r.rotated.length} chunk(s) rotated:\n${format_report(r)}`
	);
	assert.equal(r.mutable.length, 0, `mutable chunks at a fixed version:\n${format_report(r)}`);
});

test('bumping kit.version.name rotates no client chunks', () => {
	const r = compare(control_a, bumped);
	assert.equal(
		r.mutable.length,
		0,
		`chunks changed bytes under a stable filename (breaks immutable caching):\n${format_report(r)}`
	);
	assert.equal(
		r.rotated.length,
		0,
		`a version bump rotated ${r.rotated.length} client chunk(s) with no app-code change (#12260):\n${format_report(r)}`
	);
});
