import fs from 'node:fs';
import path from 'node:path';
import { test, expect } from 'vitest';

const config_path = path.resolve(import.meta.dirname, './.netlify/v1/config.json');
const edge_function_path = path.resolve(
	import.meta.dirname,
	'./.netlify/v1/edge-functions/sveltekit-render.js'
);

test('configuration is included in the edge function module', () => {
	const config = JSON.parse(fs.readFileSync(config_path, 'utf-8'));
	const edge_function = fs.readFileSync(edge_function_path, 'utf-8');

	expect(config).not.toHaveProperty('edge_functions');
	expect(config).not.toHaveProperty('nodeVersion');
	expect(edge_function).toContain('"name": "SvelteKit server"');
	expect(edge_function).toContain('"path": ["/*"]');
	expect(edge_function).toContain('"excludedPath":');
});

test('_headers are copied to publish directory', () => {
	const headers = fs.readFileSync(path.resolve(import.meta.dirname, './build/_headers'), 'utf-8');
	expect(headers).toContain('X-Custom-Header: test-value');
});

test('_redirects are copied to publish directory', () => {
	const redirects = fs.readFileSync(
		path.resolve(import.meta.dirname, './build/_redirects'),
		'utf-8'
	);
	expect(redirects).toContain('/redirect-me /greeting/redirected 301');
});
