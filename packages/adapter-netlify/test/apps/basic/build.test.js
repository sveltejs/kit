import fs from 'node:fs';
import path from 'node:path';
import { test, expect } from 'vitest';

test('explicit Node runtime is included in framework and function metadata', () => {
	const framework_config = JSON.parse(
		fs.readFileSync(path.resolve(import.meta.dirname, '.netlify/v1/config.json'), 'utf-8')
	);
	expect(framework_config.functions).toEqual({ nodeVersion: '24' });

	const entrypoint = fs.readFileSync(
		path.resolve(import.meta.dirname, '.netlify/v1/functions/sveltekit-render.mjs'),
		'utf-8'
	);
	const function_config = JSON.parse(entrypoint.match(/export const config = (\{[\s\S]*?\});/)[1]);
	expect(function_config).toMatchObject({
		nodeVersion: '24',
		preferStatic: true,
		path: ['/*'],
		excludedPath: ['/.netlify/*']
	});
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
