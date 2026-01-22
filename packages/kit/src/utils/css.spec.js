import { assert, describe, test } from 'vitest';
import { replace_css_relative_url } from './css.js';

describe('replace_css_relative_url', () => {
	test('replaces relative url with assets path', () => {
		assert.equal(
			replace_css_relative_url(
				'div { background: url(./image.png); }',
				new Set(['image.png']),
				'https://cdn.example.com/_app/immutable/assets',
				'https://cdn.example.com'
			),
			'div { background: url(https://cdn.example.com/_app/immutable/assets/image.png); }'
		);
	});

	test('handles single-quoted urls', () => {
		assert.equal(
			replace_css_relative_url(
				"div { background: url('./image.png'); }",
				new Set(['image.png']),
				'https://cdn.example.com/_app/immutable/assets',
				'https://cdn.example.com'
			),
			"div { background: url('https://cdn.example.com/_app/immutable/assets/image.png'); }"
		);
	});

	test('handles double-quoted urls', () => {
		assert.equal(
			replace_css_relative_url(
				'div { background: url("./image.png"); }',
				new Set(['image.png']),
				'https://cdn.example.com/_app/immutable/assets',
				'https://cdn.example.com'
			),
			'div { background: url("https://cdn.example.com/_app/immutable/assets/image.png"); }'
		);
	});

	test('case-insensitive URL function', () => {
		assert.equal(
			replace_css_relative_url(
				'div { background: uRl(./image.png); }',
				new Set(['image.png']),
				'https://cdn.example.com/_app/immutable/assets',
				'https://cdn.example.com'
			),
			'div { background: url(https://cdn.example.com/_app/immutable/assets/image.png); }'
		);
	});

	test('replaces multiple declarations', () => {
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
			replace_css_relative_url(
				input,
				new Set(['bg.png', 'border.svg', 'mask.png']),
				'./_app/immutable/assets',
				'.'
			),
			expected
		);
	});

	test('does not replace non-relative urls', () => {
		assert.equal(
			replace_css_relative_url(
				'div { background: url(/absolute/image.png); }',
				new Set(),
				'./_app/immutable/assets',
				'.'
			),
			'div { background: url(/absolute/image.png); }'
		);
		assert.equal(
			replace_css_relative_url(
				'div { background: url(https://example.com/image.png); }',
				new Set(),
				'./_app/immutable/assets',
				'.'
			),
			'div { background: url(https://example.com/image.png); }'
		);
		assert.equal(
			replace_css_relative_url(
				'div { background: url(data:image/png;base64,abc); }',
				new Set(),
				'./_app/immutable/assets',
				'.'
			),
			'div { background: url(data:image/png;base64,abc); }'
		);
	});

	test('does not replace parent directory urls', () => {
		assert.equal(
			replace_css_relative_url(
				'div { background: url(../image.png); }',
				new Set(),
				'./_app/immutable/assets',
				'.'
			),
			'div { background: url(../image.png); }'
		);

		assert.equal(
			replace_css_relative_url(
				'div { background: url(../../../image.png); }',
				new Set(),
				'./_app/immutable/assets',
				'.'
			),
			'div { background: url(../../../image.png); }'
		);

		assert.equal(
			replace_css_relative_url(
				'div { background: url(../../../../image.png); }',
				new Set(),
				'./_app/immutable/assets',
				'.'
			),
			'div { background: url(../../../../image.png); }'
		);
	});

	test('handles whitespace after opening parenthesis', () => {
		assert.equal(
			replace_css_relative_url(
				'div { background: url( ./image.png); }',
				new Set(['image.png']),
				'./_app/immutable/assets',
				'.'
			),
			'div { background: url(./_app/immutable/assets/image.png); }'
		);
	});

	test('handles multiple spaces before quoted path', () => {
		assert.equal(
			replace_css_relative_url(
				'div { background: url(  "./image.png"); }',
				new Set(['image.png']),
				'./_app/immutable/assets',
				'.'
			),
			'div { background: url("./_app/immutable/assets/image.png"); }'
		);
	});

	test('handles tab before single-quoted path', () => {
		assert.equal(
			replace_css_relative_url(
				"div { background: url(\t'./image.png'); }",
				new Set(['image.png']),
				'./_app/immutable/assets',
				'.'
			),
			"div { background: url('./_app/immutable/assets/image.png'); }"
		);
	});

	test('handles url with query string', () => {
		assert.equal(
			replace_css_relative_url(
				'div { background: url(./image.png?v=123); }',
				new Set(['image.png']),
				'./_app/immutable/assets',
				'.'
			),
			'div { background: url(./_app/immutable/assets/image.png?v=123); }'
		);
	});

	test('handles url with hash fragment', () => {
		assert.equal(
			replace_css_relative_url(
				"div { background: url('./image.png#section'); }",
				new Set(['image.png']),
				'./_app/immutable/assets',
				'.'
			),
			"div { background: url('./_app/immutable/assets/image.png#section'); }"
		);
	});

	test('handles url with both query string and fragment', () => {
		assert.equal(
			replace_css_relative_url(
				'div { background: url("./image.png?a=1&b=2#anchor"); }',
				new Set(['image.png']),
				'./_app/immutable/assets',
				'.'
			),
			'div { background: url("./_app/immutable/assets/image.png?a=1&b=2#anchor"); }'
		);
	});

	test('handles multiple URLs in a single declaration', () => {
		const input = 'div { background: image-set(url(./a.png) 1x, url(./b.png) 2x); }';
		const expected =
			'div { background: image-set(url(./_app/immutable/assets/a.png) 1x, url(./_app/immutable/assets/b.png) 2x); }';

		assert.equal(
			replace_css_relative_url(input, new Set(['a.png', 'b.png']), './_app/immutable/assets', '.'),
			expected
		);
	});

	test('does not replace relative url without ./ prefix', () => {
		assert.equal(
			replace_css_relative_url(
				'div { background: url(image.png); }',
				new Set(['image.png']),
				'./_app/immutable/assets',
				'.'
			),
			'div { background: url(image.png); }'
		);
	});

	test('replaces ../../../ urls with base', () => {
		assert.equal(
			replace_css_relative_url(
				'div { background: url(../../../image.png); }',
				new Set(),
				'./_app/immutable',
				'.'
			),
			'div { background: url(./image.png); }'
		);
	});

	test('replaces ../../../ urls with base and quotes', () => {
		assert.equal(
			replace_css_relative_url(
				"div { background: url('../../../image.png'); }",
				new Set(),
				'./_app/immutable/assets',
				'.'
			),
			"div { background: url('./image.png'); }"
		);
	});

	test('only replaces known assets', () => {
		const input = 'div { background: url(./known.png), url(./unknown.png); }';
		const expected =
			'div { background: url(./_app/immutable/assets/known.png), url(./unknown.png); }';
		assert.equal(
			replace_css_relative_url(input, new Set(['known.png']), './_app/immutable/assets', '.'),
			expected
		);
	});
});
