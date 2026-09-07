import fs from 'node:fs';
import path from 'node:path';
import { expect, test } from '@playwright/test';

test('routes with dynamic params', async ({ page }) => {
	await page.goto('/dynamic/123');
	await expect(page.locator('p')).toHaveText('id: 123');
});

test('routes with optional params', async ({ page }) => {
	await page.goto('/collection/article');
	await expect(page.locator('p')).toHaveText('optional: none');

	await page.goto('/collection/value/article');
	await expect(page.locator('p')).toHaveText('optional: value');
});

test('client-side navigation fetches server load function data', async ({ page }) => {
	await page.goto('/dynamic');
	await page.click('a');
	await expect(page.locator('p')).toHaveText('id: 1');
});

test('falls back to catch all function if no routes match', async ({ page }) => {
	await page.goto('/non-existent');
	await expect(page.locator('p')).toHaveText('Custom default error page');
});

test('client-side fetch for query remote function data', async ({ page }) => {
	await page.goto('/remote/query');
	await expect(page.locator('p')).toHaveText('a: 1');
});

test('reroute works', async ({ page }) => {
	await page.goto('/reroute');
	await expect(page.locator('p')).toContainText('/reroute');
	await page.goto('/en/reroute?hello=world');
	await expect(page.locator('p')).toContainText('/en/reroute?hello=world');
});

// TODO: test remote function works

// TODO: test preloadCode works
