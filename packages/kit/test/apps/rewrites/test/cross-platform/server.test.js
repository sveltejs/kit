import { expect } from '@playwright/test';
import { test } from '../../../../utils.js';

/** @typedef {import('@playwright/test').Response} Response */

test.skip(({ javaScriptEnabled }) => !!javaScriptEnabled);

test.describe.configure({ mode: 'parallel' });

test("placeholder", async () => {
	expect(1).toBe(1);
});