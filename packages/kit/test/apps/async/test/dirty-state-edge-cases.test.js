import { expect } from '@playwright/test';
import { test } from '../../../utils.js';

test.skip(({ javaScriptEnabled }) => !javaScriptEnabled);

test.describe('remote form dirty edge cases', () => {
	test('unchecked checkbox restores checked state and dirty state', async ({ page }) => {
		await page.goto('/remote/form/dirty-edge');
		const checkbox = page.locator('#edge-checkbox');
		await expect(checkbox).not.toBeChecked();
		await expect(page.locator('#edge-checkbox-dirty')).toHaveText('false');
		await checkbox.check();
		await expect(checkbox).toBeChecked();
		await expect(page.locator('#edge-checkbox-dirty')).toHaveText('true');
		await checkbox.uncheck();
		await expect(checkbox).not.toBeChecked();
		await expect(page.locator('#edge-checkbox-dirty')).toHaveText('false');
	});

	test('empty file input clears back to the original DOM value', async ({ page }) => {
		await page.goto('/remote/form/dirty-edge');
		const input = page.locator('#edge-file');
		await expect(input).toHaveValue('');
		await input.setInputFiles({
			name: 'edge.txt',
			mimeType: 'text/plain',
			buffer: Buffer.from('edge')
		});
		await expect(input).toHaveValue(/edge\.txt/);
		await expect(page.locator('#edge-file-dirty')).toHaveText('true');
		await input.setInputFiles([]);
		await expect(input).toHaveValue('');
		await expect(page.locator('#edge-file-dirty')).toHaveText('false');
	});

	test('parent set preserves untouched sibling DOM and model dirty state', async ({ page }) => {
		await page.goto('/remote/form/dirty-edge');
		const leaf = page.locator('#edge-leaf');
		const sibling = page.locator('#edge-sibling');
		await leaf.fill('changed');
		await expect(leaf).toHaveValue('changed');
		await expect(sibling).toHaveValue('sibling');
		await expect(page.locator('#edge-leaf-dirty')).toHaveText('true');
		await page.locator('#edge-parent-set').click();
		await expect(leaf).toHaveValue('initial');
		await expect(sibling).toHaveValue('sibling');
		await expect(page.locator('#edge-leaf-dirty')).toHaveText('false');
		await expect(page.locator('#edge-parent-dirty')).toHaveText('false');
	});

	test('same form instance gets a new baseline after conditional reattach', async ({ page }) => {
		await page.goto('/remote/form/dirty-edge');
		const field = page.locator('#edge-lifecycle');
		await field.fill('changed');
		await expect(field).toHaveValue('changed');
		await expect(page.locator('#edge-lifecycle-dirty')).toHaveText('true');
		await page.locator('#edge-toggle').click();
		await page.locator('#edge-toggle').click();
		const reattached = page.locator('#edge-lifecycle');
		await expect(reattached).toHaveValue('changed');
		await expect(page.locator('#edge-lifecycle-dirty')).toHaveText('false');
		await reattached.fill('again');
		await expect(reattached).toHaveValue('again');
		await expect(page.locator('#edge-lifecycle-dirty')).toHaveText('true');
		await reattached.fill('changed');
		await expect(reattached).toHaveValue('changed');
		await expect(page.locator('#edge-lifecycle-dirty')).toHaveText('false');
	});
});
