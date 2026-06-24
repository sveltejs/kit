import { afterEach, expect, test, describe, vi } from 'vitest';
import { timeout_env } from '../src/env.js';

vi.hoisted(() => {
	vi.stubGlobal('ENV_PREFIX', '');
});

describe('timeout_env', () => {
	afterEach(() => {
		vi.unstubAllEnvs();
	});

	test('parses zero correctly', () => {
		vi.stubEnv('TIMEOUT', '0');

		const timeout = timeout_env('TIMEOUT');
		expect(timeout).toBe(0);
	});

	test('parses positive integers correctly', () => {
		vi.stubEnv('TIMEOUT', '60');

		const timeout = timeout_env('TIMEOUT');
		expect(timeout).toBe(60);
	});

	test('returns the fallback when variable is not set', () => {
		const timeout = timeout_env('TIMEOUT', 30);
		expect(timeout).toBe(30);
	});

	test('returns undefined when variable is not set and no fallback is provided', () => {
		const timeout = timeout_env('TIMEOUT');
		expect(timeout).toBeUndefined();
	});

	test('throws an error for negative integers', () => {
		vi.stubEnv('TIMEOUT', '-10');

		expect(() => timeout_env('TIMEOUT')).toThrow(
			'Invalid value for environment variable TIMEOUT: "-10" (should be a non-negative integer)'
		);
	});

	test('throws an error for non-integer values', () => {
		vi.stubEnv('TIMEOUT', 'abc');

		expect(() => timeout_env('TIMEOUT')).toThrow(
			'Invalid value for environment variable TIMEOUT: "abc" (should be a non-negative integer)'
		);
	});
});
