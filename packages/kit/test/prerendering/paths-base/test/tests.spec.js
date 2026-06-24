import * as fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { assert, test } from 'vitest';

const build = fileURLToPath(new URL('../build', import.meta.url));

/** @param {string} file */
const read = (file) => fs.readFileSync(`${build}/${file}`, 'utf-8');

test('prerenders /path-base', () => {
	const content = read('index.html');
	assert.ok(content.includes('favicon.png') && content.includes('nested'));
});

test('prerenders /path-base/redirect', () => {
	const content = read('redirect.html');
	assert.equal(
		content,
		'<script>location.href="/path-base/dynamic/foo";</script><meta http-equiv="refresh" content="0;url=/path-base/dynamic/foo">'
	);
});

test('prerenders /path-base/dynamic/foo', () => {
	const content = read('dynamic/foo.html');
	assert.ok(content.includes('<h1>foo</h1>'));
});

test('prerenders /path-base/assets', () => {
	const content = read('assets.html');
	assert.match(content, /<img[^>]+src="\/path-base\//u);
});

test('prerenders /path-base/assets/emitted', () => {
	const content = read('assets/emitted.html');
	assert.ok(content.includes('<p>hello from message.csv'));
});

test('JS assets are loaded with an absolute path', () => {
	const files = fs.readdirSync(`${build}/_app/immutable/entry`);
	const app_file = files.find((file) => file.startsWith('app.'));
	if (!app_file) throw new Error('app file not found');

	const content = read(`_app/immutable/entry/${app_file}`);
	assert.ok(!content.includes('./_app/immutable'));
});
