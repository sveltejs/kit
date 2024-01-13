import * as fs from 'node:fs';
import { expect, test } from '@playwright/test';

const cwd = process.cwd();
const vercel = `${cwd}/.vercel/output/functions`;
const assets = '_app/immutable/assets';
const serverless_functions = ['fn-0', 'fn-1', 'fn-2', 'fn'];

test('includes server assets from page server load functions', () => {
	expect(fs.existsSync(`${vercel}/fn-2.func/${assets}/_page.server.js.63084e6e.txt`)).toBeTruthy();
});

test('includes server assets from layout server load functions', () => {
	for (const fn of serverless_functions) {
		expect(
			fs.existsSync(`${vercel}/${fn}.func/${assets}/_layout.server.js.c7c8c528.txt`)
		).toBeTruthy();
	}
});

test('includes server assets from endpoints', () => {
	expect(fs.existsSync(`${vercel}/fn-1.func/${assets}/_server.js.8663e12c.txt`)).toBeTruthy();
});

test('includes server assets from transitive imports', () => {
	expect(fs.existsSync(`${vercel}/fn-0.func/${assets}/transitive.f0151e85.txt`)).toBeTruthy();
});

test('includes server assets of the default error page for every function', () => {
	for (const fn of serverless_functions) {
		expect(
			fs.existsSync(`${vercel}/${fn}.func/${assets}/_layout.server.js.c7c8c528.txt`)
		).toBeTruthy();
	}
});

test('only includes relevant server assets for split functions', () => {
	for (const fn of serverless_functions) {
		const file_exists = fs.existsSync(`${vercel}/${fn}.func/${assets}/_server.js.8663e12c.txt`);
		if (fn === 'fn-1') {
			expect(file_exists).toBeTruthy();
		} else {
			expect(file_exists).toBeFalsy();
		}
	}

	for (const fn of serverless_functions) {
		const file_exists = fs.existsSync(
			`${vercel}/${fn}.func/${assets}/_page.server.js.63084e6e.txt`
		);
		if (fn === 'fn-2') {
			expect(file_exists).toBeTruthy();
		} else {
			expect(file_exists).toBeFalsy();
		}
	}
});

test('excludes server assets from universal load functions', () => {
	expect(fs.existsSync(`${vercel}/fn-2.func/${assets}/_layout.js.35a48854.txt`)).toBeFalsy();
	expect(fs.existsSync(`${vercel}/fn-2.func/${assets}/_page.js.9fbd6c4c.txt`)).toBeFalsy();
});

test('excludes server assets from components', () => {
	expect(fs.existsSync(`${vercel}/fn-2.func/${assets}/_layout.svelte.b9607e14.txt`)).toBeFalsy();
	expect(fs.existsSync(`${vercel}/fn-2.func/${assets}/_page.svelte.f095c905.txt`)).toBeFalsy();
	expect(fs.existsSync(`${vercel}/fn-2.func/${assets}/_error.svelte.f87bcaff.txt`)).toBeFalsy();
	for (const fn of serverless_functions) {
		expect(fs.existsSync(`${vercel}/${fn}.func/${assets}/root_error.4de02419.txt`)).toBeFalsy();
	}
});
