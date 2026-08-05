import { describe, expect, test } from 'vitest';
import { parse_as_bytes } from './utils.js';

describe('parse_as_bytes', () => {
	test.each([
		['200', 200],
		['512K', 512 * 1024],
		['200M', 200 * 1024 * 1024],
		['1G', 1024 * 1024 * 1024],
		['asdf', NaN]
	] as const)('parses %s', (input, expected) => {
		expect(parse_as_bytes(input)).toBe(expected);
	});
});
