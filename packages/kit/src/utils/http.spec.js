import { assert, describe, test } from 'vitest';
import { matches_content_type, negotiate, prefers_html } from './http.js';

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

describe('prefers_html', () => {
	test('is true for a browser navigation', () => {
		const chrome =
			'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7';

		assert.isTrue(prefers_html(chrome));
		assert.isTrue(prefers_html('text/html'));
		assert.isTrue(prefers_html('text/*'));
	});

	test('is true when text/html ties with another type for the highest quality', () => {
		assert.isTrue(prefers_html('application/json, text/html'));
		assert.isTrue(prefers_html('text/vnd.turbo-stream.html, text/html, application/xhtml+xml'));
	});

	test('is false when another type is ranked above text/html', () => {
		// the default accept header of SimplePie-based feed readers such as FreshRSS
		const feed_reader =
			'application/atom+xml, application/rss+xml, application/rdf+xml;q=0.9, application/xml;q=0.8, text/xml;q=0.8, text/html;q=0.7, unknown/unknown;q=0.1, application/unknown;q=0.1, */*;q=0.1';

		assert.isFalse(prefers_html(feed_reader));
		assert.isFalse(prefers_html('application/json, text/html;q=0.9'));
		assert.isFalse(prefers_html('text/html;q=0.5, */*'));
	});

	test('is false when text/html is only accepted through a wildcard', () => {
		assert.isFalse(prefers_html('*/*'));
		assert.isFalse(prefers_html('application/json'));
		assert.isFalse(prefers_html(''));
	});
});
