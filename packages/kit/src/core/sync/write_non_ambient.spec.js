import { expect, test } from 'vitest';
import { validate_config } from '../config/index.js';
import { generate_app_types } from './write_non_ambient.js';

/**
 * @param {string} id
 * @param {import('types').TrailingSlash} trailingSlash
 */
const page = (id, trailingSlash) => ({
	id,
	params: [],
	leaf: { page_options: { trailingSlash } },
	endpoint: null
});

/**
 * @param {ReturnType<typeof page>[]} routes
 * @param {import('@sveltejs/kit').Config} [config]
 */
const generate = (routes, config = {}) =>
	generate_app_types(
		/** @type {import('types').ManifestData} */ (/** @type {unknown} */ ({ assets: [], routes })),
		validate_config(config).kit
	);

/**
 * @param {string} output
 * @param {string} name
 */
const declaration = (output, name) =>
	output.split('\n').find((line) => line.startsWith(`\t\t${name}():`));

test('generates paths with the configured trailing slash', () => {
	for (const trailingSlash of /** @type {const} */ (['always', 'ignore'])) {
		const output = generate([page('/', trailingSlash)]);

		expect(declaration(output, 'Path')).toBe('\t\tPath(): "";');
		expect(declaration(output, 'ResolvedPathname')).toBe(
			'\t\tResolvedPathname(): `${"/"}${ReturnType<AppTypes[\'Path\']>}`;'
		);
	}

	expect(declaration(generate([page('/about', 'always')]), 'Path')).toBe('\t\tPath(): "about/";');
});

test('generates resolved pathnames with the configured base path', () => {
	const output = generate([], { kit: { paths: { base: '/path-base' } } });

	expect(declaration(output, 'ResolvedPathname')).toBe(
		'\t\tResolvedPathname(): `${"/path-base/"}${ReturnType<AppTypes[\'Path\']>}`;'
	);
});
