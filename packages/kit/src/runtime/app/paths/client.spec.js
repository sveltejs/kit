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

test.each(['?filter[name]=x', '#[anchor]'])('leaves suffix %s untouched', (suffix) => {
	expect(resolve('/(app)/' + suffix)).toBe('#/' + suffix);
});

test('rejects missing params using the original route ID', () => {
	const id = '/blog/[slug]/(app)?filter[name]=x';
	// @ts-expect-error deliberately omit required params to test the runtime diagnostic
	expect(() => resolve(id)).toThrowKitError('resolve_params_missing', { contains: [id] });
});

test.each(['https://example.com', 'mailto:hi@example.com', '//example.com'])(
	'rejects URL input %s',
	(input) => {
		expect(() => resolve(input)).toThrowKitError('resolve_url_input', { contains: [input] });
	}
);

test('allows URL-like text after the start of a path', () => {
	expect(resolve('blog?next=https://example.com')).toBe('#/blog?next=https://example.com');
});
