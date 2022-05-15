import { test } from 'uvu';
import * as assert from 'uvu/assert';
import { to_headers } from './http.js';
import { Headers } from 'node-fetch';
globalThis.Headers = Headers;

test('handle header string value', () => {
	const headers = to_headers({ name: 'value' });
	assert.equal(headers.get('name'), 'value');
});

test('handle header array values', () => {
	const headers = to_headers({ name: ['value1', 'value2'] });
	assert.equal(headers.get('name'), 'value1, value2');
});

test('handle header int value', () => {
	const headers = to_headers({ name: 123 });
	assert.equal(headers.get('name'), '123');
});

test('handle header decimal value', () => {
	const headers = to_headers({ name: 123.456 });
	assert.equal(headers.get('name'), '123.456');
});

test.run();
