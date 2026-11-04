import { expect, test } from 'vitest';
import {
	validate_layout_exports,
	validate_layout_server_exports,
	validate_page_exports,
	validate_page_server_exports,
	validate_server_exports
} from './exports.js';

const layout_exports = {
	load: () => {},
	prerender: false,
	csr: false,
	ssr: false,
	trailingSlash: false,
	config: {}
};

const layout_names = 'load, prerender, csr, ssr, trailingSlash, config';

const validators = {
	'+layout.js': validate_layout_exports,
	'+page.js': validate_page_exports,
	'+layout.server.js': validate_layout_server_exports,
	'+page.server.js': validate_page_server_exports,
	'+server.js': validate_server_exports
};

/** @typedef {keyof typeof validators} RouteFile */

test.each(
	/** @type {Array<{ route_file: RouteFile, module: Record<string, any> }>} */ ([
		{ route_file: '+layout.js', module: layout_exports },
		{ route_file: '+page.js', module: { ...layout_exports, entries: () => {} } },
		{ route_file: '+layout.server.js', module: layout_exports },
		{
			route_file: '+page.server.js',
			module: { ...layout_exports, actions: {}, entries: () => {} }
		},
		{ route_file: '+server.js', module: { GET: () => {}, QUERY: () => {} } }
	])
)('$route_file accepts its exports, and anything with a _ prefix', ({ route_file, module }) => {
	const validate = validators[route_file];

	expect(() => validate(module)).not.toThrow();
	expect(() => validate({ _unknown: () => {} })).not.toThrow();
});

// unknown exports list the valid ones
test.each(
	/** @type {Array<{ route_file: RouteFile, exports: string }>} */ ([
		{ route_file: '+layout.js', exports: layout_names },
		{ route_file: '+page.js', exports: `${layout_names}, entries` },
		{ route_file: '+layout.server.js', exports: layout_names },
		{ route_file: '+page.server.js', exports: `${layout_names}, actions, entries` },
		{
			route_file: '+server.js',
			exports:
				'GET, POST, PATCH, PUT, DELETE, OPTIONS, HEAD, QUERY, fallback, prerender, trailingSlash, config, entries'
		}
	])
)('$route_file rejects an unknown export', ({ route_file, exports }) => {
	expect(() => validators[route_file]({ answer: 42 })).toThrowKitError('invalid_export', {
		contains: ['`answer`', exports]
	});
});

// exports that are valid in other route files list those files, using the extension of the file
test.each(
	/** @type {Array<{ route_file: RouteFile, key: string, file?: string, locations: string }>} */ ([
		{
			route_file: '+layout.js',
			key: 'actions',
			file: 'src/routes/foo/+page.ts',
			locations: '+page.server.ts'
		},
		{ route_file: '+layout.js', key: 'GET', locations: '+server.js' },
		{
			route_file: '+page.js',
			key: 'actions',
			file: 'src/routes/foo/+page.ts',
			locations: '+page.server.ts'
		},
		{ route_file: '+page.js', key: 'GET', locations: '+server.js' },
		{ route_file: '+layout.server.js', key: 'POST', locations: '+server.js' },
		{ route_file: '+page.server.js', key: 'POST', locations: '+server.js' },
		{
			route_file: '+server.js',
			key: 'csr',
			locations: '+layout.js, +page.js, +layout.server.js or +page.server.js'
		}
	])
)('$route_file rejects $key, which is valid elsewhere', ({ route_file, key, file, locations }) => {
	expect(() => validators[route_file]({ [key]: {} }, file)).toThrowKitError(
		'invalid_export_location',
		{ contains: [`\`${key}\``, locations, ...(file ? [file] : [])] }
	);
});
