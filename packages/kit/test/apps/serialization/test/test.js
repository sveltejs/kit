import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { expect } from '@playwright/test';
import { fileURLToPath } from 'node:url';
import { test } from '../../../utils.js';

/** @typedef {import('@playwright/test').Response} Response */

test.describe.configure({ mode: 'serial' });

test.describe('Serialization', () => {
	test('A custom type can be serialized/deserialized', async ({ page }) => {
		await page.goto('/');
		expect(await page.textContent('h1')).toBe('it worked!');
	});
});
