import { execFile } from 'node:child_process';
import process from 'node:process';
import { setTimeout } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import { expect, test } from 'vitest';
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

test('delivers buffered stdout and stderr before exiting', async () => {
	const { stdout, stderr } = await promisify(execFile)(process.execPath, [
		fileURLToPath(new URL('./fixtures/fork/stdio.js', import.meta.url))
	]);

	expect(stdout).toBe('out\n'.repeat(128 * 1024));
	expect(stderr).toBe('err\n'.repeat(128 * 1024));
});
