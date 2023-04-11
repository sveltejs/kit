import * as http from 'node:http';
import { expect } from '@playwright/test';
import { test } from '../../../utils.js';
import {writeFileSync} from "fs";

/** @typedef {import('@playwright/test').Response} Response */

test.describe.configure({ mode: 'parallel' });

test.describe('embed', () => {
	test('resolves downwards', async ({ page }) => {
		await page.goto('/path-base/embed');
		let x = await page.content();
		writeFileSync("test-embed2.html", x)
		console.log(await page.content())
	});
});
