import * as fs from 'node:fs';
import { expect, test } from '@playwright/test';

const cwd = process.cwd();

test('generates HTML files', () => {
	expect(fs.existsSync(`${cwd}/build/index.html`)).toBeTruthy();
});

test('prerenders a page', async ({ page }) => {
	await page.goto('/');
	expect(await page.textContent('h1')).toEqual('This page was prerendered');
	expect(await page.textContent('p')).toEqual('answer: 42');
});

test('prerenders an unreferenced endpoint with explicit `prerender` setting', async () => {
	expect(fs.existsSync(`${cwd}/build/endpoint/explicit.json`)).toBeTruthy();
});

test('prerenders a referenced endpoint with implicit `prerender` setting', async () => {
	expect(fs.existsSync(`${cwd}/build/endpoint/implicit.json`)).toBeTruthy();
});

test('exposes public env vars to the client', async ({ page }) => {
	await page.goto('/public-env');
	expect(await page.textContent('h1')).toEqual('The answer is 42');
	expect(await page.textContent('h2')).toEqual('The dynamic answer is 42');
});
