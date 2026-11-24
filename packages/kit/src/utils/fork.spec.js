import { execFile } from 'node:child_process';
import process from 'node:process';
import { setTimeout } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { run } from './fixtures/fork/index.js';

test('waits for the callback, async finally and exit handlers, then stops background work', async () => {
	const state = new Int32Array(new SharedArrayBuffer(4 * Int32Array.BYTES_PER_ELEMENT));

	await expect(run({ action: 'return', state })).resolves.toEqual({ answer: 42 });
	expect(Array.from(state.slice(0, 3))).toEqual([1, 1, 1]);

	const ticks = Atomics.load(state, 3);
	await setTimeout(20);
	expect(Atomics.load(state, 3)).toBe(ticks);
});

test('accepts undefined as a result', async () => {
	await expect(run({ action: 'undefined' })).resolves.toBeUndefined();
});

test('propagates callback errors after the worker has exited', async () => {
	const state = new Int32Array(new SharedArrayBuffer(4 * Int32Array.BYTES_PER_ELEMENT));

	await expect(run({ action: 'throw', state })).rejects.toThrow('callback failed');
	expect(Array.from(state.slice(0, 3))).toEqual([1, 1, 1]);
});

test('rejects when the worker exits successfully without a result', async () => {
	await expect(run({ action: 'exit' })).rejects.toThrow('Worker exited without returning a result');
});

test('rejects when the worker exits unsuccessfully without a result', async () => {
	await expect(run({ action: 'exit', code: 2 })).rejects.toThrow('Failed with code 2');
});

test('rejects a nonzero exit code even after receiving a result', async () => {
	await expect(run({ action: 'exit-code', code: 2 })).rejects.toThrow('Failed with code 2');
});

test('propagates exit handler errors even after receiving a result', async () => {
	await expect(run({ action: 'exit-error' })).rejects.toThrow('exit handler failed');
});

test('preserves falsy values thrown by exit handlers', async () => {
	await expect(run({ action: 'exit-error', error: null })).rejects.toBeNull();
});

test('rejects if the event loop drains while waiting for the worker', async () => {
	// Simulate a runtime failing to keep the event loop alive until the worker's exit event.
	// Do this in a subprocess to avoid invoking Vitest's own beforeExit listeners.
	await expect(
		promisify(execFile)(process.execPath, [
			'--eval',
			`
				import(${JSON.stringify(new URL('./fixtures/fork/index.js', import.meta.url).href)}).then(({ run }) => {
					run({ action: 'return' }).catch((error) => {
						console.error(error.message);
						process.exitCode = 1;
					});
					process.emit('beforeExit', 0);
				});
			`
		])
	).rejects.toMatchObject({
		code: 1,
		stderr: expect.stringContaining(
			'The event loop is exiting before a SvelteKit build worker finished. If you are using Bun, try upgrading Bun or running the build with Node.js.'
		)
	});
});

test('delivers buffered stdout and stderr before exiting', async () => {
	const { stdout, stderr } = await promisify(execFile)(process.execPath, [
		fileURLToPath(new URL('./fixtures/fork/stdio.js', import.meta.url))
	]);

	expect(stdout).toBe('out\n'.repeat(128 * 1024));
	expect(stderr).toBe('err\n'.repeat(128 * 1024));
});

/** @type {Function[]} */
let before_exit_listeners;

beforeEach(() => {
	before_exit_listeners = process.listeners('beforeExit');
});

afterEach(() => {
	vi.unstubAllEnvs();
	expect(process.listeners('beforeExit')).toEqual(before_exit_listeners);
});

test.each([
	{ FORCE_COLOR: undefined, NO_COLOR: undefined, expected: '1' },
	{ FORCE_COLOR: '0', NO_COLOR: undefined, expected: '0' },
	{ FORCE_COLOR: undefined, NO_COLOR: '1', expected: undefined },
	{ FORCE_COLOR: undefined, NO_COLOR: '', expected: '1' },
	{ FORCE_COLOR: '3', NO_COLOR: '1', expected: '3' }
])(
	'uses parent color settings (FORCE_COLOR=$FORCE_COLOR, NO_COLOR=$NO_COLOR)',
	async ({ FORCE_COLOR, NO_COLOR, expected }) => {
		vi.stubEnv('FORCE_COLOR', FORCE_COLOR);
		vi.stubEnv('NO_COLOR', NO_COLOR);

		await expect(run({ action: 'colors' })).resolves.toEqual({
			FORCE_COLOR: expected,
			NO_COLOR
		});
	}
);
