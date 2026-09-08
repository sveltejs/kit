import fs from 'node:fs';
import path from 'node:path';
import { test, expect } from 'vitest';

const config_path = path.resolve(import.meta.dirname, './.netlify/v1/config.json');

test('groups routes by runtime when split is false', () => {
	const config = JSON.parse(fs.readFileSync(config_path, 'utf-8'));
	const serverless_dir = path.resolve(import.meta.dirname, './.netlify/v1/functions');
	const edge_dir = path.resolve(import.meta.dirname, './.netlify/v1/edge-functions');
	const serverless = fs.readdirSync(serverless_dir);
	const edge = fs.readdirSync(edge_dir);

	expect(config.nodeVersion).toBe('22');
	expect(serverless).toContain('sveltekit-0.mjs');
	expect(serverless).toContain('sveltekit-catch-all.mjs');
	expect(edge).toContain('sveltekit-1.js');

	const node = fs.readFileSync(path.join(serverless_dir, 'sveltekit-0.mjs'), 'utf-8');
	const catch_all = fs.readFileSync(path.join(serverless_dir, 'sveltekit-catch-all.mjs'), 'utf-8');
	expect(node).toContain('"nodeVersion": "22"');
	expect(catch_all).toContain('"nodeVersion": "22"');
	expect(catch_all).toContain('"/greeting/:param1"');

	const edge_function = fs.readFileSync(path.join(edge_dir, 'sveltekit-1.js'), 'utf-8');
	expect(edge_function).not.toContain('"path": ["/prerendered"');
});

test('_redirects are copied to publish directory', () => {
	const redirects = fs.readFileSync(
		path.resolve(import.meta.dirname, './build/_redirects'),
		'utf-8'
	);
	expect(redirects).toContain('/redirect-me /greeting/redirected 301');
});

test('_headers are copied to publish directory', () => {
	const headers = fs.readFileSync(path.resolve(import.meta.dirname, './build/_headers'), 'utf-8');
	expect(headers).toContain('X-Custom-Header: test-value');
});
