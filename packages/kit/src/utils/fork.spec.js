import { fileURLToPath, pathToFileURL } from 'node:url';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { assert, test } from 'vitest';

/**
 * Write a `forked()` subprocess module to a throwaway file and return the
 * `pathToFileURL` plus a cleanup function. The module must call `forked()`
 * eagerly at the top level so `process.env.SVELTEKIT_FORK` reaches the
 * parentPort handler.
 *
 * @param {string} body  the JS body of the worker module
 * @returns {{ module: string, cleanup: () => void }}
 */
function tempWorker(body) {
	const dir = mkdtempSync(join(tmpdir(), 'fork-spec-'));
	const file = join(dir, 'worker.js');
	writeFileSync(file, body);
	return {
		module: pathToFileURL(file).href,
		cleanup: () => rmSync(dir, { recursive: true, force: true })
	};
}

test('forked() rejects with the worker-side error rather than swallowing it', async () => {
	// Before #16033's fix the worker's uncaught ReferenceError was lost and
	// the parent only saw `Error: Failed with code 1` — with no clue what
	// the underlying module-load failure actually was. The error event
	// forwarder makes the actual stack reach the caller.
	const forkPath = fileURLToPath(new URL('./fork.js', import.meta.url));
	const { module, cleanup } = tempWorker(
		`import { forked } from ${JSON.stringify(forkPath)};` +
			`export default forked(import.meta.url, async () => {` +
			`  throw new ReferenceError('indexedDB is not defined');` +
			`});`
	);

	try {
		const run = (await import(module)).default;
		const err = /** @type {Error} */ (await run({}).catch((/** @type {unknown} */ e) => e));
		assert.instanceOf(err, Error);
		// Either the original ReferenceError surfaces (post-fix, expected),
		// or the legacy `Failed with code 1` surrogate is what the caller
		// gets (pre-fix). Reject the surrogate so regressions are loud.
		assert.notMatch(
			err.message,
			/^Failed with code 1$/,
			'caller should receive the worker-side error, not the exit-code surrogate'
		);
		assert.match(err.message, /indexedDB is not defined/);
	} finally {
		cleanup();
	}
}, 20_000);

test('forked() still rejects on a non-zero exit when the worker exits without throwing', async () => {
	// Regression guard: forwarding the error event must not break the
	// existing exit-code path (e.g. an explicit `process.exit(1)` with no
	// thrown error still has to reject the returned promise).
	const forkPath = fileURLToPath(new URL('./fork.js', import.meta.url));
	const { module, cleanup } = tempWorker(
		`import { forked } from ${JSON.stringify(forkPath)};` +
			`export default forked(import.meta.url, async () => {` +
			`  process.exit(1);` +
			`});`
	);

	try {
		const run = (await import(module)).default;
		const err = /** @type {Error} */ (await run({}).catch((/** @type {unknown} */ e) => e));
		assert.instanceOf(err, Error);
		assert.match(err.message, /Failed with code 1/);
	} finally {
		cleanup();
	}
}, 20_000);
