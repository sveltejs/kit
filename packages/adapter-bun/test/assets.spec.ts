import { afterEach, expect, mock, spyOn, test } from 'bun:test';
import { mock_handoff } from './mocks.js';

const meta = { hash: 'abc', mtime: 0 };
const dir = '/build';
let instance = 0;

afterEach(() => {
	mock.restore();
});

test('client assets use the configured base and match any percent-encoding of their path', async () => {
	const { get, file } = await load({
		base: '/base',
		assets: [
			['client_asset', 'folder/encoded name#1&.txt', 'folder/encoded name#1&.txt', meta],
			['client_asset', '100%.txt', '100%.txt', meta]
		]
	});

	expect(file).toHaveBeenCalledWith(`${dir}/client/folder/encoded name#1&.txt`);
	for (const path of [
		'/base/folder/encoded%20name%231&.txt',
		'/base/folder/encoded%20name%231%26.tx%74'
	]) {
		expect(get(path)?.headers.get('content-type')).toBe('text/plain;charset=utf-8');
	}
	expect(get('/folder/encoded%20name%231&.txt')).toBeUndefined();
	// an undecodable path is looked up as sent, which is how a browser requests `100%.txt`
	expect(get('/base/%E0%A4%A')).toBeUndefined();
	expect(get('/base/100%.txt')?.status).toBe(200);
	expect(get('/base/100%25.txt')?.status).toBe(200);
	// an encoded slash is not a path separator
	expect(get('/base/folder%2Fencoded%20name%231&.txt')).toBeUndefined();

	// other methods continue to SvelteKit
	expect(get('/base/folder/encoded%20name%231&.txt', { method: 'HEAD' })?.status).toBe(200);
	expect(get('/base/folder/encoded%20name%231&.txt', { method: 'POST' })).toBeUndefined();
});

test.each(['/', '/base'])(
	'client HTML files are also served as directories and without extension under %s',
	async (base) => {
		const { get } = await load({
			base,
			assets: [
				['client_asset', 'index.html', 'index.html', meta],
				['client_asset', 'docs/index.html', 'docs/index.html', meta],
				['client_asset', 'page.html', 'page.html', meta]
			]
		});

		const prefix = base === '/' ? '' : base;
		for (const path of [
			'/index.html',
			'/',
			'/docs/index.html',
			'/docs/',
			'/docs',
			'/page.html',
			'/page'
		]) {
			expect(get(prefix + path)?.headers.get('content-type')).toBe('text/html;charset=utf-8');
		}
		// the directory itself, which for a root deployment is just `/`
		if (prefix) expect(get(prefix)?.status).toBe(200);
		expect(get(`${prefix}/docs/page`)).toBeUndefined();
	}
);

test('the first entry for a pathname wins', async () => {
	const { get } = await load({
		assets: [
			['client_asset', 'page', 'page', { ...meta, hash: 'exact' }],
			['client_asset', 'page.html', 'page.html', { ...meta, hash: 'alias' }]
		]
	});

	expect(get('/page')?.headers.get('etag')).toBe('"exact"');
	expect(get('/page.html')?.headers.get('etag')).toBe('"alias"');
});

test('registers Bun routes only for paths that user agents never re-encode', async () => {
	const { module, get } = await load({
		base: '/base',
		assets: [
			['client_asset', 'data.json', 'data.json', meta],
			['client_asset', 'docs/index.html', 'docs/index.html', meta],
			['client_asset', 'encoded name.txt', 'encoded name.txt', meta],
			['client_asset', 'literal*.txt', 'literal*.txt', meta],
			['client_asset', ':tag/file.txt', ':tag/file.txt', meta],
			['client_asset', 'café.txt', 'café.txt', meta]
		]
	});

	expect(Object.keys(module.routes)).toEqual([
		'/base/data.json',
		'/base/docs/index.html',
		'/base/docs/',
		'/base/docs'
	]);

	// the lookup serves the rest, with no meaning attached to the characters Bun routes reserve
	for (const path of ['/encoded%20name.txt', '/literal*.txt', '/:tag/file.txt', '/caf%C3%A9.txt']) {
		expect(get(`/base${path}`)?.status).toBe(200);
	}
	expect(get('/base/literal-other.txt')).toBeUndefined();
	expect(get('/base/other/file.txt')).toBeUndefined();
});

test('Bun serves immutable files without JavaScript unless they are precompressed', async () => {
	const { module, get: lookup } = await load({
		assets: [
			['client_asset', '_app/immutable/chunk.js', '_app/immutable/chunk.js', meta],
			['client_asset', '_app/immutable/big.js', '_app/immutable/big.js', { ...meta, br: true }],
			['client_asset', 'data.json', 'data.json', meta],
			['prerendered_page', '/page', 'page.html', meta]
		],
		redirects: [['/old', 301, '/new']]
	});
	const get = (path: string) => (module.routes[path] as { GET: unknown }).GET;

	const chunk = get('/_app/immutable/chunk.js') as Response;
	expect(chunk).toBeInstanceOf(Response);
	expect(chunk.headers.get('cache-control')).toBe('public,max-age=31536000,immutable');
	// Bun evaluates conditional requests against these
	expect(chunk.headers.get('etag')).toBe('"abc"');
	expect(chunk.headers.get('last-modified')).toBe('Thu, 01 Jan 1970 00:00:00 GMT');
	expect((get('/old') as Response).status).toBe(301);

	// revalidated files answer 304 from memory, and Bun cannot pick a precompressed variant
	expect(get('/_app/immutable/big.js')).toBeInstanceOf(Function);
	expect(get('/data.json')).toBeInstanceOf(Function);
	expect(get('/page')).toBeInstanceOf(Function);

	// the long-lived cache policy holds however the file is served, and only for immutable files
	for (const path of ['/_app/immutable/chunk.js', '/_app/immutable/big.js']) {
		expect(lookup(path)?.headers.get('cache-control')).toBe('public,max-age=31536000,immutable');
	}
	expect(lookup('/data.json')?.headers.has('cache-control')).toBe(false);
});

const epoch = 'Thu, 01 Jan 1970 00:00:00 GMT';

test.each([
	[{}, 200],
	[{ 'if-none-match': '"abc"' }, 304],
	[{ 'if-none-match': 'W/"abc", "other"' }, 304],
	[{ 'if-none-match': '*' }, 304],
	[{ 'if-none-match': '"old"' }, 200],
	[{ 'if-modified-since': epoch }, 304],
	// If-None-Match takes precedence
	[{ 'if-modified-since': epoch, 'if-none-match': '"old"' }, 200]
])('assets revalidate against the build-time validators: %o is %i', async (headers, status) => {
	const { get } = await load({ assets: [['client_asset', 'data.json', 'data.json', meta]] });

	const response = get('/data.json', { headers });
	expect(response?.status).toBe(status);
	expect(response?.headers.get('etag')).toBe('"abc"');
	expect(response?.headers.get('last-modified')).toBe(epoch);
});

test('precompressed variants are negotiated with their own validators', async () => {
	const { get, file } = await load({
		assets: [['client_asset', 'app.js', 'app.js', { ...meta, br: true, gz: true }]]
	});

	const br = get('/app.js', { headers: { 'accept-encoding': 'br, gzip' } });
	expect(br?.headers.get('content-encoding')).toBe('br');
	expect(br?.headers.get('etag')).toBe('"abc-br"');
	expect(br?.headers.get('vary')).toBe('accept-encoding');
	expect(file).toHaveBeenCalledWith(`${dir}/client/app.js.br`);

	const gzip = get('/app.js', { headers: { 'accept-encoding': 'br;q=0, gzip' } });
	expect(gzip?.headers.get('content-encoding')).toBe('gzip');
	expect(gzip?.headers.get('etag')).toBe('"abc-gz"');
	expect(file).toHaveBeenCalledWith(`${dir}/client/app.js.gz`);

	expect(
		get('/app.js', { headers: { 'accept-encoding': '*' } })?.headers.get('content-encoding')
	).toBe('br');
	expect(
		get('/app.js', { headers: { 'accept-encoding': '*, br;q=0' } })?.headers.get('content-encoding')
	).toBe('gzip');

	const identity = get('/app.js');
	expect(identity?.headers.has('content-encoding')).toBe(false);
	expect(identity?.headers.get('etag')).toBe('"abc"');

	expect(
		get('/app.js', { headers: { 'accept-encoding': 'br', 'if-none-match': '"abc-br"' } })?.status
	).toBe(304);
});

test('range requests are served from the identity representation', async () => {
	const { get, file } = await load({
		assets: [['client_asset', 'app.js', 'app.js', { ...meta, br: true }]]
	});

	const response = get('/app.js', { headers: { 'accept-encoding': 'br', range: 'bytes=0-9' } });

	expect(response?.headers.has('content-encoding')).toBe(false);
	expect(response?.headers.get('etag')).toBe('"abc"');
	expect(file).toHaveBeenCalledWith(`${dir}/client/app.js`);
});

test('embedded builds use the imported asset instead of a filesystem path', async () => {
	const { module, file } = await load({
		embed: true,
		assets: [
			['client_asset', 'asset.txt', '/embedded/client.txt', meta],
			['prerendered_asset', 'other.txt', '/embedded/prerendered.txt', meta]
		],
		server_assets: [['asset.txt', '/embedded/server.txt']]
	});

	expect(file).toHaveBeenCalledWith('/embedded/client.txt');
	expect(file).toHaveBeenCalledWith('/embedded/prerendered.txt');
	expect(module.server_assets.get('asset.txt')?.name).toBe('/embedded/server.txt');
});

test('server assets resolve from the client output in regular builds', async () => {
	const { module } = await load({ server_assets: [['nested/read.txt']] });

	expect(module.server_assets.get('nested/read.txt')?.name).toBe(`${dir}/client/nested/read.txt`);
});

test('prerendered assets use the base path and preserve their content type', async () => {
	const { get, file } = await load({
		base: '/base',
		assets: [
			['prerendered_asset', 'icon.ico', 'icon.ico', meta],
			['prerendered_asset', 'api/c%23.json', 'api/c%23.json', meta]
		]
	});

	expect(file).toHaveBeenCalledWith(`${dir}/prerendered/icon.ico`);
	expect(get('/base/icon.ico')?.headers.get('content-type')).toBe('image/x-icon');
	expect(get('/base/api/c%23.json')?.status).toBe(200);
	expect(get('/base/api/c%2523.json')).toBeUndefined();
});

test.each([
	['/base/page/', '/base/page', '/base/page/?from=test'],
	['/base/page', '/base/page/', '/base/page?from=test'],
	['/base/café/', '/base/caf%C3%A9', '/base/caf%C3%A9/?from=test'],
	// kit keeps reserved characters percent-encoded in prerendered paths
	['/base/c%23/', '/base/c%23', '/base/c%23/?from=test'],
	['/base/a%2Fb', '/base/a%2Fb/', '/base/a%2Fb?from=test']
])(
	'prerendered page %s redirects its alternate form %s to the canonical URL',
	async (canonical, alternate, location) => {
		const { get } = await load({
			base: '/base',
			assets: [['prerendered_page', canonical, 'page.html', meta]]
		});

		expect(get(canonical)?.status).toBe(200);
		const response = get(`${alternate}?from=test`);
		expect(response?.status).toBe(308);
		expect(response?.headers.get('location')).toBe(location);
	}
);

test('prerendered redirects retain their status and location', async () => {
	const { get } = await load({ redirects: [['/old path%23', 307, '/new']] });

	const response = get('/old%20path%23');
	expect(response?.status).toBe(307);
	expect(response?.headers.get('location')).toBe('/new');
});

async function load(handoff: Parameters<typeof mock_handoff>[0] = {}) {
	mock_handoff({ dir, ...handoff });
	// the real Bun.file runs, with the spy recording resolved paths; the files it
	// points at need not exist because nothing reads their contents
	const file = spyOn(Bun, 'file');

	const specifier = `../src/assets.js?instance=${++instance}`;
	const module = (await import(specifier)) as typeof import('../src/assets.js');

	const get = (path: string, init?: RequestInit) => {
		const request = new Request(`http://localhost${path}`, init);
		return module.serve_static(request, new URL(request.url));
	};

	return { module, file, get };
}
