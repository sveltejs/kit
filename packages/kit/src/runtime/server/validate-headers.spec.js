import { describe, test, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';

describe('validateHeaders', () => {
	/** @type {typeof console.warn} */
	let console_warn;

	/** @type {(headers: Record<string, string>) => void} */
	let validateHeaders;

	beforeAll(() => {
		console_warn = console.warn;
		// @ts-expect-error
		globalThis.__SVELTEKIT_DEV__ = false;
	});

	afterAll(() => {
		console.warn = console_warn;
		vi.unstubAllGlobals();
	});

	beforeEach(async () => {
		console.warn = vi.fn();
		// @ts-expect-error
		globalThis.__SVELTEKIT_DEV__ = true;
		const module = await import('./validate-headers.js');
		validateHeaders = module.validateHeaders;
	});

	test('validates cache-control header', () => {
		validateHeaders({ 'cache-control': 'public, max-age=3600' });
		expect(console.warn).not.toHaveBeenCalled();

		validateHeaders({ 'cache-control': 'public, maxage=3600' });
		expect(console.warn).toHaveBeenCalledWith(
			expect.stringContaining('Invalid cache-control directive "maxage"')
		);
	});

	test('validates content-type header', () => {
		validateHeaders({ 'content-type': 'application/json' });
		expect(console.warn).not.toHaveBeenCalled();

		validateHeaders({ 'content-type': 'invalid-content-type' });
		expect(console.warn).toHaveBeenCalledWith(
			expect.stringContaining('Invalid content-type value')
		);
	});

	test('allows unknown headers', () => {
		validateHeaders({ 'x-custom-header': 'some-value' });
		expect(console.warn).not.toHaveBeenCalled();
	});
});
