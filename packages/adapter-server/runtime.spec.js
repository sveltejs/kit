import { expect, test } from 'vitest';
import { forwardedAddress, negotiateEncoding, trailingSlashLocation } from './runtime.js';

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

test('trailingSlashLocation points at the canonical form of the last segment', () => {
	expect(trailingSlashLocation('/a/b/')).toBe('../b');
	expect(trailingSlashLocation('/a/b')).toBe('./b/');
	expect(trailingSlashLocation('/a/http:example.com/')).toBe('../http:example.com');
});

test('trailingSlashLocation percent-encodes characters that cannot appear in a header', () => {
	// decoded pathnames, as adapter-node passes them
	expect(trailingSlashLocation('/never/日本語/')).toBe('../%E6%97%A5%E6%9C%AC%E8%AA%9E');
	expect(trailingSlashLocation('/always/ĉapo')).toBe('./%C4%89apo/');
	expect(trailingSlashLocation('/never/🚀/')).toBe('../%F0%9F%9A%80');
	expect(trailingSlashLocation('/never/a b/')).toBe('../a%20b');

	// existing escapes are left alone, so already-encoded pathnames, as adapter-bun passes them, are unchanged
	expect(trailingSlashLocation('/never/100%25/')).toBe('../100%25');
	expect(trailingSlashLocation('/never/caf%C3%A9/')).toBe('../caf%C3%A9');
});
