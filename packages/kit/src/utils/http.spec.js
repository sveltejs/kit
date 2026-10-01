import { assert, test } from 'vitest';
import { matches_content_type, negotiate } from './http.js';

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

test('matches content types regardless of parameters and casing', () => {
	assert.isTrue(matches_content_type('text/html; charset=utf-8', 'text/html'));
	assert.isTrue(matches_content_type('TEXT/HTML ; charset=UTF-8', 'text/html'));
	assert.isFalse(matches_content_type('text/html', 'text/plain'));
});

test('ignores an accept segment with no slash without catastrophic backtracking', () => {
	assert.equal(negotiate('a'.repeat(200_000), ['text/html']), undefined);
}, 100);
