import { test } from 'uvu';
import * as assert from 'uvu/assert';
import {
	validate_common_exports,
	validate_page_server_exports,
	validate_server_exports
} from './exports.js';

test('validates +layout.server.js, +layout.js, +page.js', () => {
	validate_common_exports({
		load: () => {}
	});

	validate_common_exports({
		_unknown: () => {}
	});

	assert.throws(() => {
		validate_common_exports({
			actions: {}
		});
	}, /Invalid export 'actions' \(valid exports are load, prerender, csr, ssr, trailingSlash, config, or anything with a '_' prefix\)/);
});

test('validates +page.server.js', () => {
	validate_page_server_exports({
		load: () => {},
		actions: {}
	});

	validate_page_server_exports({
		_unknown: () => {}
	});

	assert.throws(() => {
		validate_page_server_exports({
			answer: 42
		});
	}, /Invalid export 'answer' \(valid exports are load, prerender, csr, ssr, actions, trailingSlash, config, or anything with a '_' prefix\)/);
});

test('validates +server.js', () => {
	validate_server_exports({
		GET: () => {}
	});

	validate_server_exports({
		_unknown: () => {}
	});

	assert.throws(() => {
		validate_server_exports({
			answer: 42
		});
	}, /Invalid export 'answer' \(valid exports are GET, POST, PATCH, PUT, DELETE, OPTIONS, prerender, trailingSlash, config, or anything with a '_' prefix\)/);
});

test.run();
