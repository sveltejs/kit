import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { expect, test } from 'vitest';
import { crawl } from './crawl.js';

const fixtures = fileURLToPath(new URL('./fixtures', import.meta.url));

test.each(fs.readdirSync(fixtures))('%s', (fixture) => {
	const input = fs.readFileSync(`${fixtures}/${fixture}/input.html`, 'utf8');
	const expected = JSON.parse(fs.readFileSync(`${fixtures}/${fixture}/output.json`, 'utf8'));
	const output = crawl(input, '/');
	expect(output).toEqual(expected);
});
