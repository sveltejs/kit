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

test('rest parameters match zero or more segments', async ({ page }) => {
	for (const [pathname, text] of [
		['/docs', 'docs: []'],
		['/docs/a/b', 'docs: [a/b]'],
		['/files/edit', 'edit: []'],
		['/files/a/b/edit', 'edit: [a/b]']
	]) {
		const response = await page.goto(pathname);
		expect(response?.status()).toBe(200);
		await expect(page.locator('h1')).toHaveText(text);
	}
});

test('rest matcher rejection falls back to a shorter route', async ({ request }) => {
	const empty = await request.get('/fallback/suffix');
	expect(empty.status()).toBe(200);
	expect(await empty.json()).toEqual({ slug: 'suffix' });

	const nonempty = await request.get('/fallback/a/b/suffix');
	expect(nonempty.status()).toBe(200);
	expect(await nonempty.json()).toEqual({ rest: 'a/b' });
});

test('client navigation fetches empty rest parameter data', async ({ page }) => {
	await page.goto('/docs/a/b');
	await page.click('a');
	await expect(page.locator('h1')).toHaveText('docs: []');
	await expect(page).toHaveURL('/docs');
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
	await expect(page.locator('p')).not.toContainText('__sveltekit_original_pathname_');
});

// TODO: test remote function works

// TODO: test preloadCode works
