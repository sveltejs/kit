import { assert, test } from 'vitest';
import { negotiate } from './http.js';

test('handle valid accept header value', () => {
	const accept = 'text/html';
	assert.equal(negotiate(accept, ['text/html']), 'text/html');
});

test('handle accept values with optional whitespace', () => {
	// according to RFC 9110, OWS (optional whitespace, aka a space or horizontal tab)
	// can occur before/after the `,` and the `;`.
	const accept = 'application/some-thing-else, \tapplication/json \t; q=0.9  ,text/plain;q=0.1';
	assert.equal(negotiate(accept, ['application/json', 'text/plain']), 'application/json');
});

test('handle invalid accept header value', () => {
	const accept = 'text/html,*';
	assert.equal(negotiate(accept, ['text/html']), 'text/html');
});
