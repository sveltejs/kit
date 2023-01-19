import * as fs from 'fs';
import { fileURLToPath } from 'url';
import { test } from 'uvu';
import * as assert from 'uvu/assert';

const build = fileURLToPath(new URL('../.svelte-kit/output/prerendered/pages', import.meta.url));

/** @param {string} file */
const read = (file, encoding = 'utf-8') => fs.readFileSync(`${build}/${file}`, encoding);

test('prerenders /prerenderable shell', () => {
	const content = read('prerenderable.html');
	assert.ok(!content.includes('prerenderable shell'));
});

test('prerenders /prerenderable-2 shell', () => {
	const content = read('prerenderable-2.html');
	assert.ok(!content.includes('prerenderable shell'));
});

test('prerenders /prerenderable-3 shell with ssr=true and prerender=auto', () => {
	const content = read('prerenderable-3.html');
	assert.ok(content.includes('prerenderable shell'));
});

test('does not prerender non prerenderable things', () => {
	assert.equal(fs.readdirSync(build).length, 3);
});

test('keeps not-explicitly-prerendered routes in the manifest', () => {
	const manifest = fileURLToPath(
		new URL('../.svelte-kit/output/server/manifest.js', import.meta.url)
	);
	const content = fs.readFileSync(manifest, 'utf-8');
	assert.ok(content.includes('/prerenderable'));
	assert.ok(content.includes('/prerenderable-2'));
});

test.run();
