import { assert, describe, test } from 'vitest';
import { fix_css_urls } from './css.js';

describe('fix_css_urls', () => {
	const cdn_assets = 'https://cdn.example.com/_app/immutable/assets';
	const cdn_base = 'https://cdn.example.com';
	const local_assets = './_app/immutable/assets';
	const local_base = '.';

	test.each([
		{
			name: 'uses paths.assets imported asset',
			css: 'div { background: url(./image.png); }',
			expected: `div { background: url(${cdn_assets}/image.png); }`,
			vite_assets: ['image.png'],
			assets: cdn_assets,
			base: cdn_base
		},
		{
			name: 'uses paths.base for static asset',
			css: 'div { background: url(../../../image.png); }',
			expected: `div { background: url(${cdn_base}/image.png); }`,
			static_assets: ['image.png'],
			assets: cdn_assets,
			base: cdn_base
		},
		{
			name: 'keeps single quotes',
			css: "div { background: url('../../../image.png'); }",
			expected: `div { background: url('${cdn_base}/image.png'); }`,
			static_assets: ['image.png'],
			assets: cdn_assets,
			base: cdn_base
		},
		{
			name: 'keeps double-quotes',
			css: 'div { background: url("./image.png"); }',
			expected: `div { background: url("${cdn_assets}/image.png"); }`,
			vite_assets: ['image.png'],
			assets: cdn_assets,
			base: cdn_base
		},
		{
			name: 'works with case-insensitive URL function',
			css: 'div { background: uRl(./image.png); }',
			expected: `div { background: uRl(${cdn_assets}/image.png); }`,
			vite_assets: ['image.png'],
			assets: cdn_assets,
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
			name: 'handles backslashed quotes',
			css: "div { background: url('./image.png?\\''); }",
			expected: `div { background: url('${local_assets}/image.png?\\''); }`,
			vite_assets: ['image.png']
		}
	])(
		'$name',
		({
			css,
			expected,
			vite_assets = [],
			static_assets = [],
			assets = local_assets,
			base = local_base
		}) => {
			assert.equal(
				fix_css_urls({
					css,
					vite_assets: new Set(vite_assets),
					static_assets: new Set(static_assets),
					assets,
					base
				}),
				expected
			);
		}
	);
});
