import { test } from 'uvu';
import * as assert from 'uvu/assert';
import { serialize_data } from './serialize_data.js';

test('escapes slashes', () => {
	assert.equal(
		serialize_data({
			url: 'foo',
			body: null,
			response: {
				status: 200,
				statusText: 'OK',
				headers: {},
				body: '</script><script>alert("xss")'
			}
		}),
		'<script type="application/json" data-sveltekit-fetched data-url="foo">' +
			'{"status":200,"statusText":"OK","headers":{},"body":"\\u003C/script>\\u003Cscript>alert(\\"xss\\")"}' +
			'</script>'
	);
});

test('escapes exclamation marks', () => {
	assert.equal(
		serialize_data({
			url: 'foo',
			body: null,
			response: {
				status: 200,
				statusText: 'OK',
				headers: {},
				body: '<!--</script>...-->alert("xss")'
			}
		}),
		'<script type="application/json" data-sveltekit-fetched data-url="foo">' +
			'{"status":200,"statusText":"OK","headers":{},"body":"\\u003C!--\\u003C/script>...-->alert(\\"xss\\")"}' +
			'</script>'
	);
});

test('escapes the attribute values', () => {
	const raw = 'an "attr" & a \ud800';
	const escaped = 'an &quot;attr&quot; &amp; a &#55296;';
	assert.equal(
		serialize_data({
			url: raw,
			body: null,
			response: {
				status: 200,
				statusText: 'OK',
				headers: {},
				body: ''
			}
		}),
		`<script type="application/json" data-sveltekit-fetched data-url="${escaped}">{"status":200,"statusText":"OK","headers":{},"body":\"\"}</script>`
	);
});

test.run();
