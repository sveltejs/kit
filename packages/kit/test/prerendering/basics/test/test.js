import * as fs from 'fs';
import { fileURLToPath } from 'url';
import { test } from 'uvu';
import * as assert from 'uvu/assert';

const build = fileURLToPath(new URL('../build', import.meta.url));

/** @param {string} file */
const read = (file, encoding = 'utf-8') => fs.readFileSync(`${build}/${file}`, encoding);

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

test('renders a server-side redirect', () => {
	const html = read('redirect-server.html');
	assert.equal(html, '<meta http-equiv="refresh" content="0;url=https://example.com/redirected">');

	const code = read('redirect-server/__data.json');
	const window = {};
	new Function('window', code)(window);

	assert.equal(window.__sveltekit_data, {
		type: 'redirect',
		location: 'https://example.com/redirected'
	});
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
	assert.ok(content.includes('<h1>content-type: application/json</h1>'), content);

	const json = read('fetch-endpoint/not-buffered.json');
	assert.equal(json, JSON.stringify({ answer: 42 }));
});

test('loads a file with spaces in the filename', () => {
	const content = read('load-file-with-spaces.html');
	assert.ok(content.includes('<h1>answer: 42</h1>'), content);
});

test('generates __data.json file for shadow endpoints', () => {
	const window = {};

	new Function('window', read('__data.json'))(window);
	assert.equal(window.__sveltekit_data, {
		type: 'data',
		nodes: [
			null,
			{
				type: 'data',
				data: { message: 'hello' },
				uses: { dependencies: undefined, params: undefined, parent: undefined, url: undefined }
			}
		]
	});

	new Function('window', read('shadowed-get/__data.json'))(window);
	assert.equal(window.__sveltekit_data, {
		type: 'data',
		nodes: [
			null,
			{
				type: 'data',
				data: { answer: 42 },
				uses: { dependencies: undefined, params: undefined, parent: undefined, url: undefined }
			}
		]
	});
});

test('does not prerender page with shadow endpoint with non-load handler', () => {
	assert.ok(!fs.existsSync(`${build}/shadowed-post.html`));
	assert.ok(!fs.existsSync(`${build}/shadowed-post/__data.json`));
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
	if (!match) {
		throw new Error('Could not find data-sveltekit-hydrate');
	}

	assert.equal(match[1].trim(), '<h1>hello</h1>');

	assert.ok(
		match[3].includes(
			`target: document.querySelector('[data-sveltekit-hydrate="${match[2]}"]').parentNode`
		)
	);
});

test('prerenders binary data', async () => {
	assert.equal(Buffer.compare(read('fetch-image/image.jpg', null), read('image.jpg', null)), 0);
	assert.equal(Buffer.compare(read('fetch-image/image.png', null), read('image.png', null)), 0);
});

test('fetches data from local endpoint', () => {
	const window = {};
	new Function('window', read('origin/__data.json'))(window);

	assert.equal(window.__sveltekit_data, {
		type: 'data',
		nodes: [
			null,
			{
				type: 'data',
				data: { message: 'hello' },
				uses: { dependencies: undefined, params: undefined, parent: undefined, url: undefined }
			}
		]
	});
	assert.equal(read('origin/message.json'), JSON.stringify({ message: 'hello' }));
});

test('respects config.prerender.origin', () => {
	const content = read('origin.html');
	assert.ok(content.includes('<h2>http://example.com</h2>'));
});

test('$env - includes environment variables', () => {
	const content = read('env.html');

	assert.match(
		content,
		/.*PRIVATE_STATIC: accessible to server-side code\/replaced at build time.*/gs
	);
	assert.match(
		content,
		/.*PRIVATE_DYNAMIC: accessible to server-side code\/evaluated at run time.*/gs
	);
	assert.match(content, /.*PUBLIC_STATIC: accessible anywhere\/replaced at build time.*/gs);
	assert.match(content, /.*PUBLIC_DYNAMIC: accessible anywhere\/evaluated at run time.*/gs);
});

test('prerenders a page in a (group)', () => {
	const content = read('grouped.html');
	assert.ok(content.includes('<h1>grouped</h1>'));
});

test('injects relative service worker', () => {
	const content = read('index.html');
	assert.ok(content.includes(`navigator.serviceWorker.register('./service-worker.js')`));
});

test('define service worker variables', () => {
	const content = read('service-worker.js');
	assert.ok(content.includes(`MY_ENV DEFINED`));
});

test.run();
