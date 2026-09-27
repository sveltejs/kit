import fs from 'node:fs';
import path from 'node:path';
import { expect, test } from 'vitest';
import { deploy } from '../../../../../test-utils/deploy.vitest.js';

const app = deploy(import.meta.dirname);

test('_redirects are copied to publish directory', () => {
	const redirects = fs.readFileSync(path.join(app, 'build/_redirects'), 'utf-8');
	expect(redirects).toContain('/redirect-me /greeting/redirected 301');
});

test('_headers are copied to publish directory', () => {
	const headers = fs.readFileSync(path.join(app, 'build/_headers'), 'utf-8');
	expect(headers).toContain('X-Custom-Header: test-value');
});
