import { expect, test, describe } from 'vitest';
import { format_listening_address, parse_as_bytes, parse_origin } from '../utils.js';

describe('parse_as_bytes', () => {
	test.each([
		['200', 200],
		['512K', 512 * 1024],
		['200M', 200 * 1024 * 1024],
		['1G', 1024 * 1024 * 1024],
		['Infinity', Infinity],
		['asdf', NaN]
	] as const)('parses correctly', (input, expected) => {
		const actual = parse_as_bytes(input);
		expect(actual, `Testing input '${input}'`).toBe(expected);
	});
});

describe('parse_origin', () => {
	test.each([
		['http://localhost:3000', 'http://localhost:3000'],
		['https://example.com', 'https://example.com'],
		['http://192.168.1.1:8080', 'http://192.168.1.1:8080'],
		['https://my-site.com', 'https://my-site.com'],
		['http://localhost', 'http://localhost'],
		// Default ports are normalized by URL.origin per WHATWG URL standard
		['https://example.com:443', 'https://example.com'],
		['http://example.com:80', 'http://example.com'],
		[undefined, undefined]
	] as const)('normalizes %s to %s', (input, expected) => {
		expect(parse_origin(input)).toBe(expected);
	});

	test.each([
		['http://localhost:3000/path', 'http://localhost:3000'],
		['http://localhost:3000?query=1', 'http://localhost:3000'],
		['http://localhost:3000#hash', 'http://localhost:3000'],
		['https://example.com/path/to/page', 'https://example.com'],
		['https://example.com:443/path?query=1#hash', 'https://example.com']
	] as const)('strips path/query/hash from %s to get %s', (input, expected) => {
		expect(parse_origin(input)).toBe(expected);
	});

	test.each(['localhost:3000', 'example.com', '', '   ', 'ftp://localhost:3000'] as const)(
		'throws error for invalid origin: %s',
		(input) => {
			expect(() => parse_origin(input)).toThrow('Invalid ORIGIN');
		}
	);
});

describe('format_listening_address', () => {
	test('uses the actual listening port assigned by the server', () => {
		expect(
			format_listening_address(false, '0.0.0.0', '0', {
				address: '0.0.0.0',
				family: 'IPv4',
				port: 43521
			})
		).toBe('http://0.0.0.0:43521');
	});

	test('formats IPv6 addresses as valid URLs', () => {
		expect(
			format_listening_address(false, '::1', '3000', {
				address: '::1',
				family: 'IPv6',
				port: 3000
			})
		).toBe('http://[::1]:3000');
	});

	test('falls back to configured host and port when the address is unavailable', () => {
		expect(format_listening_address(false, 'localhost', '3000', null)).toBe(
			'http://localhost:3000'
		);
	});

	test('returns the socket path unchanged', () => {
		expect(format_listening_address('/tmp/sveltekit.sock', '0.0.0.0', '3000', null)).toBe(
			'/tmp/sveltekit.sock'
		);
	});
});
