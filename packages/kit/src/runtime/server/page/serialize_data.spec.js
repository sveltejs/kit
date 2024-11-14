import { assert, test } from 'vitest';
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
		`<script type="application/json" data-sveltekit-fetched data-url="${escaped}">{"status":200,"statusText":"","headers":{},"body":""}</script>`
	);
});

test('computes ttl using cache-control and age headers', () => {
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
				response: new Response(response_body, {
					headers: { 'cache-control': 'max-age=10', age: '1' }
				})
			},
			() => false
		),
		`<script type="application/json" data-sveltekit-fetched data-url="${escaped}" data-ttl="9">{"status":200,"statusText":"","headers":{},"body":""}</script>`
	);
});

test('doesnt compute ttl when vary * header is present', () => {
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
				response: new Response(response_body, {
					headers: { 'cache-control': 'max-age=10', vary: '*' }
				})
			},
			() => false
		),
		`<script type="application/json" data-sveltekit-fetched data-url="${escaped}">{"status":200,"statusText":"","headers":{},"body":""}</script>`
	);
});
