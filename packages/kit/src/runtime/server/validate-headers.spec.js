import { describe, test, expect, beforeEach, vi } from 'vitest';
import { validateHeaders } from './validate-headers.js';

describe('validateHeaders', () => {
	const console_warn_spy = vi.spyOn(console, 'warn');

	beforeEach(() => {
		vi.resetAllMocks();
	});

	describe('cache-control header', () => {
		test('accepts valid directives', () => {
			validateHeaders({ 'cache-control': 'public, max-age=3600' });
			expect(console_warn_spy).not.toHaveBeenCalled();
		});

		test('rejects invalid directives', () => {
			validateHeaders({ 'cache-control': 'public, maxage=3600' });
			expect(console_warn_spy).toHaveBeenCalledWith(
				expect.stringContaining('Invalid cache-control directive "maxage"')
			);
		});

		test('rejects empty directives', () => {
			validateHeaders({ 'cache-control': 'public,, max-age=3600' });
			expect(console_warn_spy).toHaveBeenCalledWith(
				expect.stringContaining('`cache-control` header contains empty directives')
			);

			validateHeaders({ 'cache-control': 'public, , max-age=3600' });
			expect(console_warn_spy).toHaveBeenCalledWith(
				expect.stringContaining('`cache-control` header contains empty directives')
			);
		});

		test('accepts multiple cache-control values', () => {
			validateHeaders({ 'cache-control': 'max-age=3600, s-maxage=7200' });
			expect(console_warn_spy).not.toHaveBeenCalled();
		});
	});

	describe('content-type header', () => {
		test('accepts standard content types', () => {
			validateHeaders({ 'content-type': 'application/json' });
			expect(console_warn_spy).not.toHaveBeenCalled();
		});

		test('accepts content types with parameters', () => {
			validateHeaders({ 'content-type': 'text/html; charset=utf-8' });
			expect(console_warn_spy).not.toHaveBeenCalled();

			validateHeaders({ 'content-type': 'application/javascript; charset=utf-8' });
			expect(console_warn_spy).not.toHaveBeenCalled();
		});

		test('accepts vendor-specific content types', () => {
			validateHeaders({ 'content-type': 'x-custom/whatever' });
			expect(console_warn_spy).not.toHaveBeenCalled();
		});

		test('rejects malformed content types', () => {
			validateHeaders({ 'content-type': 'invalid-content-type' });
			expect(console_warn_spy).toHaveBeenCalledWith(
				expect.stringContaining('Invalid content-type value "invalid-content-type"')
			);
		});

		test('rejects invalid content type categories', () => {
			validateHeaders({ 'content-type': 'invalid/type; invalid=param' });
			expect(console_warn_spy).toHaveBeenCalledWith(
				expect.stringContaining('Invalid content-type value "invalid/type"')
			);

			validateHeaders({ 'content-type': 'bad/type; charset=utf-8' });
			expect(console_warn_spy).toHaveBeenCalledWith(
				expect.stringContaining('Invalid content-type value "bad/type"')
			);
		});

		test('handles case-insensitive content-types', () => {
			validateHeaders({ 'content-type': 'TEXT/HTML; charset=utf-8' });
			expect(console_warn_spy).not.toHaveBeenCalled();
		});
	});

	test('allows unknown headers', () => {
		validateHeaders({ 'x-custom-header': 'some-value' });
		expect(console_warn_spy).not.toHaveBeenCalled();
	});

	test('handles multiple headers simultaneously', () => {
		validateHeaders({
			'cache-control': 'max-age=3600',
			'content-type': 'text/html',
			'x-custom': 'value'
		});
		expect(console_warn_spy).not.toHaveBeenCalled();
	});
});
