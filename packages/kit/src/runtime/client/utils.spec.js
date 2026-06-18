import { describe, expect, test } from 'vitest';
import { is_external_url } from './utils.js';

describe('is_external_url', () => {
	test('treats about: URLs as internal', () => {
		expect(is_external_url(new URL('about:srcdoc'), '', false)).toBe(false);
		expect(is_external_url(new URL('about:blank'), '', false)).toBe(false);
	});

	test('treats data: URLs as internal', () => {
		expect(is_external_url(new URL('data:text/html,<p>hi</p>'), '', false)).toBe(false);
	});

	test('treats about:/data: URLs as internal even with hash routing', () => {
		expect(is_external_url(new URL('about:srcdoc'), '', true)).toBe(false);
		expect(is_external_url(new URL('data:text/html,<p>hi</p>'), '', true)).toBe(false);
	});

	test('still treats cross-origin URLs as external', () => {
		expect(is_external_url(new URL('https://example.com/foo'), '', false)).toBe(true);
	});
});
