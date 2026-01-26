import process from 'node:process';
import { expect } from '@playwright/test';
import { test } from '../../../utils.js';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

test.skip(({ javaScriptEnabled }) => javaScriptEnabled);

const root = path.resolve(fileURLToPath(import.meta.url), '..', '..');

test.describe('remote functions', () => {
	test("doesn't write bundle to disk when treeshaking prerendered remote functions", () => {
		test.skip(!!process.env.DEV, 'skip when in dev mode');
		expect(fs.existsSync(path.join(root, 'dist'))).toBe(false);
	});
});
