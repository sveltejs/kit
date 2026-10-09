import { expect, test } from 'vitest';
import { forwardedAddress, negotiateEncoding } from './runtime.js';

test('negotiateEncoding picks the highest weighted variant that exists', () => {
	const both = { br: true, gz: true };

	expect(negotiateEncoding('br, gzip', both)).toBe('br');
	expect(negotiateEncoding('br;q=0.5, gzip', both)).toBe('gz');
	expect(negotiateEncoding('br;q=0, gzip', both)).toBe('gz');
	expect(negotiateEncoding('*', both)).toBe('br');
	expect(negotiateEncoding('br', { gz: true })).toBe(undefined);
	expect(negotiateEncoding(null, both)).toBe(undefined);
});

test('forwardedAddress reads the address a trusted proxy reported', () => {
	const options = { header: 'x-forwarded-for', depth: 2, envPrefix: 'MY_' };

	expect(forwardedAddress({ ...options, value: 'spoofed, 1.1.1.1, 2.2.2.2' })).toBe('1.1.1.1');
	expect(forwardedAddress({ ...options, header: 'true-client-ip', value: '3.3.3.3' })).toBe(
		'3.3.3.3'
	);
	expect(() => forwardedAddress({ ...options, value: null })).toThrow(
		'MY_ADDRESS_HEADER=x-forwarded-for but is absent from request'
	);
	expect(() => forwardedAddress({ ...options, value: '1.1.1.1' })).toThrow(
		'MY_XFF_DEPTH is 2, but only found 1 addresses'
	);
});
