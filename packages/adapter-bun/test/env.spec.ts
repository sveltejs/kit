import process from 'node:process';
import { afterEach, describe, expect, test, vi } from 'vitest';

const changed = new Set<string>();

afterEach(() => {
	for (const name of changed) delete process.env[name];
	changed.clear();
	vi.resetModules();
	vi.doUnmock('MANIFEST');
});

describe('env', () => {
	test('uses the prefixed value when present and otherwise returns the fallback', async () => {
		set_env('APP_PORT', '4000');
		const { env } = await load_env('APP_');

		expect(env('PORT', '3000')).toBe('4000');
		expect(env('HOST', 'localhost')).toBe('localhost');
	});

	test('treats an explicitly empty value as present', async () => {
		set_env('APP_HOST', '');
		const { env } = await load_env('APP_');

		expect(env('HOST', 'localhost')).toBe('');
	});

	test('rejects unexpected variables that use a configured prefix', async () => {
		set_env('UNIQUE_ADAPTER_OPTION', 'value');

		await expect(load_env('UNIQUE_ADAPTER_')).rejects.toThrow(
			'unexpectedly saw UNIQUE_ADAPTER_OPTION'
		);
	});
});

describe('boolean_env', () => {
	test('parses the accepted truthy and falsy spellings', async () => {
		const { boolean_env } = await load_env();

		for (const value of ['1', 'true', 'TRUE', 'yes', 'YES', 'on', 'ON']) {
			set_env('OPTION', value);
			expect(boolean_env('OPTION'), value).toBe(true);
		}
		for (const value of ['0', 'false', 'FALSE', 'no', 'NO', 'off', 'OFF']) {
			set_env('OPTION', value);
			expect(boolean_env('OPTION'), value).toBe(false);
		}
	});

	test('returns the fallback for an absent variable', async () => {
		const { boolean_env } = await load_env();
		expect(boolean_env('OPTION', true)).toBe(true);
	});

	test('rejects any other value', async () => {
		set_env('OPTION', 'enabled');
		const { boolean_env } = await load_env();
		expect(() => boolean_env('OPTION')).toThrow(
			'Invalid value for environment variable OPTION: "enabled" (expected a boolean)'
		);
	});
});

describe('number_env', () => {
	test.each([
		['0', 0],
		['42', 42],
		['9007199254740991', Number.MAX_SAFE_INTEGER]
	])('parses %s as %d', async (value, expected) => {
		set_env('OPTION', value);
		const { number_env } = await load_env();
		expect(number_env('OPTION')).toBe(expected);
	});

	test('returns the fallback for an absent variable', async () => {
		const { number_env } = await load_env();
		expect(number_env('OPTION', 10)).toBe(10);
	});

	test.each(['-1', '+1', '1.5', '1e2', ' 1', ''])(
		'rejects non-integer syntax %j',
		async (value) => {
			set_env('OPTION', value);
			const { number_env } = await load_env();
			expect(() => number_env('OPTION')).toThrow('expected a non-negative integer');
		}
	);

	test('enforces a minimum', async () => {
		set_env('OPTION', '0');
		const { number_env } = await load_env();
		expect(() => number_env('OPTION', undefined, { min: 1 })).toThrow(
			'expected an integer at least 1'
		);
	});

	test('enforces a bounded range', async () => {
		set_env('OPTION', '256');
		const { number_env } = await load_env();
		expect(() => number_env('OPTION', undefined, { max: 255 })).toThrow(
			'expected an integer between 0 and 255'
		);
	});

	test('rejects integers beyond the safe range', async () => {
		set_env('OPTION', '9007199254740992');
		const { number_env } = await load_env();
		expect(() => number_env('OPTION')).toThrow('expected an integer at least 0');
	});
});

describe('bytes_env', () => {
	test.each([
		['0', 0],
		['512', 512],
		['.5K', 512],
		['512K', 512 * 1024],
		['1.5M', 1.5 * 1024 * 1024],
		['2g', 2 * 1024 * 1024 * 1024],
		['Infinity', Infinity]
	])('parses %s as %d bytes', async (value, expected) => {
		set_env('OPTION', value);
		const { bytes_env } = await load_env();
		expect(bytes_env('OPTION')).toBe(expected);
	});

	test('returns the fallback for an absent variable', async () => {
		const { bytes_env } = await load_env();
		expect(bytes_env('OPTION', 512 * 1024)).toBe(512 * 1024);
	});

	test.each(['', '-1', '1KB', '1T', 'one'])('rejects invalid syntax %j', async (value) => {
		set_env('OPTION', value);
		const { bytes_env } = await load_env();
		expect(() => bytes_env('OPTION')).toThrow('expected a non-negative number');
	});

	test.each(['0.1', '9007199254740992'])(
		'rejects a non-whole or unsafe byte count %s',
		async (value) => {
			set_env('OPTION', value);
			const { bytes_env } = await load_env();
			expect(() => bytes_env('OPTION')).toThrow('expected a non-negative number of whole bytes');
		}
	);
});

async function load_env(prefix = '') {
	vi.resetModules();
	vi.doMock('MANIFEST', () => ({ env_prefix: prefix }));
	return import('../src/env.js');
}

function set_env(name: string, value: string) {
	changed.add(name);
	process.env[name] = value;
}
