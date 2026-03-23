import { assert, describe, test } from 'vitest';
import { create_function_as_string } from './utils.js';
import { fix_css_urls } from '../../../utils/css.js';
import { escape_for_interpolation } from '../../../utils/escape.js';

describe('dynamic URL paths in CSS', () => {
	const assets_path = './_app/immutable/assets';
	const base_path = '.';

	test.each([
		{
			name: 'escapes backslashes',
			input: "div:after { content: '\\s'; } div { background: url(./image.png); }",
			expected:
				"div:after { content: '\\s'; } div { background: url(./_app/immutable/assets/image.png); }"
		},
		{
			name: 'escapes backticks',
			input: '.prose :where(code)::before { content: "`"; } div { background: url(./image.png); }',
			expected:
				'.prose :where(code)::before { content: "`"; } div { background: url(./_app/immutable/assets/image.png); }'
		},
		{
			name: 'escapes dollar expressions',
			input: 'div { content: "${not_a_placeholder}"; } div { background: url(./image.png); }',
			expected:
				'div { content: "${not_a_placeholder}"; } div { background: url(./_app/immutable/assets/image.png); }'
		},
		{
			name: 'does not escape injected placeholder expressions',
			input: '.prose code::before { content: "`"; } .bg { background: url(./image.png); }',
			expected:
				'.prose code::before { content: "`"; } .bg { background: url(./_app/immutable/assets/image.png); }'
		}
	])('$name', ({ input, expected }) => {
		const transformed_css = fix_css_urls({
			css: input,
			vite_assets: new Set(['image.png']),
			static_assets: new Set(['image_2.png']),
			paths_assets: '__SVELTEKIT_ASSETS__',
			base: '__SVELTEKIT_BASE__',
			static_asset_prefix: '../../../'
		});
		const escaped = escape_for_interpolation(transformed_css, [
			{
				placeholder: '__SVELTEKIT_ASSETS__',
				replacement: '${assets}'
			},
			{
				placeholder: '__SVELTEKIT_BASE__',
				replacement: '${base}'
			}
		]);
		const code = create_function_as_string('css', ['assets', 'base'], escaped);
		const output = eval(`(${code})('${assets_path}', '${base_path}')`);
		assert.equal(output, expected);
	});
});
