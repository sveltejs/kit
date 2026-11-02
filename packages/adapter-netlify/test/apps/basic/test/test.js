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
	// one assertion over every method, so a failure shows what each one returned
	const results = [];

	for (const method of ['GET', 'PUT', 'QUERY']) {
		const response = await request.fetch('/shadowed.txt', {
			method,
			...(method !== 'GET' && { headers: { 'content-type': 'application/json' }, data: '{}' })
		});
		results.push({
			method,
			status: response.status(),
			allow: response.headers()['allow'],
			body: await response.text()
		});
	}

	expect(results).toEqual([
		{ method: 'GET', status: 200, allow: undefined, body: 'static file\n' },
		{ method: 'PUT', status: 405, allow: 'GET, HEAD', body: '' },
		{ method: 'QUERY', status: 405, allow: 'GET, HEAD', body: '' }
	]);
});
