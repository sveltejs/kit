import { test } from 'uvu';
import * as assert from 'uvu/assert';
import {
	validate_common_exports,
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

test('validates +layout.server.js, +layout.js, +page.js', () => {
	validate_common_exports({
		load: () => {}
	});

	validate_common_exports({
		_unknown: () => {}
	});

	check_error(() => {
		validate_common_exports({
			answer: 42
		});
	}, `Invalid export 'answer' (valid exports are load, prerender, csr, ssr, trailingSlash, config, or anything with a '_' prefix)`);

	check_error(() => {
		validate_common_exports(
			{
				actions: {}
			},
			'src/routes/foo/+page.ts'
		);
	}, `Invalid export 'actions' in src/routes/foo/+page.ts ('actions' is a valid export in +page.server.ts)`);

	check_error(() => {
		validate_common_exports({
			GET: {}
		});
	}, `Invalid export 'GET' ('GET' is a valid export in +server.js)`);
});

test('validates +page.server.js', () => {
	validate_page_server_exports({
		load: () => {},
		actions: {}
	});

	validate_page_server_exports({
		_unknown: () => {}
	});

	check_error(() => {
		validate_page_server_exports({
			answer: 42
		});
	}, `Invalid export 'answer' (valid exports are load, prerender, csr, ssr, actions, trailingSlash, config, or anything with a '_' prefix)`);

	check_error(() => {
		validate_page_server_exports({
			POST: {}
		});
	}, `Invalid export 'POST' ('POST' is a valid export in +server.js)`);
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
	}, `Invalid export 'answer' (valid exports are GET, POST, PATCH, PUT, DELETE, OPTIONS, prerender, trailingSlash, config, or anything with a '_' prefix)`);

	check_error(() => {
		validate_server_exports({
			csr: false
		});
	}, `Invalid export 'csr' ('csr' is a valid export in +page.js or +page.server.js)`);
});

test.run();
