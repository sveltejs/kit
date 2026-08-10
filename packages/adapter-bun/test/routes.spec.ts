import { afterEach, expect, test, vi } from 'vitest';

afterEach(() => {
	vi.resetModules();
	vi.doUnmock('MANIFEST');
	vi.unstubAllGlobals();
});

test('client assets use the configured base and URL-encode path segments', async () => {
	const { routes, file } = await load_routes({ base: '/base' });

	const entries = routes.client_asset('folder/encoded name#1.txt');

	expect(entries).toHaveLength(1);
	expect(entries[0][0]).toBe('/base/folder/encoded%20name%231.txt');
	expect(file).toHaveBeenCalledWith('/app/build/client/folder/encoded name#1.txt');
	expect(entries[0][1]).toHaveProperty('GET');
	expect((entries[0][1] as any).GET.headers.get('content-type')).toBe('text/plain;charset=utf-8');
});

test('client index files are also available at their directory URL', async () => {
	const { routes } = await load_routes({ base: '/base' });

	expect(routes.client_asset('index.html').map(([path]) => path)).toEqual([
		'/base/index.html',
		'/base/'
	]);
	expect(routes.client_asset('docs/index.html').map(([path]) => path)).toEqual([
		'/base/docs/index.html',
		'/base/docs/'
	]);
});

test('sub-delims stay raw in route paths with a fully-encoded alias', async () => {
	const { routes } = await load_routes({ base: '/base' });

	expect(routes.client_asset('a&b.txt').map(([path]) => path)).toEqual([
		'/base/a&b.txt',
		'/base/a%26b.txt'
	]);
});

test('segments starting with a colon are escaped to avoid Bun route parameters', async () => {
	const { routes } = await load_routes({ base: '/base' });

	expect(routes.client_asset(':tag.txt').map(([path]) => path)).toEqual(['/base/%3Atag.txt']);
});

test('immutable SvelteKit assets receive a long-lived cache policy', async () => {
	const { routes } = await load_routes({ appDir: '_app' });

	const immutable = (routes.client_asset('_app/immutable/chunk.js')[0][1] as any).GET;
	const mutable = (routes.client_asset('favicon.ico')[0][1] as any).GET;

	expect(immutable.headers.get('cache-control')).toBe('public,max-age=31536000,immutable');
	expect(mutable.headers.has('cache-control')).toBe(false);
});

test('embedded routes use the imported asset instead of a filesystem path', async () => {
	const { routes, file } = await load_routes({ embed: true });

	routes.client_asset('asset.txt', '/embedded/client.txt');
	routes.prerendered_asset('asset.txt', '/embedded/prerendered.txt');
	const server_file = routes.server_asset('asset.txt', '/embedded/server.txt');

	expect(file).toHaveBeenNthCalledWith(1, '/embedded/client.txt');
	expect(file).toHaveBeenNthCalledWith(2, '/embedded/prerendered.txt');
	expect(file).toHaveBeenNthCalledWith(3, '/embedded/server.txt');
	expect(server_file).toMatchObject({ path: '/embedded/server.txt' });
});

test('server assets resolve from the client output in regular builds', async () => {
	const { routes, file } = await load_routes();

	const result = routes.server_asset('nested/read.txt');

	expect(file).toHaveBeenCalledWith('/app/build/client/nested/read.txt');
	expect(result).toMatchObject({ path: '/app/build/client/nested/read.txt' });
});

test('prerendered assets use the base path and preserve their content type', async () => {
	const { routes, file } = await load_routes({ base: '/base' });
	file.mockImplementationOnce((path) => ({ path, type: 'image/x-icon' }));

	const [[path, handler]] = routes.prerendered_asset('icon.ico');

	expect(path).toBe('/base/icon.ico');
	expect((handler as any).GET.headers.get('content-type')).toBe('image/x-icon');
});

test.each([
	['/page/', '/page', '/page/?from=test'],
	['/page', '/page/', '/page?from=test']
])(
	'prerendered page %s redirects its alternate form %s to the canonical URL',
	async (canonical, alternate, location) => {
		const { routes } = await load_routes();
		const entries = routes.prerendered_page(canonical, 'page.html');

		expect(entries[0][0]).toBe(canonical);
		expect(entries[1][0]).toBe(alternate);
		const response = (entries[1][1] as any).GET(
			new Request(`http://localhost${alternate}?from=test`)
		);
		expect(response.status).toBe(308);
		expect(response.headers.get('location')).toBe(location);
	}
);

test('a prerendered root page has no duplicate alternate route', async () => {
	const { routes } = await load_routes();

	expect(routes.prerendered_page('/', 'index.html')).toHaveLength(1);
});

test('prerendered redirects retain their status and location', async () => {
	const { routes } = await load_routes();

	const [[path, handler]] = routes.prerendered_redirect('/old path', 307, '/new');

	expect(path).toBe('/old%20path');
	expect((handler as any).GET.status).toBe(307);
	expect((handler as any).GET.headers.get('location')).toBe('/new');
});

async function load_routes({ base = '', embed = false, appDir = '_app' } = {}) {
	vi.resetModules();
	vi.doMock('MANIFEST', () => ({ manifest: { appDir }, base, embed }));
	const file = vi.fn((path: string) => ({ path, type: 'text/plain;charset=utf-8' }));
	vi.stubGlobal('Bun', { main: '/app/build/index.js', file });

	return { routes: await import('../src/routes-util.js'), file };
}
