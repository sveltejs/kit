import { assert, describe, expect } from 'vitest';
import { is_external_location, validate_redirect_location } from './url.js';

describe('is_absolute_location', (test) => {
	test('detects absolute URLs', () => {
		assert.equal(is_external_location('https://example.com'), true);
		assert.equal(is_external_location('//example.com/foo'), true);
		assert.equal(is_external_location('mailto:hello@svelte.dev'), true);
		assert.equal(is_external_location('javascript:alert(1)'), true);
		assert.equal(is_external_location(' https://example.com'), true);
		assert.equal(is_external_location('\thttps://example.com'), true);
		assert.equal(is_external_location('java\tscript:alert(1)'), true);
		assert.equal(is_external_location('\\\\example.com/foo'), true);
		assert.equal(is_external_location('/\\\\example.com/foo'), true);
		assert.equal(is_external_location('x:foo'), true);
		assert.equal(is_external_location('blob:https://sveltekit-redirect.invalid/id'), true);
	});

	test('detects relative URLs', () => {
		assert.equal(is_external_location('/foo'), false);
		assert.equal(is_external_location('./foo'), false);
		assert.equal(is_external_location('foo'), false);
		assert.equal(is_external_location('#hash'), false);
		assert.equal(is_external_location('?query'), false);
	});
});

describe('validate_redirect_location', (test) => {
	test('allows relative locations without options', () => {
		validate_redirect_location('/foo');
	});

	test.each([
		['/foo', { external: true }],
		['https://example.com', { external: true }],
		['https://example.com/a', { external: ['https://example.com'] }],
		['javascript:alert(1)', { external: ['javascript:'] }]
	])('allows %j with %j', (location, options) => {
		validate_redirect_location(location, options);
	});

	test.each([
		// locations that parse as absolute after URL normalization count as external too
		...['https://google.de', ' https://google.de', '\\\\google.de', 'x:foo'].map((location) => ({
			location,
			options: undefined,
			code: 'redirect_external_not_allowed'
		})),
		{
			location: 'javascript:alert(1)',
			options: { external: true },
			code: 'redirect_external_javascript'
		},
		{
			location: 'https://evil.com',
			options: { external: ['https://google.de'] },
			code: 'redirect_external_not_in_allowlist'
		}
	])('rejects $location with $code', ({ location, options, code }) => {
		expect(() => validate_redirect_location(location, options)).toThrowKitError(code, {
			contains: [JSON.stringify(location)]
		});
	});

	test('rejects an invalid external option', () => {
		expect(() =>
			validate_redirect_location('https://google.de', { external: /** @type {any} */ ('yes') })
		).toThrowKitError('redirect_external_option_invalid');
	});
});
