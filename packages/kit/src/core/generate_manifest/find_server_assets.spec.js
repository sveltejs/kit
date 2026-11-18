import { expect, test } from 'vitest';
import { find_server_assets } from './find_server_assets.js';

/**
 * @param {Partial<import('types').ManifestData>} manifest_data
 * @param {import('vite').Manifest} server_manifest
 * @returns {import('types').BuildData}
 */
function create_build_data(manifest_data, server_manifest) {
	return /** @type {import('types').BuildData} */ ({
		manifest_data: {
			assets: [],
			hooks: { client: null, server: null, universal: null },
			nodes: [],
			routes: [],
			params: null,
			...manifest_data
		},
		server_manifest
	});
}

/** @type {import('types').RouteData} */
const endpoint_route = {
	id: '/api',
	parent: null,
	segment: 'api',
	pattern: /^\/api\/?$/,
	params: [],
	layout: null,
	error: null,
	leaf: null,
	page: null,
	endpoint: { file: 'src/routes/api/+server.js', page_options: null }
};

test('includes assets imported by dynamically imported modules', () => {
	const build_data = create_build_data(
		{ routes: [endpoint_route] },
		{
			'src/routes/api/+server.js': {
				file: 'entries/endpoints/api/_server.js',
				isEntry: true,
				assets: ['_app/immutable/assets/static.txt'],
				dynamicImports: ['src/routes/api/lazy.js']
			},
			'src/routes/api/lazy.js': {
				file: 'chunks/lazy.js',
				isDynamicEntry: true,
				imports: ['_shared.js'],
				dynamicImports: ['src/routes/api/lazier.js']
			},
			'_shared.js': {
				file: 'chunks/shared.js',
				assets: ['_app/immutable/assets/shared.txt']
			},
			'src/routes/api/lazier.js': {
				file: 'chunks/lazier.js',
				isDynamicEntry: true,
				assets: ['_app/immutable/assets/lazier.txt']
			}
		}
	);

	expect(find_server_assets(build_data, [endpoint_route], [], '.').sort()).toEqual([
		'_app/immutable/assets/lazier.txt',
		'_app/immutable/assets/shared.txt',
		'_app/immutable/assets/static.txt'
	]);
});

test('includes assets imported by remote functions', () => {
	const build_data = create_build_data(
		{},
		{
			'sveltekit-remote:abc123': {
				file: 'chunks/remote-abc123.js',
				src: 'sveltekit-remote:abc123',
				isEntry: true,
				imports: ['_data.remote.js']
			},
			'_data.remote.js': {
				file: 'chunks/data.remote.js',
				assets: ['_app/immutable/assets/remote.txt']
			}
		}
	);

	expect(
		find_server_assets(build_data, [], [{ hash: 'abc123', file: 'src/routes/data.remote.js' }], '.')
	).toEqual(['_app/immutable/assets/remote.txt']);
});

test('includes assets imported by param matchers', () => {
	const build_data = create_build_data(
		{ params: 'src/params.js' },
		{
			'src/params.js': {
				file: 'entries/params.js',
				isEntry: true,
				assets: ['_app/immutable/assets/params.txt']
			}
		}
	);

	expect(find_server_assets(build_data, [], [], '.')).toEqual(['_app/immutable/assets/params.txt']);
});
