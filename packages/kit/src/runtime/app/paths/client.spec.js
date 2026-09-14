import { afterEach, expect, test, vi } from 'vitest';

const config = vi.hoisted(() => ({ base: '', assets: '', hash_routing: false }));

vi.mock('./internal/client.js', () => ({
	get base() {
		return config.base;
	},
	get assets() {
		return config.assets;
	},
	get hash_routing() {
		return config.hash_routing;
	},
	app_dir: '_app',
	match_implementation: vi.fn()
}));

afterEach(() => vi.unstubAllGlobals());

/**
 * @param {string} base
 * @param {boolean} hash_routing
 * @param {string} page
 */
async function setup(base, hash_routing, page) {
	config.base = base;
	config.assets = '';
	config.hash_routing = hash_routing;
	vi.stubGlobal('location', new URL(page));
	vi.resetModules();
	const paths = await import('./client.js');
	const { is_external_url } = await import('../../client/utils.js');
	return { ...paths, is_external_url };
}

test.each([
	{ base: '/base', page: 'https://example.com/base/' },
	{ base: '/base', page: 'https://example.com/base/index.html' },
	{ base: '/my-app', page: 'file:///my-app/index.html' },
	{ base: '', page: 'https://example.com/' }
])('hash links stay in the current document at $page', async ({ base, page }) => {
	const { resolve, is_external_url } = await setup(base, true, page);
	const target = new URL(resolve('about'), page);

	expect(target.pathname).toBe(new URL(page).pathname);
	expect(target.hash).toBe('#/about');
	expect(is_external_url(target, base, true)).toBe(false);
});

test('hash links resolve route parameters without changing the document', async () => {
	const page = 'https://example.com/base/index.html';
	const { resolve, is_external_url } = await setup('/base', true, page);
	const target = new URL(resolve('/blog/[slug]', { slug: 'hello' }), page);

	expect(target.pathname).toBe('/base/index.html');
	expect(target.hash).toBe('#/blog/hello');
	expect(is_external_url(target, '/base', true)).toBe(false);
});

test('pathname routing still prefixes the configured base', async () => {
	const { resolve } = await setup('/base', false, 'https://example.com/base/');
	expect(resolve('about')).toBe('/base/about');
	expect(resolve('/blog/[slug]', { slug: 'hello' })).toBe('/base/blog/hello');
});

test('hash routing keeps the base and CDN prefixes for assets', async () => {
	const { asset } = await setup('/base', true, 'https://example.com/base/');
	expect(asset('favicon.png')).toBe('/base/favicon.png');
	config.assets = 'https://cdn.example.com';
	expect(asset('favicon.png')).toBe('https://cdn.example.com/favicon.png');
});
