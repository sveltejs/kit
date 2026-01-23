import { assert, describe, test } from 'vitest';
import { fix_css_urls } from './css.js';

describe('fix_css_urls', () => {
	test('fixes Vite asset URL', () => {
		assert.equal(
			fix_css_urls({
				css: 'div { background: url(./image.png); }',
				vite_assets: new Set(['image.png']),
				static_assets: new Set(),
				assets: 'https://cdn.example.com/_app/immutable/assets',
				base: 'https://cdn.example.com'
			}),
			'div { background: url(https://cdn.example.com/_app/immutable/assets/image.png); }'
		);
	});

	test('fixes static asset URL', () => {
		assert.equal(
			fix_css_urls({
				css: 'div { background: url(../../../image.png); }',
				vite_assets: new Set(),
				static_assets: new Set(['image.png']),
				assets: 'https://cdn.example.com/_app/immutable/assets',
				base: 'https://cdn.example.com'
			}),
			'div { background: url(https://cdn.example.com/image.png); }'
		);
	});

	test('keeps single quotes', () => {
		assert.equal(
			fix_css_urls({
				css: "div { background: url('../../../image.png'); }",
				vite_assets: new Set(),
				static_assets: new Set(['image.png']),
				assets: 'https://cdn.example.com/_app/immutable/assets',
				base: 'https://cdn.example.com'
			}),
			"div { background: url('https://cdn.example.com/image.png'); }"
		);
	});

	test('keeps double-quotes', () => {
		assert.equal(
			fix_css_urls({
				css: 'div { background: url("./image.png"); }',
				vite_assets: new Set(['image.png']),
				static_assets: new Set(),
				assets: 'https://cdn.example.com/_app/immutable/assets',
				base: 'https://cdn.example.com'
			}),
			'div { background: url("https://cdn.example.com/_app/immutable/assets/image.png"); }'
		);
	});

	test('works with case-insensitive URL function', () => {
		assert.equal(
			fix_css_urls({
				css: 'div { background: uRl(./image.png); }',
				vite_assets: new Set(['image.png']),
				static_assets: new Set(),
				assets: 'https://cdn.example.com/_app/immutable/assets',
				base: 'https://cdn.example.com'
			}),
			'div { background: uRl(https://cdn.example.com/_app/immutable/assets/image.png); }'
		);
	});

	test('works with multiple declarations', () => {
		const input = `
		div {
			background: url(./bg.png);
			border-image: url(./border.svg);
			mask: url(./mask.png);
		}
		`;
		const expected = `
		div {
			background: url(./_app/immutable/assets/bg.png);
			border-image: url(./_app/immutable/assets/border.svg);
			mask: url(./_app/immutable/assets/mask.png);
		}
		`;
		assert.equal(
			fix_css_urls({
				css: input,
				vite_assets: new Set(['bg.png', 'border.svg', 'mask.png']),
				static_assets: new Set(),
				assets: './_app/immutable/assets',
				base: '.'
			}),
			expected
		);
	});

	test('does not replace non-relative urls', () => {
		assert.equal(
			fix_css_urls({
				css: 'div { background: url(/absolute/image.png); }',
				vite_assets: new Set(),
				static_assets: new Set(),
				assets: './_app/immutable/assets',
				base: '.'
			}),
			'div { background: url(/absolute/image.png); }'
		);
		assert.equal(
			fix_css_urls({
				css: 'div { background: url(https://example.com/image.png); }',
				vite_assets: new Set(),
				static_assets: new Set(),
				assets: './_app/immutable/assets',
				base: '.'
			}),
			'div { background: url(https://example.com/image.png); }'
		);
		assert.equal(
			fix_css_urls({
				css: 'div { background: url(data:image/png;base64,abc); }',
				vite_assets: new Set(),
				static_assets: new Set(),
				assets: './_app/immutable/assets',
				base: '.'
			}),
			'div { background: url(data:image/png;base64,abc); }'
		);
	});

	test('does not replace unrelated URLs', () => {
		assert.equal(
			fix_css_urls({
				css: 'div { background: url(./image.png); }',
				vite_assets: new Set(),
				static_assets: new Set(['image.png']),
				assets: './_app/immutable/assets',
				base: '.'
			}),
			'div { background: url(./image.png); }'
		);

		assert.equal(
			fix_css_urls({
				css: 'div { background: url(../../../image.png); }',
				vite_assets: new Set(),
				static_assets: new Set(),
				assets: './_app/immutable/assets',
				base: '.'
			}),
			'div { background: url(../../../image.png); }'
		);

		assert.equal(
			fix_css_urls({
				css: 'div { background: url(../../../../image.png); }',
				vite_assets: new Set(),
				static_assets: new Set(),
				assets: './_app/immutable/assets',
				base: '.'
			}),
			'div { background: url(../../../../image.png); }'
		);
	});

	test('handles whitespace after opening parenthesis', () => {
		assert.equal(
			fix_css_urls({
				css: 'div { background: url( ./image.png); }',
				vite_assets: new Set(['image.png']),
				static_assets: new Set(),
				assets: './_app/immutable/assets',
				base: '.'
			}),
			'div { background: url( ./_app/immutable/assets/image.png); }'
		);
	});

	test('handles multiple spaces before quoted path', () => {
		assert.equal(
			fix_css_urls({
				css: 'div { background: url(  "./image.png"); }',
				vite_assets: new Set(['image.png']),
				static_assets: new Set(),
				assets: './_app/immutable/assets',
				base: '.'
			}),
			'div { background: url(  "./_app/immutable/assets/image.png"); }'
		);
	});

	test('handles tab before single-quoted path', () => {
		assert.equal(
			fix_css_urls({
				css: "div { background: url(\t'./image.png'); }",
				vite_assets: new Set(['image.png']),
				static_assets: new Set(),
				assets: './_app/immutable/assets',
				base: '.'
			}),
			"div { background: url(\t'./_app/immutable/assets/image.png'); }"
		);
	});

	test('handles url with query string', () => {
		assert.equal(
			fix_css_urls({
				css: 'div { background: url(./image.png?v=123); }',
				vite_assets: new Set(['image.png']),
				static_assets: new Set(),
				assets: './_app/immutable/assets',
				base: '.'
			}),
			'div { background: url(./_app/immutable/assets/image.png?v=123); }'
		);
	});

	test('handles url with hash fragment', () => {
		assert.equal(
			fix_css_urls({
				css: "div { background: url('./image.png#section'); }",
				vite_assets: new Set(['image.png']),
				static_assets: new Set(),
				assets: './_app/immutable/assets',
				base: '.'
			}),
			"div { background: url('./_app/immutable/assets/image.png#section'); }"
		);
	});

	test('handles url with both query string and fragment', () => {
		assert.equal(
			fix_css_urls({
				css: 'div { background: url("./image.png?a=1&b=2#anchor"); }',
				vite_assets: new Set(['image.png']),
				static_assets: new Set(),
				assets: './_app/immutable/assets',
				base: '.'
			}),
			'div { background: url("./_app/immutable/assets/image.png?a=1&b=2#anchor"); }'
		);
	});

	test('handles multiple URLs in a single declaration', () => {
		const input = 'div { background: image-set(url(./a.png) 1x, url(./b.png) 2x); }';
		const expected =
			'div { background: image-set(url(./_app/immutable/assets/a.png) 1x, url(./_app/immutable/assets/b.png) 2x); }';

		assert.equal(
			fix_css_urls({
				css: input,
				vite_assets: new Set(['a.png', 'b.png']),
				static_assets: new Set(),
				assets: './_app/immutable/assets',
				base: '.'
			}),
			expected
		);
	});

	test('does not replace relative url without ./ prefix', () => {
		assert.equal(
			fix_css_urls({
				css: 'div { background: url(image.png); }',
				vite_assets: new Set(['image.png']),
				static_assets: new Set(),
				assets: './_app/immutable/assets',
				base: '.'
			}),
			'div { background: url(image.png); }'
		);
	});
});
