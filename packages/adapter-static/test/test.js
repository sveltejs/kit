import fs from 'fs';
import * as assert from 'uvu/assert';
import { run } from './utils.js';

run('prerendered', (test) => {
	test('generates HTML files', ({ cwd }) => {
		assert.ok(fs.existsSync(`${cwd}/build/index.html`));
	});

	test('prerenders content', async ({ base, page }) => {
		await page.goto(base);

		assert.equal(await page.textContent('h1'), 'This page was prerendered');
	});
});
