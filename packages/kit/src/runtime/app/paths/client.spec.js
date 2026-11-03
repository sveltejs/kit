import { expect, test, vi } from 'vitest';

vi.hoisted(() => {
	vi.stubGlobal('__SVELTEKIT_PAYLOAD__', {});
	vi.stubGlobal('__SVELTEKIT_PATHS_BASE__', '/base');
	vi.stubGlobal('__SVELTEKIT_PATHS_ASSETS__', '');
	vi.stubGlobal('__SVELTEKIT_APP_DIR__', '_app');
	vi.stubGlobal('__SVELTEKIT_HASH_ROUTING__', true);
});

const { resolve } = await import('./client.js');

test('hash routing resolves to a fragment without the base', () => {
	expect(resolve('about')).toBe('#/about');
	expect(resolve('/blog/[slug]', { slug: 'hello' })).toBe('#/blog/hello');
});

test.each([
	'https://example.com/x',
	'https:',
	'mailto:',
	'mailto:hello@example.com',
	'data:text/plain,hello',
	'javascript:alert(1)',
	'custom+scheme.1-test:value',
	'x:example',
	'HTTPS://example.com/x',
	'//',
	'//example.com/x',
	'///example.com/x'
])('hash routing rejects URL input %s', (input) => {
	expect(() => {
		resolve(input);
	}).toThrowKitError('resolve_external_url', { contains: [input] });
});

test.each([
	'',
	'about',
	'blog/https:example.com',
	'blog?next=https://example.com/x',
	'blog#//example.com',
	'blog/[literal]'
])('hash routing still resolves internal path %s', (input) => {
	expect(resolve(input)).toBe('#/' + input);
});
