import { expect, test } from 'vitest';
import { validate_config } from '../config/index.js';
import { generate_app_types } from './write_non_ambient.js';

/**
 * @param {string} output
 * @param {string} declaration
 */
const find_line = (output, declaration) =>
	output.split('\n').find((line) => line.includes(declaration));

test('generates paths with the configured trailing slash', () => {
	const { kit } = validate_config({});

	for (const trailingSlash of /** @type {const} */ (['always', 'ignore'])) {
		const output = generate_app_types(
			/** @type {import('types').ManifestData} */ (
				/** @type {unknown} */ ({
					assets: [],
					routes: [
						{
							id: '/',
							params: [],
							leaf: { page_options: { trailingSlash } },
							endpoint: null
						}
					]
				})
			),
			kit
		);

		expect(find_line(output, '\tPath():')).toBe('\t\tPath(): "";');
		expect(find_line(output, '\tResolvedPathname():')).toBe(
			'\t\tResolvedPathname(): `${"/"}${ReturnType<AppTypes[\'Path\']>}`;'
		);
	}

	const output = generate_app_types(
		/** @type {import('types').ManifestData} */ (
			/** @type {unknown} */ ({
				assets: [],
				routes: [
					{
						id: '/about',
						params: [],
						leaf: { page_options: { trailingSlash: 'always' } },
						endpoint: null
					}
				]
			})
		),
		kit
	);

	expect(find_line(output, '\tPath():')).toBe('\t\tPath(): "about/";');
});

test('generates resolved pathnames with the configured base path', () => {
	const { kit } = validate_config({ kit: { paths: { base: '/path-base' } } });
	const output = generate_app_types(
		/** @type {import('types').ManifestData} */ (
			/** @type {unknown} */ ({ assets: [], routes: [] })
		),
		kit
	);

	expect(find_line(output, '\tResolvedPathname():')).toBe(
		'\t\tResolvedPathname(): `${"/path-base/"}${ReturnType<AppTypes[\'Path\']>}`;'
	);
});
