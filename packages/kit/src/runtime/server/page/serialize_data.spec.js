import { test } from 'uvu';
import * as assert from 'uvu/assert';
import { serialize_data } from './serialize_data.js';

test('escapes slashes', () => {
	const response_body = '</script><script>alert("xss")';

	assert.equal(
		serialize_data(
			{
				url: 'foo',
				method: 'GET',
				request_body: null,
				response_body,
				response: new Response(response_body)
			},
			() => false
		),
		'<script type="application/json" data-sveltekit-fetched data-url="foo">' +
			'{"status":200,"statusText":"","headers":{},"body":"\\u003C/script>\\u003Cscript>alert(\\"xss\\")"}' +
			'</script>'
	);
});

test('escapes exclamation marks', () => {
	const response_body = '<!--</script>...-->alert("xss")';

	assert.equal(
		serialize_data(
			{
				url: 'foo',
				method: 'GET',
				request_body: null,
				response_body,
				response: new Response(response_body)
			},
			() => false
		),
		'<script type="application/json" data-sveltekit-fetched data-url="foo">' +
			'{"status":200,"statusText":"","headers":{},"body":"\\u003C!--\\u003C/script>...-->alert(\\"xss\\")"}' +
			'</script>'
	);
});

test('escapes the attribute values', () => {
	const raw = 'an "attr" & a \ud800';
	const escaped = 'an &quot;attr&quot; &amp; a &#55296;';
	const response_body = '';
	assert.equal(
		serialize_data(
			{
				url: raw,
				method: 'GET',
				request_body: null,
				response_body,
				response: new Response(response_body)
			},
			() => false
		),
		`<script type="application/json" data-sveltekit-fetched data-url="${escaped}">{"status":200,"statusText":"","headers":{},"body":\"\"}</script>`
	);
});

test.run();
