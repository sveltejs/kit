import { beforeAll, expect, test } from 'vitest';
import { Csp } from './csp.js';
import { serialize_dev_html_tags } from './dev_html_tags.js';

beforeAll(() => {
	// @ts-expect-error
	globalThis.__SVELTEKIT_DEV__ = true;
});

/** @type {import('vite').HtmlTagDescriptor[]} */
const tags = [{ tag: 'script', attrs: { type: 'module' }, children: 'run()', injectTo: 'body' }];

test('adds a nonce to scripts when the CSP uses nonces', async () => {
	const csp = new Csp(
		{ mode: 'nonce', directives: { 'script-src': ['self'] }, reportOnly: {} },
		{ prerender: false }
	);

	const { body } = await serialize_dev_html_tags(tags, csp);

	expect(body).toBe(`<script type="module" nonce="${csp.nonce}">run()</script>`);
	expect(csp.csp_provider.get_header()).toContain(`'nonce-${csp.nonce}'`);
});

test('adds inline scripts to the CSP when it uses hashes', async () => {
	const csp = new Csp(
		{ mode: 'hash', directives: { 'script-src': ['self'] }, reportOnly: {} },
		{ prerender: false }
	);

	const { body } = await serialize_dev_html_tags(tags, csp);

	expect(body).toBe('<script type="module">run()</script>');
	expect(csp.csp_provider.get_header()).toBe(
		"script-src 'self' 'sha256-AvyuiL0SD1mVY3NNxR+V2uo+lhk6RMFrytWmRt6CrJQ='"
	);
});
