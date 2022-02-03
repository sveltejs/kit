import { test } from 'uvu';
import * as assert from 'uvu/assert';
import { to_headers } from './http.js';
import { Headers } from 'node-fetch';
globalThis.Headers = Headers;

function assert_headers_equal(actual, expected) {
	assert.equal(Array.from(actual.entries()), Array.from(expected.entries()));
}

test('handle header string value', () => {
	const headers = new Headers();
	headers.set('name', 'value');
	assert_headers_equal(to_headers({ name: 'value' }), headers);
});

test('handle header array values', () => {
	const headers = new Headers();
	headers.append('name', 'value1');
	headers.append('name', 'value2');
	assert_headers_equal(to_headers({ name: ['value1', 'value2'] }), headers);
});

test('handle header int value', () => {
	const headers = new Headers();
	headers.set('name', 123);
	assert_headers_equal(to_headers({ name: 123 }), headers);
});

test('handle header decimal value', () => {
	const headers = new Headers();
	headers.set('name', 123.456);
	assert_headers_equal(to_headers({ name: 123.456 }), headers);
});

test.run();
