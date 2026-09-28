import { assert, test } from 'vitest';
import {
	validate_layout_exports,
	validate_layout_server_exports,
	validate_page_exports,
	validate_page_server_exports,
	validate_server_exports
} from './exports.js';

/**
 * @param {() => void} fn
 * @param {string} code
 * @param {string} message
 */
function check_error(fn, code, message) {
	let error;

	try {
		fn();
	} catch (e) {
		error = /** @type {Error} */ (e);
	}

	assert.equal(error?.name, 'SvelteKit error');
	assert.equal(
		error?.message,
		`${code}\n${message}\nhttps://next.svelte.dev/e/@sveltejs/kit/${code}`
	);
}

test('validates +layout.js', () => {
	validate_layout_exports({
		load: () => {},
		prerender: false,
		csr: false,
		ssr: false,
		trailingSlash: false,
		config: {}
	});

	validate_layout_exports({
		_unknown: () => {}
	});

	check_error(
		() => {
			validate_layout_exports({
				answer: 42
			});
		},
		'invalid_export',
		"Invalid export `answer` (valid exports are load, prerender, csr, ssr, trailingSlash, config, or anything with a `'_'` prefix)"
	);

	check_error(
		() => {
			validate_layout_exports(
				{
					actions: {}
				},
				'src/routes/foo/+page.ts'
			);
		},
		'invalid_export_location',
		'Invalid export `actions` in `src/routes/foo/+page.ts` (`actions` is a valid export in +page.server.ts)'
	);

	check_error(
		() => {
			validate_layout_exports({
				GET: {}
			});
		},
		'invalid_export_location',
		'Invalid export `GET` (`GET` is a valid export in +server.js)'
	);
});

test('validates +page.js', () => {
	validate_page_exports({
		load: () => {},
		prerender: false,
		csr: false,
		ssr: false,
		trailingSlash: false,
		config: {},
		entries: () => {}
	});

	validate_page_exports({
		_unknown: () => {}
	});

	check_error(
		() => {
			validate_page_exports({
				answer: 42
			});
		},
		'invalid_export',
		"Invalid export `answer` (valid exports are load, prerender, csr, ssr, trailingSlash, config, entries, or anything with a `'_'` prefix)"
	);

	check_error(
		() => {
			validate_page_exports(
				{
					actions: {}
				},
				'src/routes/foo/+page.ts'
			);
		},
		'invalid_export_location',
		'Invalid export `actions` in `src/routes/foo/+page.ts` (`actions` is a valid export in +page.server.ts)'
	);

	check_error(
		() => {
			validate_page_exports({
				GET: {}
			});
		},
		'invalid_export_location',
		'Invalid export `GET` (`GET` is a valid export in +server.js)'
	);
});

test('validates +layout.server.js', () => {
	validate_layout_server_exports({
		load: () => {},
		prerender: false,
		csr: false,
		ssr: false,
		trailingSlash: false,
		config: {}
	});

	validate_layout_server_exports({
		_unknown: () => {}
	});

	check_error(
		() => {
			validate_layout_server_exports({
				answer: 42
			});
		},
		'invalid_export',
		"Invalid export `answer` (valid exports are load, prerender, csr, ssr, trailingSlash, config, or anything with a `'_'` prefix)"
	);

	check_error(
		() => {
			validate_layout_exports(
				{
					actions: {}
				},
				'src/routes/foo/+page.ts'
			);
		},
		'invalid_export_location',
		'Invalid export `actions` in `src/routes/foo/+page.ts` (`actions` is a valid export in +page.server.ts)'
	);

	check_error(
		() => {
			validate_layout_server_exports({
				POST: {}
			});
		},
		'invalid_export_location',
		'Invalid export `POST` (`POST` is a valid export in +server.js)'
	);
});

test('validates +page.server.js', () => {
	validate_page_server_exports({
		load: () => {},
		prerender: false,
		csr: false,
		ssr: false,
		trailingSlash: false,
		config: {},
		actions: {},
		entries: () => {}
	});

	validate_page_server_exports({
		_unknown: () => {}
	});

	check_error(
		() => {
			validate_page_server_exports({
				answer: 42
			});
		},
		'invalid_export',
		"Invalid export `answer` (valid exports are load, prerender, csr, ssr, trailingSlash, config, actions, entries, or anything with a `'_'` prefix)"
	);

	check_error(
		() => {
			validate_page_server_exports({
				POST: {}
			});
		},
		'invalid_export_location',
		'Invalid export `POST` (`POST` is a valid export in +server.js)'
	);
});

test('validates +server.js', () => {
	validate_server_exports({
		GET: () => {}
	});

	validate_server_exports({
		QUERY: () => {}
	});

	validate_server_exports({
		_unknown: () => {}
	});

	check_error(
		() => {
			validate_server_exports({
				answer: 42
			});
		},
		'invalid_export',
		"Invalid export `answer` (valid exports are GET, POST, PATCH, PUT, DELETE, OPTIONS, HEAD, QUERY, fallback, prerender, trailingSlash, config, entries, or anything with a `'_'` prefix)"
	);

	check_error(
		() => {
			validate_server_exports({
				csr: false
			});
		},
		'invalid_export_location',
		'Invalid export `csr` (`csr` is a valid export in +layout.js, +page.js, +layout.server.js or +page.server.js)'
	);
});
