import { afterEach, describe, test, expect, vi } from 'vitest';
import { validateHeaders } from './validate-headers.js';

describe('validateHeaders', () => {
	const console_warn_spy = vi.spyOn(console, 'warn').mockImplementation(() => {});

	afterEach(() => {
		console_warn_spy.mockClear();
	});

	describe('cache-control header', () => {
		test('accepts valid directives', () => {
			validateHeaders({ 'cache-control': 'public, max-age=3600' });
			expect(console_warn_spy).not.toHaveBeenCalled();
		});

		test('rejects invalid directives', () => {
			validateHeaders({ 'cache-control': 'public, maxage=3600' });
			expect(console_warn_spy).toHaveBeenCalledOnce();
			expect(console_warn_spy).toContainKitDiagnostic('cache_control_invalid_directive', {
				contains: ['`maxage`', 'max-age, public', '`public, maxage=3600`']
			});
		});

		test('rejects empty directives', () => {
			validateHeaders({ 'cache-control': 'public,, max-age=3600' });
			expect(console_warn_spy).toHaveBeenCalledOnce();
			expect(console_warn_spy).toContainKitDiagnostic('cache_control_empty_directive', {
				contains: ['`public,, max-age=3600`']
			});

			console_warn_spy.mockClear();
			validateHeaders({ 'cache-control': 'public, , max-age=3600' });
			expect(console_warn_spy).toHaveBeenCalledOnce();
			expect(console_warn_spy).toContainKitDiagnostic('cache_control_empty_directive', {
				contains: ['`public, , max-age=3600`']
			});
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
			expect(console_warn_spy).toHaveBeenCalledOnce();
			expect(console_warn_spy).toContainKitDiagnostic('content_type_invalid', {
				contains: ['`invalid-content-type`']
			});
		});

		test('rejects invalid content type categories', () => {
			validateHeaders({ 'content-type': 'invalid/type; invalid=param' });
			expect(console_warn_spy).toHaveBeenCalledOnce();
			expect(console_warn_spy).toContainKitDiagnostic('content_type_invalid', {
				contains: ['`invalid/type`', '`invalid/type; invalid=param`']
			});

			console_warn_spy.mockClear();
			validateHeaders({ 'content-type': 'bad/type; charset=utf-8' });
			expect(console_warn_spy).toHaveBeenCalledOnce();
			expect(console_warn_spy).toContainKitDiagnostic('content_type_invalid', {
				contains: ['`bad/type`']
			});
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

	test('warns about each invalid header without throwing', () => {
		expect(() =>
			validateHeaders({
				'cache-control': 'maxage=3600',
				'content-type': 'invalid'
			})
		).not.toThrow();

		expect(console_warn_spy).toHaveBeenCalledTimes(2);
		expect(console_warn_spy).toContainKitDiagnostic('cache_control_invalid_directive');
		expect(console_warn_spy).toContainKitDiagnostic('content_type_invalid');
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
