import { describe, expect, test } from 'vitest';
import { accepts_encoding, append_vary, parse_as_bytes } from './utils.js';

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

describe('accepts_encoding', () => {
	test('honors quality values and wildcards', () => {
		expect(accepts_encoding('gzip;q=0, *;q=1', 'gzip')).toBe(false);
		expect(accepts_encoding('gzip;q=0, *;q=1', 'br')).toBe(true);
		expect(accepts_encoding('br; q=0.5', 'br')).toBe(true);
	});
});

describe('append_vary', () => {
	test('does not add duplicate values', () => {
		const headers = new Headers({ vary: 'Origin, Accept-Encoding' });
		append_vary(headers, 'accept-encoding');
		expect(headers.get('vary')).toBe('Origin, Accept-Encoding');
	});
});
