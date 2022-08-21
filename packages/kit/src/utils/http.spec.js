import { test } from 'uvu';
import * as assert from 'uvu/assert';
import { negotiate } from './http.js';

test('handle valid accept header value', () => {
	const accept = 'text/html';
	assert.equal(negotiate(accept, ['text/html']), 'text/html');
});

test('handle invalid accept header value', () => {
	const accept = 'text/html,*';
	assert.equal(negotiate(accept, ['text/html']), 'text/html');
});

test.run();
