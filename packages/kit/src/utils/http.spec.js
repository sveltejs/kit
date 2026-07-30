import { assert, test } from 'vitest';
import { get_set_cookies, negotiate } from './http.js';

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

test('get_set_cookies returns each set-cookie header separately', () => {
	const headers = new Headers();
	headers.append('set-cookie', 'session=abc123; Path=/; HttpOnly');
	headers.append('set-cookie', 'csrf=xyz789; Path=/; SameSite=Strict');
	headers.append('set-cookie', 'locale=en; Path=/');

	assert.deepEqual(get_set_cookies(headers), [
		'session=abc123; Path=/; HttpOnly',
		'csrf=xyz789; Path=/; SameSite=Strict',
		'locale=en; Path=/'
	]);
});

test('get_set_cookies returns an empty array when there are no cookies', () => {
	assert.deepEqual(get_set_cookies(new Headers()), []);
});
