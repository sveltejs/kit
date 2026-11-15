import { assert, describe, test } from 'vitest';
import { create_function_as_string, find_deps, generate_placeholder } from './utils.js';
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
		},
		{
			name: 'does not modify user content',
			input:
				'.prose code::before { content: "__SVELTEKIT_ASSETS_r76awaqeqbk0__"; } .bg { background: url(./image.png); }',
			expected:
				'.prose code::before { content: "__SVELTEKIT_ASSETS_r76awaqeqbk0__"; } .bg { background: url(./_app/immutable/assets/image.png); }'
		}
	])('$name', ({ input, expected }) => {
		const assets_placeholder = generate_placeholder(input, 'ASSETS');
		const base_placeholder = generate_placeholder(input, 'BASE');

		const transformed_css = fix_css_urls({
			css: input,
			vite_assets: new Set(['image.png']),
			static_assets: new Set(['image_2.png']),
			paths_assets: assets_placeholder,
			base: base_placeholder,
			static_asset_prefix: '../../../'
		});

		const escaped = escape_for_interpolation(transformed_css, [
			{
				placeholder: assets_placeholder,
				replacement: '${assets}'
			},
			{
				placeholder: base_placeholder,
				replacement: '${base}'
			}
		]);

		const code = create_function_as_string('css', ['assets', 'base'], escaped);

		const output = eval(`(${code})('${assets_path}', '${base_path}')`);
		assert.equal(output, expected);
	});
});

describe('find_deps', () => {
	test('includes static imports of a chunk first reached through a dynamic import', () => {
		/** @type {import('vite').Manifest} */
		const manifest = {
			'entry.js': { file: 'entry.js', isEntry: true, imports: ['_a.js', '_b.js'] },
			'_a.js': { file: 'a.js', dynamicImports: ['_c.js'] },
			'_b.js': { file: 'b.js', imports: ['_c.js'] },
			'_c.js': { file: 'c.js', imports: ['_d.js'] },
			'_d.js': { file: 'd.js', css: ['d.css'] }
		};

		const { imports, stylesheet_map } = find_deps(manifest, 'entry.js', true, '.');

		assert.deepEqual(imports.sort(), ['a.js', 'b.js', 'c.js', 'd.js', 'entry.js']);
		assert.deepEqual(Array.from(stylesheet_map.get('entry.js')?.css ?? []), ['d.css']);
		assert.deepEqual(Array.from(stylesheet_map.get('_c.js')?.css ?? []), ['d.css']);
	});

	test('does not include chunks that are only imported dynamically', () => {
		/** @type {import('vite').Manifest} */
		const manifest = {
			'entry.js': { file: 'entry.js', isEntry: true, imports: ['_a.js'] },
			'_a.js': { file: 'a.js', dynamicImports: ['_c.js'] },
			'_c.js': { file: 'c.js', imports: ['_d.js'] },
			'_d.js': { file: 'd.js', css: ['d.css'] }
		};

		const { imports, stylesheets, stylesheet_map } = find_deps(manifest, 'entry.js', true, '.');

		assert.deepEqual(imports.sort(), ['a.js', 'entry.js']);
		assert.deepEqual(stylesheets, ['d.css']);
		assert.deepEqual(Array.from(stylesheet_map.get('_c.js')?.css ?? []), ['d.css']);
		assert.isFalse(stylesheet_map.has('entry.js'));
	});
});
