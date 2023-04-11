import * as http from 'node:http';
import { expect } from '@playwright/test';
import { test } from '../../../utils.js';
import { writeFileSync } from 'fs';

/** @typedef {import('@playwright/test').Response} Response */

test.describe.configure({ mode: 'parallel' });

test.describe('embed', () => {
	test('serves embedded components in page', async ({ page, javaScriptEnabled }) => {
		await page.goto('/path-base/embed');
		if (javaScriptEnabled) {
			expect(await page.textContent('#embed-a')).toBe('updated a');
			expect(await page.textContent('#embed-b')).toBe('updated b');
		} else {
			expect(await page.textContent('#embed-a')).toBe('a');
			expect(await page.textContent('#embed-b')).toBe('b');
		}
	});
});
