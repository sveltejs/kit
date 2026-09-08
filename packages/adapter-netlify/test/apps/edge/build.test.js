import fs from 'node:fs';
import path from 'node:path';
import { test, expect } from 'vitest';

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
