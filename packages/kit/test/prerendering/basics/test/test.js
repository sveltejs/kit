import fs from 'fs';
import { fileURLToPath } from 'url';
import { test } from 'uvu';
import * as assert from 'uvu/assert';

const build = fileURLToPath(new URL('../build', import.meta.url));

/** @param {string} file */
const read = (file) => fs.readFileSync(`${build}/${file}`, 'utf-8');

test('prerenders /', () => {
	const content = read('index.html');
	assert.ok(content.includes('<h1>hello</h1>'));
});

test('renders a redirect', () => {
	const content = read('redirect.html');
	assert.equal(
		content,
		'<meta http-equiv="refresh" content="0;url=https://example.com/redirected">'
	);
});

test('does not double-encode redirect locations', () => {
	const content = read('redirect-encoded.html');
	assert.equal(
		content,
		'<meta http-equiv="refresh" content="0;url=https://example.com/redirected?returnTo=%2Ffoo%3Fbar%3Dbaz">'
	);
});

test('escapes characters in redirect', () => {
	const content = read('redirect-malicious.html');
	assert.equal(
		content,
		'<meta http-equiv="refresh" content="0;url=https://example.com/</script>alert(&quot;pwned&quot;)">'
	);
});

test('inserts http-equiv tag for cache-control headers', () => {
	const content = read('max-age.html');
	assert.ok(content.includes('<meta http-equiv="cache-control" content="max-age=300">'));
});

test('renders page with data from endpoint', () => {
	const content = read('fetch-endpoint/buffered.html');
	assert.ok(content.includes('<h1>the answer is 42</h1>'));

	const json = read('fetch-endpoint/buffered.json');
	assert.equal(json, JSON.stringify({ answer: 42 }));
});

test('renders page with unbuffered data from endpoint', () => {
	const content = read('fetch-endpoint/not-buffered.html');
	assert.ok(content.includes('<h1>content-type: application/json; charset=utf-8</h1>'), content);

	const json = read('fetch-endpoint/not-buffered.json');
	assert.equal(json, JSON.stringify({ answer: 42 }));
});

test('loads a file with spaces in the filename', () => {
	const content = read('load-file-with-spaces.html');
	assert.ok(content.includes('<h1>answer: 42</h1>'), content);
});

test('generates __data.json file for shadow endpoints', () => {
	assert.equal(read('__data.json'), JSON.stringify({ message: 'hello' }));
	assert.equal(read('shadowed-get/__data.json'), JSON.stringify({ answer: 42 }));
});

test('does not prerender page with shadow endpoint with non-GET handler', () => {
	assert.ok(!fs.existsSync(`${build}/shadowed-post.html`));
	assert.ok(!fs.existsSync(`${build}/shadowed-post/__data.json`));
});

test('does not prerender page accessing session in load', () => {
	// This should fail to prerender as session can never be populated
	// for a prerendered page.
	assert.ok(!fs.existsSync(`${build}/accesses-session.html`));
});

test('decodes paths when writing files', () => {
	let content = read('encoding/path with spaces.html');
	assert.ok(content.includes('<p id="a">path with spaces</p>'));
	assert.ok(content.includes('<p id="b">path with encoded spaces</p>'));

	content = read('encoding/dynamic path with spaces.html');
	assert.ok(
		content.includes('<h1>dynamic path with spaces / /encoding/dynamic%20path%20with%20spaces</h1>')
	);

	content = read('encoding/dynamic path with encoded spaces.html');
	assert.ok(
		content.includes(
			'<h1>dynamic path with encoded spaces / /encoding/dynamic%20path%20with%20encoded%20spaces</h1>'
		)
	);

	content = read('encoding/redirected path with encoded spaces.html');
	assert.ok(
		content.includes(
			'<h1>redirected path with encoded spaces / /encoding/redirected%20path%20with%20encoded%20spaces</h1>'
		)
	);

	content = read('encoding/path with spaces.json');
	assert.equal(content, JSON.stringify({ path: 'path with spaces' }));

	content = read('encoding/path with encoded spaces.json');
	assert.equal(content, JSON.stringify({ path: 'path with encoded spaces' }));
});

test('prerendering is set to true in global code of hooks.js', () => {
	const content = read('prerendering-true.html');
	assert.ok(content.includes('<h1>prerendering: true/true</h1>'), content);
});

test('fetching missing content results in a 404', () => {
	const content = read('fetch-404.html');
	assert.ok(content.includes('<h1>status: 404</h1>'), content);
});

test('targets the data-sveltekit-hydrate parent node', () => {
	// this test ensures that we don't accidentally change the way
	// the body is hydrated in a way that breaks apps that need
	// to manipulate the markup in some way:
	// https://github.com/sveltejs/kit/issues/4685
	const content = read('index.html');

	const pattern =
		/<body>([^]+?)<script type="module" data-sveltekit-hydrate="(\w+)">([^]+?)<\/script>[^]+?<\/body>/;

	const match = pattern.exec(content);

	assert.equal(match[1].trim(), '<h1>hello</h1>');

	assert.ok(
		match[3].includes(
			`target: document.querySelector('[data-sveltekit-hydrate="${match[2]}"]').parentNode`
		)
	);
});

test.run();
