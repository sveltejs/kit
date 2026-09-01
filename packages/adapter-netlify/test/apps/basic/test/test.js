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

test('_redirects are copied to publish directory', () => {
	const redirects = fs.readFileSync(
		path.resolve(import.meta.dirname, '../build/_redirects'),
		'utf-8'
	);
	expect(redirects).toContain('/redirect-me /greeting/redirected 301');
});

test('_headers are copied to publish directory', () => {
	const headers = fs.readFileSync(path.resolve(import.meta.dirname, '../build/_headers'), 'utf-8');
	expect(headers).toContain('X-Custom-Header: test-value');
});

test('skew protection is configured', () => {
	const frameworks_config = JSON.parse(
		fs.readFileSync(path.resolve(import.meta.dirname, '../.netlify/v1/config.json'), 'utf-8')
	);
	expect(frameworks_config.headers).toContainEqual({
		for: '/*',
		values: {
			'Set-Cookie': '__sveltekit_skew=test-skew-token; Path=/; SameSite=Strict; Secure; HttpOnly'
		}
	});

	const skew_config = JSON.parse(
		fs.readFileSync(
			path.resolve(import.meta.dirname, '../.netlify/v1/skew-protection.json'),
			'utf-8'
		)
	);
	expect(skew_config).toEqual({
		patterns: ['.*'],
		sources: [{ type: 'cookie', name: '__sveltekit_skew' }]
	});

	const runtime = fs.readFileSync(
		path.resolve(import.meta.dirname, '../.netlify/v1/serverless.js'),
		'utf-8'
	);
	expect(runtime).toContain("set_skew_cookie(request, context, '/')");
	expect(runtime).toContain("request.headers.get('sec-fetch-dest') !== 'document'");
});
