import * as fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { assert, expect, test } from 'vitest';
import { replace_hydration_attrs } from '../../test-utils';

const build = fileURLToPath(new URL('../build', import.meta.url));

/** @param {string} file */
const read = (file) => fs.readFileSync(`${build}/${file}`, 'utf-8');

test('prerenders /path-base', () => {
	const content = replace_hydration_attrs(read('index.html'));
	expect(content).toMatch('<h1>hello</h1>');
});

test('prerenders nested /path-base', () => {
	const content = replace_hydration_attrs(read('nested/index.html'));
	expect(content).toMatch('<h1>nested hello</h1>');
});

test('adds CSP headers via meta tag', () => {
	const content = read('index.html');
	expect(content).toMatch(
		'<meta http-equiv="content-security-policy" content="script-src \'self\' \'sha256-'
	);
});

test('does not copy `public` into `_app`', () => {
	assert.isFalse(fs.existsSync(`${build}/_app/robots.txt`));
});

// https://github.com/sveltejs/kit/issues/4340
test('populates fallback 200.html file', () => {
	const content = read('200.html');
	assert.isNotEmpty(content);
});

test('does not prerender linked +server.js route', () => {
	assert.isFalse(fs.existsSync(`${build}/rss.xml`));
});

// https://github.com/sveltejs/kit/issues/10735
// A non-prerendered page that has a POST-only +server.js sibling must not cause the
// crawler to fail (previously the endpoint was preferred over the page during prerendering,
// resulting in a 405). The build succeeding (and the route not being written) verifies the fix.
test('does not fail when crawling a non-prerendered page with a POST-only +server.js sibling', () => {
	assert.isFalse(fs.existsSync(`${build}/non-prerendered-page-and-endpoint.html`));
	assert.isFalse(fs.existsSync(`${build}/non-prerendered-page-and-endpoint/index.html`));
});

test('adds CSP hashes for hydratable scripts via meta tag', () => {
	const content = read('csp-hydratable/index.html');

	// Verify the page rendered correctly
	expect(replace_hydration_attrs(content)).toMatch(
		'<h1 id="hydratable-result">prerendered-value</h1>'
	);

	// This hash could change if Svelte changes how it generates hydratable script elements, but the alternative
	// (trying to extract the script block and hash it to compare) is more annoying than maybe at some point in the future
	// having to update this
	expect(content).toMatch(
		/<meta http-equiv="content-security-policy" content=".*'sha256-xWnzKGZbZBWKfvJVEFtrpB\/s9zyyMDyQZt49JX2PAJQ='.*"/
	);
});
