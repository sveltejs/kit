import { assert, test } from 'vitest';
import { serialize_data, sort_fetched } from './serialize_data.js';

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

test("doesn't compute ttl when vary * header is present", () => {
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

/**
 * @param {string} url
 * @param {string} response_body
 * @param {string} [request_body]
 * @returns {import('./types.js').Fetched}
 */
function create_fetched(url, response_body, request_body) {
	return { url, method: 'GET', request_body, response_body, response: new Response(response_body) };
}

/** @param {import('./types.js').Fetched[]} fetched */
const sorted_bodies = (fetched) => sort_fetched(fetched).map((item) => item.response_body);

test('sorts responses the same way whichever was read first', () => {
	const a = create_fetched('/a', 'a');
	const b = create_fetched('/b', 'b');
	const x = create_fetched('/graphql', 'x', 'query x');
	const y = create_fetched('/graphql', 'y', 'query y');

	const expected = sorted_bodies([a, b, x, y]);

	assert.deepEqual(sorted_bodies([y, x, b, a]), expected);
	assert.deepEqual(sorted_bodies([b, y, a, x]), expected);
});

test('sorts by request headers when the url is the same', () => {
	const headers = (/** @type {string} */ accept) => ({
		...create_fetched('/a', accept),
		request_headers: { accept }
	});
	const json = headers('application/json');
	const text = headers('text/plain');

	assert.deepEqual(sorted_bodies([json, text]), sorted_bodies([text, json]));
});

test('keeps responses to the same request in the order they were read', () => {
	const first = create_fetched('/a', 'first');
	const second = create_fetched('/a', 'second');

	assert.deepEqual(sorted_bodies([first, second]), ['first', 'second']);
	assert.deepEqual(sorted_bodies([second, first]), ['second', 'first']);
});

test('does not reorder the responses it was given', () => {
	const fetched = [create_fetched('/b', 'b'), create_fetched('/a', 'a')];

	sort_fetched(fetched);

	assert.deepEqual(
		fetched.map((item) => item.url),
		['/b', '/a']
	);
});
