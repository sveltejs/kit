import fs from 'node:fs';
import path from 'node:path';
import { expect, test } from '@playwright/test';

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
	const content = fs.readFileSync(
		path.resolve(import.meta.dirname, '../src/routes/read/file.txt'),
		'utf-8'
	);
	const response = await request.get('/read');
	expect(await response.text()).toBe(content);
});

test('static file shadows a +server.js at the same path', async ({ request }) => {
	const get = await request.get('/shadowed.txt');
	expect(get.status()).toBe(200);
	expect(await get.text()).toBe('static file\n');

	for (const method of ['PUT', 'QUERY']) {
		const response = await request.fetch('/shadowed.txt', {
			method,
			headers: { 'content-type': 'application/json' },
			data: '{}'
		});
		expect({ method, status: response.status(), body: await response.text() }).toEqual({
			method,
			status: 405,
			body: ''
		});
	}
});
