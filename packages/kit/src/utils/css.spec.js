import { assert, describe, test } from 'vitest';
import { fix_css_urls, tippex_comments_and_strings } from './css.js';

describe('fix_css_urls', () => {
	const cdn_assets = 'https://cdn.example.com/_app/immutable/assets';
	const cdn_base = 'https://cdn.example.com';
	const local_assets = './_app/immutable/assets';
	const local_base = '.';

	test.each([
		{
			name: 'uses paths.assets for assets processed by Vite',
			css: 'div { background: url(./image.png); }',
			expected: `div { background: url(${cdn_assets}/image.png); }`,
			vite_assets: ['image.png'],
			paths_assets: cdn_assets,
			base: cdn_base
		},
		{
			name: 'uses paths.base for static asset',
			css: 'div { background: url(../../../image.png); }',
			expected: `div { background: url(${cdn_base}/image.png); }`,
			static_assets: ['image.png'],
			paths_assets: cdn_assets,
			base: cdn_base
		},
		{
			name: 'keeps single quotes',
			css: "div { background: url('../../../image.png'); }",
			expected: `div { background: url('${cdn_base}/image.png'); }`,
			static_assets: ['image.png'],
			paths_assets: cdn_assets,
			base: cdn_base
		},
		{
			name: 'keeps double-quotes',
			css: 'div { background: url("./image.png"); }',
			expected: `div { background: url("${cdn_assets}/image.png"); }`,
			vite_assets: ['image.png'],
			paths_assets: cdn_assets,
			base: cdn_base
		},
		{
			name: 'works with case-insensitive URL function',
			css: 'div { background: uRl(./image.png); }',
			expected: `div { background: uRl(${cdn_assets}/image.png); }`,
			vite_assets: ['image.png'],
			paths_assets: cdn_assets,
			base: cdn_base
		},
		{
			name: 'works with multiple declarations',
			css: `
				div {
					background: url(./bg.png);
					border-image: url(./border.svg);
					mask: url(./mask.png);
				}
			`,
			expected: `
				div {
					background: url(${local_assets}/bg.png);
					border-image: url(${local_assets}/border.svg);
					mask: url(${local_assets}/mask.png);
				}
			`,
			vite_assets: ['bg.png', 'border.svg', 'mask.png']
		},
		{
			name: 'ignores URL with leading slash',
			css: 'div { background: url(/absolute/image.png); }',
			expected: 'div { background: url(/absolute/image.png); }'
		},
		{
			name: 'ignores URL with protocol',
			css: `div { background: url(${cdn_base}/image.png); }`,
			expected: `div { background: url(${cdn_base}/image.png); }`
		},
		{
			name: 'ignores data URL',
			css: 'div { background: url(data:image/png;base64,abc); }',
			expected: 'div { background: url(data:image/png;base64,abc); }'
		},
		{
			name: 'ignores URL prefixed with ./ but from the static directory',
			css: 'div { background: url(./image.png); }',
			expected: 'div { background: url(./image.png); }',
			static_assets: ['image.png']
		},
		{
			name: 'ignores URL prefixed with ../../../ but imported',
			css: 'div { background: url(../../../image.png); }',
			expected: 'div { background: url(../../../image.png); }',
			vite_assets: ['image.png']
		},
		{
			name: 'ignores URL prefixed with ../../../ but navigates to deeper levels',
			css: 'div { background: url(../../../../image.png); }',
			expected: 'div { background: url(../../../../image.png); }'
		},
		{
			name: 'handles whitespace after opening parenthesis',
			css: 'div { background: url( ./image.png); }',
			expected: `div { background: url( ${local_assets}/image.png); }`,
			vite_assets: ['image.png']
		},
		{
			name: 'handles multiple spaces before quoted path',
			css: 'div { background: url(  "./image.png"); }',
			expected: `div { background: url(  "${local_assets}/image.png"); }`,
			vite_assets: ['image.png']
		},
		{
			name: 'handles tab before single-quoted path',
			css: "div { background: url(\t'./image.png'); }",
			expected: `div { background: url(\t'${local_assets}/image.png'); }`,
			vite_assets: ['image.png']
		},
		{
			name: 'handles url with query string',
			css: 'div { background: url(./image.png?v=123); }',
			expected: `div { background: url(${local_assets}/image.png?v=123); }`,
			vite_assets: ['image.png']
		},
		{
			name: 'handles url with hash fragment',
			css: "div { background: url('./image.png#section'); }",
			expected: `div { background: url('${local_assets}/image.png#section'); }`,
			vite_assets: ['image.png']
		},
		{
			name: 'handles url with both query string and fragment',
			css: 'div { background: url("./image.png?a=1&b=2#anchor"); }',
			expected: `div { background: url("${local_assets}/image.png?a=1&b=2#anchor"); }`,
			vite_assets: ['image.png']
		},
		{
			name: 'handles multiple URLs in a single declaration',
			css: 'div { background: image-set(url(./a.png) 1x, url(./b.png) 2x); }',
			expected: `div { background: image-set(url(${local_assets}/a.png) 1x, url(${local_assets}/b.png) 2x); }`,
			vite_assets: ['a.png', 'b.png']
		},
		{
			name: 'ignores relative url without ./ prefix',
			css: 'div { background: url(image.png); }',
			expected: 'div { background: url(image.png); }',
			vite_assets: ['image.png']
		},
		{
			name: 'handles escaped quotes',
			css: "div::after { content: \"'\\\"\"; } div { background: url('./image.png?\\''); }",
			expected: `div::after { content: "'\\""; } div { background: url('${local_assets}/image.png?\\''); }`,
			vite_assets: ['image.png']
		},
		{
			name: 'handles escaped parenthesis',
			css: "div { background: url('./image.png?\\)'); }",
			expected: `div { background: url('${local_assets}/image.png?\\)'); }`,
			vite_assets: ['image.png']
		},
		{
			name: 'ignores url(...) inside a string',
			css: "div::after { content: 'url(./image.png)'; }",
			expected: "div::after { content: 'url(./image.png)'; }",
			vite_assets: ['image.png']
		},
		{
			name: 'ignores url(...) inside a comment',
			css: 'div::before { content: "/*"; } div { background: blue /* url(./image.png) */; }',
			expected: 'div::before { content: "/*"; } div { background: blue /* url(./image.png) */; }',
			vite_assets: ['image.png']
		},
		{
			name: 'escapes $ signs when interpolating',
			css: 'div { background: url(./image.png); }\ndiv:after { content: "${example}"; }',
			expected:
				'div { background: url(${assets}/image.png); }\ndiv:after { content: "\\${example}"; }',
			vite_assets: ['image.png'],
			paths_assets: '${assets}',
			base: '${base}'
		}
	])(
		'$name',
		({
			css,
			expected,
			vite_assets = [],
			static_assets = [],
			paths_assets = local_assets,
			base = local_base
		}) => {
			assert.equal(
				fix_css_urls({
					css,
					vite_assets: new Set(vite_assets),
					static_assets: new Set(static_assets),
					paths_assets,
					base,
					static_asset_prefix: '../../../'
				}),
				expected
			);
		}
	);
});

describe('tippex_comments_and_strings', () => {
	test.each([
		// Basic string handling
		["'hello'", "'     '"],
		['"hello"', '"     "'],
		["''", "''"],
		['""', '""'],
		["before 'inside' after", "before '      ' after"],

		// Basic comment handling
		['/* comment */', '/*         */'],
		['/**/', '/**/'],
		['/* * */', '/*   */'],
		['before /* inside */ after', 'before /*        */ after'],

		// Escape sequences inside strings
		["'it\\'s'", "'     '"],
		['"say \\"hi\\""', '"          "'],
		["'test\\\\'", "'      '"],
		["'a\\\\'", "'   '"], // escaped backslash does not escape following quote
		["'a\\\\b'", "'    '"], // escaped backslash followed by more content

		// Mixed quotes (no escaping needed)
		['\'say "hi"\'', "'        '"],
		['"it\'s"', '"    "'],

		// Comment-like patterns inside strings (should not start comment)
		["'/* not a comment */'", "'                   '"],
		['"/* also not */"', '"              "'],

		// String-like patterns inside comments (should not start string)
		["/* 'not a string' */", '/*                */'],
		['/* "also not" */', '/*            */'],

		// Multiple constructs
		["'a' and 'b'", "' ' and ' '"],
		['/* a */ and /* b */', '/*   */ and /*   */'],
		["'str' /* comment */", "'   ' /*         */"],
		["/* comment */ 'string'", "/*         */ '      '"],

		// Real CSS patterns
		['url(./image.png)', 'url(./image.png)'],
		["content: 'url(./fake.png)'", "content: '               '"],
		['/* url(./x.png) */ url(./y.png)', '/*              */ url(./y.png)'],
		[
			"background: url('./a.png') /* fallback */, url('./b.png')",
			"background: url('       ') /*          */, url('       ')"
		],

		// Edge cases
		['a \\/* comment */', 'a \\/*         */'], // backslash outside string should not affect comment detection
		["'unterminated", "'            "], // unterminated single-quoted string
		['"unterminated', '"            '], // unterminated double-quoted string
		['/* unterminated', '/*             '], // unterminated comment
		['/* start */', '/*       */'], // comment at start
		["'start'", "'     '"], // string at start
		['   ', '   '], // whitespace preserved
		['', ''], // empty input
		["'\\\\\\\\'", "'    '"], // consecutive escape sequences (two escaped backslashes)
		["'test\\", "'     "] // escape at end of unterminated string
	])('%s → %s', (input, expected) => {
		const result = tippex_comments_and_strings(input);
		assert.equal(result, expected);
		assert.equal(
			input.length,
			expected.length,
			'test is correctly formed (input and expected lengths should always match)'
		);
		assert.equal(result.length, input.length, 'output length must equal input length');
	});
});
