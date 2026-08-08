import { afterEach, describe, expect, test, vi } from 'vitest';
import { boolean_env, bytes_env, number_env } from './env.js';

vi.mock('MANIFEST', () => ({ env_prefix: '' }));

describe('boolean_env', () => {
	afterEach(() => vi.unstubAllEnvs());

	test.each(['1', 'true', 'YES', 'on'])('parses %s as true', (value) => {
		vi.stubEnv('OPTION', value);
		expect(boolean_env('OPTION')).toBe(true);
	});

	test.each(['0', 'false', 'NO', 'off'])('parses %s as false', (value) => {
		vi.stubEnv('OPTION', value);
		expect(boolean_env('OPTION')).toBe(false);
	});

	test('uses the fallback when the variable is not set', () => {
		expect(boolean_env('OPTION', true)).toBe(true);
	});

	test('rejects other values', () => {
		vi.stubEnv('OPTION', 'maybe');
		expect(() => boolean_env('OPTION')).toThrow('expected a boolean');
	});
});

describe('number_env', () => {
	afterEach(() => vi.unstubAllEnvs());

	test('parses non-negative integers', () => {
		vi.stubEnv('OPTION', '0');
		expect(number_env('OPTION')).toBe(0);
	});

	test('enforces limits', () => {
		vi.stubEnv('OPTION', '256');
		expect(() => number_env('OPTION', undefined, { max: 255 })).toThrow(
			'expected an integer between 0 and 255'
		);
	});

	test('rejects non-integers', () => {
		vi.stubEnv('OPTION', '1.5');
		expect(() => number_env('OPTION')).toThrow('expected a non-negative integer');
	});
});

describe('bytes_env', () => {
	afterEach(() => vi.unstubAllEnvs());

	test.each([
		['0', 0],
		['512', 512],
		['512K', 512 * 1024],
		['1.5M', 1.5 * 1024 * 1024],
		['2g', 2 * 1024 * 1024 * 1024]
	])('parses %s as a byte count', (value, expected) => {
		vi.stubEnv('OPTION', value);
		expect(bytes_env('OPTION')).toBe(expected);
	});

	test('uses the fallback when the variable is not set', () => {
		expect(bytes_env('OPTION', 512 * 1024)).toBe(512 * 1024);
	});

	test.each(['', '-1', '1KB', 'one', '0.1'])('rejects invalid byte counts', (value) => {
		vi.stubEnv('OPTION', value);
		expect(() => bytes_env('OPTION')).toThrow('Invalid value for environment variable OPTION');
	});
});
