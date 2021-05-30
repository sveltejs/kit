import { test } from 'uvu';
import * as assert from 'uvu/assert';
import { parse_body } from './index.js';

/**
 * @param {import('types/helper').Headers} headers
 * @return {import('types/hooks').Incoming}
 */
function buildRequest(headers) {
	return {
		host: 'localhost',
		path: '/',
		query: new URLSearchParams(),
		method: 'GET',
		rawBody: JSON.stringify('the body'),
		headers
	};
}

test('parses a body with a lowercase content-type', () => {
	const req = buildRequest({ 'content-type': 'application/json' });
	assert.equal(parse_body(req), 'the body');
});

test('parses a body with a non-lowercase content-type', () => {
	const req = buildRequest({ 'Content-Type': 'application/json' });
	assert.equal(parse_body(req), 'the body');
});

test.run();
