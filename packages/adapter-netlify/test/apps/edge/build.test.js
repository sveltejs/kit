import fs from 'node:fs';
import path from 'node:path';
import { expect, test } from 'vitest';
import { deploy } from '../../../../../test-utils/deploy.js';

const app = deploy(import.meta.dirname);
const edge_function = () =>
	fs.readFileSync(path.join(app, '.netlify/v1/edge-functions/sveltekit-render.js'), 'utf-8');

test('configuration is included in the edge function module', () => {
	const config = JSON.parse(fs.readFileSync(path.join(app, '.netlify/v1/config.json'), 'utf-8'));

	expect(config).not.toHaveProperty('edge_functions');
	expect(edge_function()).toContain('"name": "SvelteKit server"');
	expect(edge_function()).toContain('"path": ["/*"]');
	expect(edge_function()).toContain('"excludedPath":');
});

test('_headers are copied to publish directory', () => {
	const headers = fs.readFileSync(path.join(app, 'build/_headers'), 'utf-8');
	expect(headers).toContain('X-Custom-Header: test-value');
});

test('_redirects are copied to publish directory', () => {
	const redirects = fs.readFileSync(path.join(app, 'build/_redirects'), 'utf-8');
	expect(redirects).toContain('/redirect-me /greeting/redirected 301');
});

test('treeshakes component from the server bundle if SSR is turned off', () => {
	expect(edge_function()).not.toContain('this should never appear in the server bundle');
});
