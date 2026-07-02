import { expect, test, describe } from 'vitest';
import { format_listening_address, parse_as_bytes } from './utils.js';

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
