import { assert, describe } from 'vitest';
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

	test('requires permission for absolute locations', () => {
		assert.throws(
			() => validate_redirect_location('https://google.de'),
			/Cannot redirect to external URL "https:\/\/google\.de"/
		);
	});

	test('requires permission for locations that parse as absolute after URL normalization', () => {
		assert.throws(
			() => validate_redirect_location(' https://google.de'),
			/Cannot redirect to external URL " https:\/\/google\.de"/
		);

		assert.throws(
			() => validate_redirect_location('\\\\google.de'),
			/Cannot redirect to external URL "\\\\\\\\google\.de"/
		);

		assert.throws(
			() => validate_redirect_location('x:foo'),
			/Cannot redirect to external URL "x:foo"/
		);
	});
});
