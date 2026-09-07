import fs from 'node:fs';
import path from 'node:path';
import { test, expect } from 'vitest';

test('_redirects are copied to publish directory', () => {
	const redirects = fs.readFileSync(
		path.resolve(import.meta.dirname, './build/_redirects'),
		'utf-8'
	);
	expect(redirects).toContain('/redirect-me /greeting/redirected 301');
});

test('split generates multiple function files', () => {
	const functions_dir = path.resolve(import.meta.dirname, './.netlify/v1/functions');
	const files = fs.readdirSync(functions_dir).filter((f) => f.startsWith('sveltekit-'));
	expect(files.length).toBeGreaterThan(1);

	const optional_route = fs.readFileSync(
		path.join(functions_dir, 'sveltekit-collection-_param1-article.mjs'),
		'utf-8'
	);
	expect(optional_route).toContain(
		'path: ["/collection/:param1?/article", "/collection/:param1?/article/__data.json"]'
	);
});
