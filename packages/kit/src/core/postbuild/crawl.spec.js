import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { expect, test } from 'vitest';
import { crawl } from './crawl.js';

const fixtures = fileURLToPath(new URL('./fixtures', import.meta.url));

for (const fixture of fs.readdirSync(fixtures)) {
	test(fixture, () => {
		const input = fs.readFileSync(`${fixtures}/${fixture}/input.html`, 'utf8');
		const expected = JSON.parse(fs.readFileSync(`${fixtures}/${fixture}/output.json`, 'utf8'));

		// const start = Date.now();

		const output = crawl(input, '/');

		// uncomment to see how long it took
		// console.error(fixture, Date.now() - start);

		expect(output).toEqual(expected);
	});
}
