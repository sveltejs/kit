import { afterEach, expect, test, vi } from 'vitest';

const meta = { hash: 'abc', mtime: 0 };

afterEach(() => {
	vi.resetModules();
	vi.doUnmock('MANIFEST');
	vi.unstubAllGlobals();
});

test('client assets use the configured base and URL-encode path segments', async () => {
	const { routes, file } = await load_routes({ base: '/base' });

	const entries = routes.client_asset('folder/encoded name#1.txt', undefined, meta);

	expect(entries).toHaveLength(1);
	expect(entries[0][0]).toBe('/base/folder/encoded%20name%231.txt');
	expect(file).toHaveBeenCalledWith('/app/build/client/folder/encoded name#1.txt');
	expect(entries[0][1]).toHaveProperty('GET');
	const response = (entries[0][1] as any).GET(new Request('http://localhost/'));
	expect(response.headers.get('content-type')).toBe('text/plain;charset=utf-8');
});

test('client index files are also available at their directory URL', async () => {
	const { routes } = await load_routes({ base: '/base' });

	expect(routes.client_asset('index.html', undefined, meta).map(([path]) => path)).toEqual([
		'/base/index.html',
		'/base/',
		'/base'
	]);
	expect(routes.client_asset('docs/index.html', undefined, meta).map(([path]) => path)).toEqual([
		'/base/docs/index.html',
		'/base/docs/',
		'/base/docs'
	]);
});

test('other client HTML files are also available without their extension', async () => {
	const { routes } = await load_routes({ base: '/base' });

	expect(routes.client_asset('page.html', undefined, meta).map(([path]) => path)).toEqual([
		'/base/page.html',
		'/base/page'
	]);
});

test('sub-delims stay raw in route paths with a fully-encoded alias', async () => {
	const { routes } = await load_routes({ base: '/base' });

	expect(routes.client_asset('a&b.txt', undefined, meta).map(([path]) => path)).toEqual([
		'/base/a&b.txt',
		'/base/a%26b.txt'
	]);
});

test('route paths use WHATWG serialization, the form user agents send', async () => {
	const { routes } = await load_routes({ base: '/base' });

	expect(routes.client_asset('photo[1]^a|b.png', undefined, meta).map(([path]) => path)).toEqual([
		'/base/photo[1]^a|b.png',
		'/base/photo%5B1%5D%5Ea%7Cb.png'
	]);
});

test('a root deployment registers routes with a leading slash', async () => {
	const { routes } = await load_routes();

	expect(routes.client_asset('data.json', undefined, meta)[0][0]).toBe('/data.json');
	expect(routes.client_asset('index.html', undefined, meta).map(([path]) => path)).toEqual([
		'/index.html',
		'/'
	]);
});

test('immutable SvelteKit assets receive a long-lived cache policy', async () => {
	const { routes } = await load_routes({ appDir: '_app' });

	const request = new Request('http://localhost/');
	const immutable = (
		routes.client_asset('_app/immutable/chunk.js', undefined, meta)[0][1] as any
	).GET(request);
	const mutable = (routes.client_asset('favicon.ico', undefined, meta)[0][1] as any).GET(request);

	expect(immutable.headers.get('cache-control')).toBe('public,max-age=31536000,immutable');
	expect(mutable.headers.has('cache-control')).toBe(false);
});

test('static routes revalidate against the build-time hash', async () => {
	const { routes } = await load_routes();

	const route = routes.client_asset('data.json', undefined, meta)[0][1] as any;

	const fresh = route.GET(new Request('http://localhost/data.json'));
	expect(fresh.status).toBe(200);
	expect(fresh.headers.get('etag')).toBe('"abc"');

	const revalidated = route.GET(
		new Request('http://localhost/data.json', { headers: { 'if-none-match': '"abc"' } })
	);
	expect(revalidated.status).toBe(304);
	expect(revalidated.headers.get('etag')).toBe('"abc"');

	const weak = route.GET(
		new Request('http://localhost/data.json', { headers: { 'if-none-match': 'W/"abc", "other"' } })
	);
	expect(weak.status).toBe(304);

	const stale = route.GET(
		new Request('http://localhost/data.json', { headers: { 'if-none-match': '"old"' } })
	);
	expect(stale.status).toBe(200);

	const wildcard = route.GET(
		new Request('http://localhost/data.json', { headers: { 'if-none-match': '*' } })
	);
	expect(wildcard.status).toBe(304);
});

test('static routes revalidate by date when the client has no ETag', async () => {
	const { routes } = await load_routes();

	const route = routes.client_asset('data.json', undefined, meta)[0][1] as any;

	const fresh = route.GET(new Request('http://localhost/data.json'));
	expect(fresh.headers.get('last-modified')).toBe('Thu, 01 Jan 1970 00:00:00 GMT');

	const dated = route.GET(
		new Request('http://localhost/data.json', {
			headers: { 'if-modified-since': 'Thu, 01 Jan 1970 00:00:00 GMT' }
		})
	);
	expect(dated.status).toBe(304);

	const stale_etag_wins = route.GET(
		new Request('http://localhost/data.json', {
			headers: {
				'if-modified-since': 'Thu, 01 Jan 1970 00:00:00 GMT',
				'if-none-match': '"old"'
			}
		})
	);
	expect(stale_etag_wins.status).toBe(200);
});

test('static routes answer HEAD with the same handler', async () => {
	const { routes } = await load_routes();

	const route = routes.client_asset('data.json', undefined, meta)[0][1] as any;
	expect(route.HEAD).toBe(route.GET);
});

test('precompressed variants are negotiated with their own validators', async () => {
	const { routes, file } = await load_routes();

	const route = routes.client_asset('app.js', undefined, {
		hash: 'abc',
		mtime: 0,
		br: true,
		gz: true
	})[0][1] as any;

	const br = route.GET(
		new Request('http://localhost/app.js', { headers: { 'accept-encoding': 'br, gzip' } })
	);
	expect(br.headers.get('content-encoding')).toBe('br');
	expect(br.headers.get('etag')).toBe('"abc-br"');
	expect(br.headers.get('vary')).toBe('accept-encoding');
	expect(file).toHaveBeenLastCalledWith('/app/build/client/app.js.br');

	const gzip = route.GET(
		new Request('http://localhost/app.js', { headers: { 'accept-encoding': 'br;q=0, gzip' } })
	);
	expect(gzip.headers.get('content-encoding')).toBe('gzip');
	expect(gzip.headers.get('etag')).toBe('"abc-gz"');
	expect(file).toHaveBeenLastCalledWith('/app/build/client/app.js.gz');

	const any = route.GET(
		new Request('http://localhost/app.js', { headers: { 'accept-encoding': '*' } })
	);
	expect(any.headers.get('content-encoding')).toBe('br');

	const identity = route.GET(new Request('http://localhost/app.js'));
	expect(identity.headers.has('content-encoding')).toBe(false);
	expect(identity.headers.get('etag')).toBe('"abc"');

	const revalidated = route.GET(
		new Request('http://localhost/app.js', {
			headers: { 'accept-encoding': 'br', 'if-none-match': '"abc-br"' }
		})
	);
	expect(revalidated.status).toBe(304);
});

test('range requests are served from the identity representation', async () => {
	const { routes, file } = await load_routes();

	const route = routes.client_asset('app.js', undefined, {
		hash: 'abc',
		mtime: 0,
		br: true
	})[0][1] as any;
	const response = route.GET(
		new Request('http://localhost/app.js', {
			headers: { 'accept-encoding': 'br', range: 'bytes=0-9' }
		})
	);

	expect(response.headers.has('content-encoding')).toBe(false);
	expect(response.headers.get('etag')).toBe('"abc"');
	expect(file).toHaveBeenLastCalledWith('/app/build/client/app.js');
});

test('embedded routes use the imported asset instead of a filesystem path', async () => {
	const { routes, file } = await load_routes({ embed: true });

	routes.client_asset('asset.txt', '/embedded/client.txt', meta);
	routes.prerendered_asset('asset.txt', '/embedded/prerendered.txt', meta);
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

	const [[path, handler]] = routes.prerendered_asset('icon.ico', undefined, meta);

	expect(path).toBe('/base/icon.ico');
	const response = (handler as any).GET(new Request('http://localhost/base/icon.ico'));
	expect(response.headers.get('content-type')).toBe('image/x-icon');
});

test.each([
	['/page/', '/page', '/page/?from=test'],
	['/page', '/page/', '/page?from=test']
])(
	'prerendered page %s redirects its alternate form %s to the canonical URL',
	async (canonical, alternate, location) => {
		const { routes } = await load_routes();
		const entries = routes.prerendered_page(canonical, 'page.html', meta);

		expect(entries[0][0]).toBe(canonical);
		expect(entries[1][0]).toBe(alternate);
		expect((entries[1][1] as any).HEAD).toBe((entries[1][1] as any).GET);
		const response = (entries[1][1] as any).GET(
			new Request(`http://localhost${alternate}?from=test`)
		);
		expect(response.status).toBe(308);
		expect(response.headers.get('location')).toBe(location);
	}
);

test('redirects to non-ASCII canonical URLs use a percent-encoded location', async () => {
	const { routes } = await load_routes();
	const entries = routes.prerendered_page('/café/', 'cafe.html', meta);

	const response = (entries[1][1] as any).GET(new Request('http://localhost/caf%C3%A9'));
	expect(response.headers.get('location')).toBe('/caf%C3%A9/');
});

test('a prerendered root page has no duplicate alternate route', async () => {
	const { routes } = await load_routes();

	expect(routes.prerendered_page('/', 'index.html', meta)).toHaveLength(1);
});

test('prerendered redirects retain their status and location', async () => {
	const { routes } = await load_routes();

	const [[path, handler]] = routes.prerendered_redirect('/old path', 307, '/new');

	expect(path).toBe('/old%20path');
	expect((handler as any).GET.status).toBe(307);
	expect((handler as any).GET.headers.get('location')).toBe('/new');
	expect((handler as any).HEAD).toBe((handler as any).GET);
});

async function load_routes({ base = '/', embed = false, appDir = '_app' } = {}) {
	vi.resetModules();
	vi.doMock('MANIFEST', () => ({ manifest: { appDir }, base, embed }));
	const file = vi.fn((path: string) => ({ path, type: 'text/plain;charset=utf-8' }));
	vi.stubGlobal('Bun', { main: '/app/build/index.js', file });

	return { routes: await import('../src/routes-util.js'), file };
}
