import * as fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { assert, expect, test } from 'vitest';
import { replace_hydration_attrs } from '../../test-utils';

const build = fileURLToPath(new URL('../build', import.meta.url));

/** @param {string} file */
const read = (file, encoding = 'utf-8') => fs.readFileSync(`${build}/${file}`, encoding);

test('prerenders /', () => {
	const content = read('index.html');
	expect(content).toMatch('<h1>hello</h1>');
});

test('renders a redirect', () => {
	const content = read('redirect.html');
	assert.equal(
		content,
		'<script>location.href="https://example.com/redirected";</script><meta http-equiv="refresh" content="0;url=https://example.com/redirected">'
	);
});

test('renders a server-side redirect', () => {
	const html = read('redirect-server.html');
	assert.equal(
		html,
		'<script>location.href="https://example.com/redirected";</script><meta http-equiv="refresh" content="0;url=https://example.com/redirected">'
	);

	const data = JSON.parse(read('redirect-server/__data.json'));

	expect(data).toEqual({
		type: 'redirect',
		location: 'https://example.com/redirected'
	});
});

test('does not double-encode redirect locations', () => {
	const content = read('redirect-encoded.html');
	assert.equal(
		content,
		'<script>location.href="https://example.com/redirected?returnTo=%2Ffoo%3Fbar%3Dbaz";</script><meta http-equiv="refresh" content="0;url=https://example.com/redirected?returnTo=%2Ffoo%3Fbar%3Dbaz">'
	);
});

test('escapes characters in redirect', () => {
	const content = read('redirect-malicious.html');
	assert.equal(
		content,
		'<script>location.href="https://example.com/\\u003C/script>alert(\\"pwned\\")";</script><meta http-equiv="refresh" content="0;url=https://example.com/</script>alert(&quot;pwned&quot;)">'
	);
});

test('renders a relative redirect', () => {
	const content = read('redirect-relative.html');
	assert.equal(
		content,
		'<script>location.href="/env";</script><meta http-equiv="refresh" content="0;url=/env">'
	);
});

test('inserts http-equiv tag for cache-control headers', () => {
	const content = read('max-age.html');
	expect(content).toMatch('<meta http-equiv="cache-control" content="max-age=300">');
});

test('renders page with data from endpoint', () => {
	const content = read('fetch-endpoint/buffered.html');
	expect(content).toMatch('<h1>the answer is 42</h1>');

	const json = read('fetch-endpoint/buffered.json');
	assert.equal(json, JSON.stringify({ answer: 42 }));
});

test('renders page with unbuffered data from endpoint', () => {
	const content = read('fetch-endpoint/not-buffered.html');
	expect(content).toMatch('<h1>content-type: application/json</h1>');

	const json = read('fetch-endpoint/not-buffered.json');
	assert.equal(json, JSON.stringify({ answer: 42 }));
});

test('loads a file with spaces in the filename', () => {
	const content = read('load-file-with-spaces.html');
	expect(content).toMatch('<h1>answer: 42</h1>');
});

test('generates __data.json file for shadow endpoints', () => {
	let data = JSON.parse(read('__data.json'));
	expect(data).toEqual({
		type: 'data',
		nodes: [
			null,
			{
				type: 'data',
				data: [{ message: 1 }, 'hello'],
				uses: {}
			}
		]
	});

	data = JSON.parse(read('shadowed-get/__data.json'));
	expect(data).toEqual({
		type: 'data',
		nodes: [
			null,
			{
				type: 'data',
				data: [{ answer: 1 }, 42],
				uses: {}
			}
		]
	});
});

test('generates __data.json file for shadow endpoints with ssr turned off', () => {
	const data = JSON.parse(read('shadowed-get/ssr-off/__data.json'));
	expect(data).toEqual({
		type: 'data',
		nodes: [
			null,
			{
				type: 'data',
				data: [{ answer: 1 }, 42],
				uses: {}
			}
		]
	});
});

test('does not prerender page with shadow endpoint with non-load handler', () => {
	assert.isFalse(fs.existsSync(`${build}/shadowed-post.html`));
	assert.isFalse(fs.existsSync(`${build}/shadowed-post/__data.json`));
});

test('decodes paths when writing files', () => {
	let content = read('encoding/path with spaces.html');
	expect(content).toMatch('<p id="a">path with spaces</p>');
	expect(content).toMatch('<p id="b">path with encoded spaces</p>');

	content = read('encoding/dynamic path with spaces.html');
	expect(content).toMatch(
		'<h1>dynamic path with spaces / /encoding/dynamic%20path%20with%20spaces</h1>'
	);

	content = read('encoding/dynamic path with encoded spaces.html');
	expect(content).toMatch(
		'<h1>dynamic path with encoded spaces / /encoding/dynamic%20path%20with%20encoded%20spaces</h1>'
	);

	content = read('encoding/redirected path with encoded spaces.html');
	expect(content).toMatch(
		'<h1>redirected path with encoded spaces / /encoding/redirected%20path%20with%20encoded%20spaces</h1>'
	);

	content = read('encoding/path with spaces.json');
	assert.equal(content, JSON.stringify({ path: 'path with spaces' }));

	content = read('encoding/path with encoded spaces.json');
	assert.equal(content, JSON.stringify({ path: 'path with encoded spaces' }));
});

test('prerendering is set to true in root +layout.js', () => {
	const content = replace_hydration_attrs(read('prerendering-true.html'));
	expect(content).toMatch('<h1>prerendering: true/true</h1>');
});

test('fetching missing content results in a 404', () => {
	const content = read('fetch-404.html');
	expect(content).toMatch('<h1>status: 404</h1>');
});

test('prerenders binary data', async () => {
	assert.equal(Buffer.compare(read('fetch-image/image.jpg', null), read('image.jpg', null)), 0);
	assert.equal(Buffer.compare(read('fetch-image/image.png', null), read('image.png', null)), 0);
});

test('fetches data from local endpoint', () => {
	const data = JSON.parse(read('origin/__data.json'));

	expect(data).toEqual({
		type: 'data',
		nodes: [
			null,
			{
				type: 'data',
				data: [{ message: 1 }, 'hello'],
				uses: {}
			}
		]
	});
	assert.equal(read('origin/message.json'), JSON.stringify({ message: 'hello' }));
});

test('respects config.prerender.origin', () => {
	const content = read('origin.html');
	expect(content).toMatch('<h2>http://example.com</h2>');
});

test('$env - includes environment variables', () => {
	const content = read('env.html');

	assert.match(
		content,
		/.*PRIVATE_STATIC: accessible to server-side code\/replaced at build time.*/gs
	);

	assert.match(content, /.*PUBLIC_STATIC: accessible anywhere\/replaced at build time.*/gs);
});

test('prerenders a page in a (group)', () => {
	const content = replace_hydration_attrs(read('grouped.html'));
	expect(content).toMatch('<h1>grouped</h1>');
});

test('injects relative service worker', () => {
	const content = read('index.html');
	expect(content).toMatch("navigator.serviceWorker.register('./service-worker.js')");
});

test('define service worker variables', () => {
	const content = read('service-worker.js');
	expect(content).toMatch('MY_ENV DEFINED');
});

test('prerendered.paths omits trailing slashes for endpoints', () => {
	const content = read('service-worker.js');

	for (const path of [
		'/trailing-slash/page/',
		'/trailing-slash/page/__data.json',
		'/trailing-slash/standalone-endpoint.json'
	]) {
		expect(content, `Missing ${path}`).toMatch(`"${path}"`);
	}
});

test('prerenders responses with immutable Headers', () => {
	const content = read('immutable-headers');
	expect(content).toMatch('foo');
});

test('prerenders paths with optional parameters with empty values', () => {
	const content = read('optional-params.html');
	expect(content).includes('Path with Value');
});
