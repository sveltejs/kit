import { expect } from '@playwright/test';
import { test } from '../../../utils.js';

test.skip(({ javaScriptEnabled }) => !javaScriptEnabled);

test.describe('remote form dirty restoration regression coverage', () => {
	test('scalar restoration preserves the original input before clearing dirty', async ({
		page
	}) => {
		await page.goto('/remote/form/dirty-state');
		const amount = page.locator('#scalar-amount');
		await amount.fill('changed');
		await amount.fill('initial');
		await expect(amount).toHaveValue('initial');
		await expect(page.locator('#scalar-dirty')).toHaveText('false');
	});

	test('nested restoration preserves the original input before clearing dirty', async ({
		page
	}) => {
		await page.goto('/remote/form/dirty-state');
		await page.locator('#nested-edit').click();
		await page.locator('#nested-restore').click();
		await expect(page.locator('#nested-leaf')).toHaveValue('initial');
		await expect(page.locator('#nested-leaf-dirty')).toHaveText('false');
	});

	test('sibling restoration preserves the value and aggregate isolation', async ({ page }) => {
		await page.goto('/remote/form/dirty-state');
		await page.locator('#sibling-a-edit').click();
		await page.locator('#sibling-b-edit').click();
		await page.locator('#sibling-a-restore').click();
		await expect(page.locator('#sibling-a')).toHaveValue('a');
		await expect(page.locator('#sibling-a-dirty')).toHaveText('false');
		await expect(page.locator('#sibling-b-dirty')).toHaveText('true');
		await expect(page.locator('#siblings-dirty')).toHaveText('true');
	});

	test('normalized number and checkbox restoration clears dirty and reset establishes baseline', async ({
		page
	}) => {
		await page.goto('/remote/form/dirty-state');
		const number = page.locator('#normalized-number');
		const enabled = page.locator('#normalized-enabled');
		await number.fill('4');
		await number.fill('3');
		await expect(number).toHaveValue('3');
		await expect(page.locator('#normalized-number-dirty')).toHaveText('false');
		await expect(enabled).toBeChecked();
		await enabled.click();
		await expect(enabled).not.toBeChecked();
		await enabled.click();
		await expect(enabled).toBeChecked();
		await expect(page.locator('#normalized-enabled-dirty')).toHaveText('false');
		await number.fill('5');
		await page.locator('#normalized-reset').click();
		await expect(number).toHaveValue('3');
		await expect(page.locator('#normalized-number-dirty')).toHaveText('false');
	});

	test('navigation remount establishes a fresh baseline', async ({ page }) => {
		await page.goto('/remote/form/dirty-state');
		await page.locator('#normalized-number').fill('5');
		await page.goto('/');
		await page.goto('/remote/form/dirty-state');
		await expect(page.locator('#normalized-number')).toHaveValue('3');
		await expect(page.locator('#normalized-number-dirty')).toHaveText('false');
	});

	test('parent and root replacements recompute descendants without stale dirty state', async ({
		page
	}) => {
		await page.goto('/remote/form/dirty-state');
		await page.locator('#nested-edit').click();
		await page.locator('#nested-parent-restore').click();
		await expect(page.locator('#nested-leaf')).toHaveValue('initial');
		await expect(page.locator('#nested-leaf-dirty')).toHaveText('false');
		await page.locator('#nested-root-replace').click();
		await expect(page.locator('#nested-leaf')).toHaveValue('root');
		await expect(page.locator('#nested-leaf-dirty')).toHaveText('true');
		await page.locator('#nested-parent-restore').click();
		await expect(page.locator('#nested-leaf')).toHaveValue('initial');
		await expect(page.locator('#nested-leaf-dirty')).toHaveText('false');
	});
});
