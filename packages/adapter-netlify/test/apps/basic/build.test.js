import fs from 'node:fs';
import path from 'node:path';
import { test, expect } from 'vitest';

const config_path = path.resolve(import.meta.dirname, './.netlify/v1/config.json');

test('sets the explicit Node.js runtime', () => {
	const config = JSON.parse(fs.readFileSync(config_path, 'utf-8'));
	expect(config.nodeVersion).toBe('22');
	expect(fs.existsSync(path.resolve(import.meta.dirname, './.netlify/v1/functions'))).toBe(true);
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
