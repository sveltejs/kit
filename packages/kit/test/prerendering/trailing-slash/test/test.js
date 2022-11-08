import * as fs from 'fs';
import { fileURLToPath } from 'url';
import { test } from 'uvu';
import * as assert from 'uvu/assert';

const build = fileURLToPath(new URL('../build', import.meta.url));

/** @param {string} file */
const read = (file) => fs.readFileSync(`${build}/${file}`, 'utf-8');

test('prerendered.paths omits trailing slashes for endpoints', () => {
	const content = read('service-worker.js');

	for (const path of ['/page/', '/page/__data.json', '/standalone-endpoint.json']) {
		assert.ok(content.includes(`"${path}"`), `Missing ${path}`);
	}
});

test.run();
