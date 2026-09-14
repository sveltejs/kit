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
