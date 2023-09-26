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
 * @param {string} message
 */
function check_error(fn, message) {
	let error;

	try {
		fn();
	} catch (e) {
		error = /** @type {Error} */ (e);
	}

	assert.equal(error?.message, message);
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

	check_error(() => {
		validate_layout_exports({
			answer: 42
		});
	}, "Invalid export 'answer' (valid exports are load, prerender, csr, ssr, trailingSlash, config, or anything with a '_' prefix)");

	check_error(() => {
		validate_layout_exports(
			{
				actions: {}
			},
			'src/routes/foo/+page.ts'
		);
	}, "Invalid export 'actions' in src/routes/foo/+page.ts ('actions' is a valid export in +page.server.ts)");

	check_error(() => {
		validate_layout_exports({
			GET: {}
		});
	}, "Invalid export 'GET' ('GET' is a valid export in +server.js)");
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

	check_error(() => {
		validate_page_exports({
			answer: 42
		});
	}, "Invalid export 'answer' (valid exports are load, prerender, csr, ssr, trailingSlash, config, entries, or anything with a '_' prefix)");

	check_error(() => {
		validate_page_exports(
			{
				actions: {}
			},
			'src/routes/foo/+page.ts'
		);
	}, "Invalid export 'actions' in src/routes/foo/+page.ts ('actions' is a valid export in +page.server.ts)");

	check_error(() => {
		validate_page_exports({
			GET: {}
		});
	}, "Invalid export 'GET' ('GET' is a valid export in +server.js)");
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

	check_error(() => {
		validate_layout_server_exports({
			answer: 42
		});
	}, "Invalid export 'answer' (valid exports are load, prerender, csr, ssr, trailingSlash, config, or anything with a '_' prefix)");

	check_error(() => {
		validate_layout_exports(
			{
				actions: {}
			},
			'src/routes/foo/+page.ts'
		);
	}, "Invalid export 'actions' in src/routes/foo/+page.ts ('actions' is a valid export in +page.server.ts)");

	check_error(() => {
		validate_layout_server_exports({
			POST: {}
		});
	}, "Invalid export 'POST' ('POST' is a valid export in +server.js)");
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

	check_error(() => {
		validate_page_server_exports({
			answer: 42
		});
	}, "Invalid export 'answer' (valid exports are load, prerender, csr, ssr, trailingSlash, config, actions, entries, or anything with a '_' prefix)");

	check_error(() => {
		validate_page_server_exports({
			POST: {}
		});
	}, "Invalid export 'POST' ('POST' is a valid export in +server.js)");
});

test('validates +server.js', () => {
	validate_server_exports({
		GET: () => {}
	});

	validate_server_exports({
		_unknown: () => {}
	});

	check_error(() => {
		validate_server_exports({
			answer: 42
		});
	}, "Invalid export 'answer' (valid exports are GET, POST, PATCH, PUT, DELETE, OPTIONS, HEAD, fallback, prerender, trailingSlash, config, entries, or anything with a '_' prefix)");

	check_error(() => {
		validate_server_exports({
			csr: false
		});
	}, "Invalid export 'csr' ('csr' is a valid export in +layout.js, +page.js, +layout.server.js or +page.server.js)");
});
