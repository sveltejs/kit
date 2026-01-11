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
});
