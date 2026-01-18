import { assert, describe, test } from 'vitest';
import { replace_css_relative_url } from './css.js';

describe('replace_css_relative_url', () => {
	test('replaces relative url with base path', () => {
		assert.equal(replace_css_relative_url('url(./image.png)', '/assets'), 'url(/assets/image.png)');
	});

	test('handles single-quoted urls', () => {
		assert.equal(
			replace_css_relative_url("url('./image.png')", '/assets'),
			"url('/assets/image.png')"
		);
	});

	test('handles double-quoted urls', () => {
		assert.equal(
			replace_css_relative_url('url("./image.png")', '/assets'),
			'url("/assets/image.png")'
		);
	});

	test('case-insensitive urls', () => {
		assert.equal(
			replace_css_relative_url('uRl("./image.png")', '/assets'),
			'url("/assets/image.png")'
		);
	});

	test('replaces multiple relative urls', () => {
		const input = `
			background: url(./bg.png);
			border-image: url('./border.svg');
			mask: url("./mask.png");
		`;
		const expected = `
			background: url(/assets/bg.png);
			border-image: url('/assets/border.svg');
			mask: url("/assets/mask.png");
		`;
		assert.equal(replace_css_relative_url(input, '/assets'), expected);
	});

	test('does not replace non-relative urls', () => {
		assert.equal(
			replace_css_relative_url('url(/absolute/image.png)', '/assets'),
			'url(/absolute/image.png)'
		);
		assert.equal(
			replace_css_relative_url('url(https://example.com/image.png)', '/assets'),
			'url(https://example.com/image.png)'
		);
		assert.equal(
			replace_css_relative_url('url(data:image/png;base64,abc)', '/assets'),
			'url(data:image/png;base64,abc)'
		);
	});

	test('does not replace parent directory urls', () => {
		assert.equal(replace_css_relative_url('url(../image.png)', '/assets'), 'url(../image.png)');
	});

	test('handles whitespace after opening parenthesis', () => {
		assert.equal(
			replace_css_relative_url('url( ./image.png)', '/assets'),
			'url(/assets/image.png)'
		);
	});

	test('handles multiple spaces before quoted path', () => {
		assert.equal(
			replace_css_relative_url('url(  "./image.png")', '/assets'),
			'url("/assets/image.png")'
		);
	});

	test('handles tab before single-quoted path', () => {
		assert.equal(
			replace_css_relative_url("url(\t'./image.png')", '/assets'),
			"url('/assets/image.png')"
		);
	});

	test('handles url with query string', () => {
		assert.equal(
			replace_css_relative_url('url(./image.png?v=123)', '/assets'),
			'url(/assets/image.png?v=123)'
		);
	});

	test('handles url with hash fragment', () => {
		assert.equal(
			replace_css_relative_url("url('./image.png#section')", '/assets'),
			"url('/assets/image.png#section')"
		);
	});

	test('handles url with hash fragment without extension', () => {
		assert.equal(replace_css_relative_url('url(./foo#bar)', '/assets'), 'url(/assets/foo#bar)');
	});

	test('handles url with both query string and fragment', () => {
		assert.equal(
			replace_css_relative_url('url("./image.png?a=1&b=2#anchor")', '/assets'),
			'url("/assets/image.png?a=1&b=2#anchor")'
		);
	});

	test('handles deeply nested paths', () => {
		assert.equal(
			replace_css_relative_url('url(./path/to/deep/nested/image.png)', '/assets'),
			'url(/assets/path/to/deep/nested/image.png)'
		);
	});

	test('handles urls inside image-set()', () => {
		const input = 'background: image-set(url(./a.png) 1x, url(./b.png) 2x)';
		const expected = 'background: image-set(url(/assets/a.png) 1x, url(/assets/b.png) 2x)';
		assert.equal(replace_css_relative_url(input, '/assets'), expected);
	});

	test('does not replace relative url without ./ prefix', () => {
		assert.equal(replace_css_relative_url('url(image.png)', '/assets'), 'url(image.png)');
	});

	test('does not replace svg fragment reference', () => {
		assert.equal(replace_css_relative_url('url(#svg-filter)', '/assets'), 'url(#svg-filter)');
	});

	test('does not replace empty url', () => {
		assert.equal(replace_css_relative_url('url()', '/assets'), 'url()');
	});

	test('handles empty base parameter', () => {
		assert.equal(replace_css_relative_url('url(./image.png)', ''), 'url(/image.png)');
	});

	test('handles full CDN url as base', () => {
		assert.equal(
			replace_css_relative_url('url(./image.png)', 'https://cdn.example.com/stuff'),
			'url(https://cdn.example.com/stuff/image.png)'
		);
	});
});
