import { expect } from '@playwright/test';
import { test } from '../../../utils.js';

test.skip(({ javaScriptEnabled }) => !javaScriptEnabled);

test.describe('remote form dirty restoration', () => {
	test('scalar UI edit then restore clears dirty', async ({ page }) => {
		await page.goto('/remote/form/dirty-state');
		const amount = page.locator('#scalar-amount');
		await expect(page.locator('#scalar-dirty')).toHaveText('false');
		await expect(amount).toHaveValue('initial');
		await amount.fill('changed');
		await expect(page.locator('#scalar-dirty')).toHaveText('true');
		await expect(amount).toHaveValue('changed');
		await amount.fill('initial');
		await expect(page.locator('#scalar-dirty')).toHaveText('false');
		await expect(amount).toHaveValue('initial');
	});

	test('programmatic nested leaf edit then restore clears leaf dirty', async ({ page }) => {
		await page.goto('/remote/form/dirty-state');
		await expect(page.locator('#nested-leaf-dirty')).toHaveText('false');
		await expect(page.locator('#nested-leaf')).toHaveValue('initial');
		await page.locator('#nested-edit').click();
		await expect(page.locator('#nested-leaf-dirty')).toHaveText('true');
		await expect(page.locator('#nested-leaf')).toHaveValue('changed');
		await page.locator('#nested-restore').click();
		await expect(page.locator('#nested-leaf-dirty')).toHaveText('false');
		await expect(page.locator('#nested-leaf')).toHaveValue('initial');
	});

	test('restoring one sibling preserves the other dirty and then clears aggregate', async ({
		page
	}) => {
		await page.goto('/remote/form/dirty-state');
		await expect(page.locator('#siblings-dirty')).toHaveText('false');
		await expect(page.locator('#sibling-a-dirty')).toHaveText('false');
		await expect(page.locator('#sibling-b-dirty')).toHaveText('false');
		await expect(page.locator('#sibling-a')).toHaveValue('a');
		await expect(page.locator('#sibling-b')).toHaveValue('b');
		await page.locator('#sibling-a-edit').click();
		await page.locator('#sibling-b-edit').click();
		await expect(page.locator('#sibling-a-dirty')).toHaveText('true');
		await expect(page.locator('#sibling-b-dirty')).toHaveText('true');
		await expect(page.locator('#sibling-a')).toHaveValue('a1');
		await expect(page.locator('#sibling-b')).toHaveValue('b1');
		await expect(page.locator('#siblings-dirty')).toHaveText('true');
		await page.locator('#sibling-a-restore').click();
		await expect(page.locator('#sibling-a-dirty')).toHaveText('false');
		await expect(page.locator('#sibling-b-dirty')).toHaveText('true');
		await expect(page.locator('#sibling-a')).toHaveValue('a');
		await expect(page.locator('#sibling-b')).toHaveValue('b1');
		await expect(page.locator('#siblings-dirty')).toHaveText('true');
		await page.locator('#sibling-b-restore').click();
		await expect(page.locator('#sibling-b-dirty')).toHaveText('false');
		await expect(page.locator('#siblings-dirty')).toHaveText('false');
		await expect(page.locator('#sibling-a')).toHaveValue('a');
		await expect(page.locator('#sibling-b')).toHaveValue('b');
	});
});
