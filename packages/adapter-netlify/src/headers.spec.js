import './shims.js';
import { test } from 'uvu';
import * as assert from 'uvu/assert';
import { split_headers } from './headers.js';

test('empty headers', () => {
	const headers = new Headers();

	const result = split_headers(headers);

	assert.equal(result, {
		headers: {},
		multiValueHeaders: {}
	});
});

test('single-value headers', () => {
	const headers = new Headers();
	headers.append('Location', '/apple');
	headers.append('Content-Type', 'application/json');

	const result = split_headers(headers);

	assert.equal(result, {
		headers: {
			// Note: becomes lowercase even if specified as uppercase
			location: '/apple',
			'content-type': 'application/json'
		},
		multiValueHeaders: {}
	});
});

test('multi-value headers', () => {
	// https://httpwg.org/specs/rfc7231.html#http.date
	const wednesday = 'Wed, 23 Feb 2022 21:01:48 GMT';
	const thursday = 'Thu, 24 Feb 2022 21:01:48 GMT';

	const headers = new Headers();
	headers.append('Set-Cookie', `flavor=sugar; Expires=${wednesday}`);
	headers.append('Set-Cookie', `diameter=6cm; Expires=${thursday}`);

	const result = split_headers(headers);

	// it splits at actual cookie boundaries, not the commas in the dates
	assert.equal(result, {
		headers: {},
		multiValueHeaders: {
			'set-cookie': [`flavor=sugar; Expires=${wednesday}`, `diameter=6cm; Expires=${thursday}`]
		}
	});
});

test.run();
