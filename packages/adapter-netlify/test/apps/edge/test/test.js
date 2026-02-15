import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { expect, test } from '@playwright/test';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

test('page renders', async ({ request }) => {
	const response = await request.get('/');
	expect(response.status()).toBe(200);
	expect(await response.text()).toContain('Hello from SvelteKit');
});

test('dynamic route works', async ({ request }) => {
	const response = await request.get('/greeting/world');
	expect(response.status()).toBe(200);
	expect(await response.text()).toContain('Hello world');
});

test('read from $app/server works', async ({ request }) => {
	const content = fs.readFileSync(path.resolve(__dirname, '../src/routes/read/file.txt'), 'utf-8');
	const response = await request.get('/read');
	expect(await response.text()).toBe(content);
});

test('_headers are copied to publish directory', () => {
	const headers = fs.readFileSync(path.resolve(__dirname, '../build/_headers'), 'utf-8');
	expect(headers).toContain('X-Custom-Header: test-value');
});
