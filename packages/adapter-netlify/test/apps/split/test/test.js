import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { expect, test } from '@playwright/test';

test('routes to routes with dynamic params', async ({ page }) => {
	await page.goto('/dynamic/123');
	await expect(page.locator('p')).toHaveText('id: 123');
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

test('split generates multiple function files with unique names', () => {
	let names;
	if (process.env.EDGE === 'true') {
		const config = JSON.parse(
			fs.readFileSync(path.resolve(import.meta.dirname, '../.netlify/v1/config.json'), 'utf-8')
		);
		expect(config.functions).toBeUndefined();
		names = config.edge_functions.map((fn) => fn.name);
	} else {
		const functions_dir = path.resolve(import.meta.dirname, '../.netlify/v1/functions');
		names = fs
			.readdirSync(functions_dir)
			.filter((file) => file.endsWith('.mjs'))
			.map((file) => path.parse(file).name);
	}

	const colliding_names = names.filter((name) => name.startsWith('sveltekit-_param0'));
	expect(names.length).toBeGreaterThan(1);
	expect(new Set(colliding_names)).toEqual(new Set(['sveltekit-_param0', 'sveltekit-_param0-2']));
});

test('_redirects are copied to publish directory', () => {
	const redirects = fs.readFileSync(
		path.resolve(import.meta.dirname, '../build/_redirects'),
		'utf-8'
	);
	expect(redirects).toContain('/redirect-me /greeting/redirected 301');
});

test('reroute works', async ({ page }) => {
	await page.goto('/reroute');
	await expect(page.locator('p')).toContainText('/reroute');
	await page.goto('/en/reroute?hello=world');
	await expect(page.locator('p')).toContainText('/en/reroute?hello=world');
});

// TODO: test remote function works

// TODO: test preloadCode works
