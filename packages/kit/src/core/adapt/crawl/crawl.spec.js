import fs from 'fs';
import { fileURLToPath } from 'url';
import { test } from 'uvu';
import * as assert from 'uvu/assert';
import { crawl } from './crawl.js';

const fixtures = fileURLToPath(new URL('./fixtures', import.meta.url));

for (const fixture of fs.readdirSync(fixtures)) {
	test(fixture, () => {
		const input = fs.readFileSync(`${fixtures}/${fixture}/input.html`, 'utf8');
		const expected = JSON.parse(fs.readFileSync(`${fixtures}/${fixture}/output.json`, 'utf8'));

		assert.equal(crawl(input), expected);
	});
}

test.run();
