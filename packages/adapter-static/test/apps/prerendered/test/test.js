import * as fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { expect, test } from '@playwright/test';
import { location } from '../../../../../../test-utils/deploy.js';

// the app is built and served from a deploy copy, see test-utils/serve.js
const build = path.join(location(process.cwd()), 'build');

test('generates HTML files', () => {
	expect(fs.existsSync(path.join(build, 'index.html'))).toBeTruthy();
});

test('prerenders a page', async ({ page }) => {
	await page.goto('/');
	expect(await page.textContent('h1')).toEqual('This page was prerendered');
	expect(await page.textContent('p')).toEqual('answer: 42');
});

test('prerenders an unreferenced endpoint with explicit `prerender` setting', async () => {
	expect(fs.existsSync(path.join(build, 'endpoint/explicit.json'))).toBeTruthy();
});

test('prerenders a referenced endpoint with implicit `prerender` setting', async () => {
	expect(fs.existsSync(path.join(build, 'endpoint/implicit.json'))).toBeTruthy();
});

test('exposes public env vars to the client', async ({ page }) => {
	await page.goto('/public-env');
	expect(await page.textContent('h1')).toEqual('The answer is 42');
	expect(await page.textContent('h2')).toEqual('The dynamic answer is 42');
});
