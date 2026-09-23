import { createHash } from 'node:crypto';
import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { brotliCompressSync, gzipSync } from 'node:zlib';
import { afterAll, beforeAll, expect, test } from 'vitest';
import { create_file_map, serve_static } from './static.js';

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'adapter-node-static-'));
const client = path.join(dir, 'client');
const prerendered = path.join(dir, 'prerendered');

/** writes a file the way `builder.writeClient` + `builder.compress` would, and records it like `adapt` does */
function write(root: string, file: string, content: string, compress = false): AssetEntry {
	const abs = path.join(root, file);
	fs.mkdirSync(path.dirname(abs), { recursive: true });
	fs.writeFileSync(abs, content);

	const entry: AssetEntry = {
		file,
		size: Buffer.byteLength(content),
		etag: createHash('sha256').update(content).digest('base64url')
	};

	if (compress) {
		const gz = gzipSync(content);
		const br = brotliCompressSync(content);
		fs.writeFileSync(`${abs}.gz`, gz);
		fs.writeFileSync(`${abs}.br`, br);
		entry.gz = gz.length;
		entry.br = br.length;
	}

	return entry;
}

const range = write(client, 'range.txt', '0123456789', true);
const plain = write(client, 'plain.txt', 'plain');
const plus = write(client, 'a+b.txt', 'plus');
const page = write(client, 'page.html', '<h1>page</h1>', true);
const sub = write(client, 'sub/index.html', '<h1>sub</h1>');
const chunk = write(client, '_app/immutable/chunks/x.js', 'export {}');
const version = write(client, '_app/version.json', '{}');
const about = write(prerendered, 'about.html', '<h1>about</h1>');

const files = create_file_map({
	dir,
	base: '',
	app_path: '_app',
	mime_types: {
		'.txt': 'text/plain',
		'.html': 'text/html',
		'.js': 'text/javascript',
		'.json': 'application/json'
	},
	assets: {
		entries: [
			['/range.txt', range],
			['/plain.txt', plain],
			['/a+b.txt', plus],
			['/page.html', page],
			['/sub/index.html', sub],
			['/_app/immutable/chunks/x.js', chunk],
			['/_app/version.json', version]
		],
		aliases: [
			['/page', '/page.html'],
			['/sub/', '/sub/index.html']
		]
	},
	prerendered_assets: { entries: [['/about', about]], aliases: [] }
});

const middleware = serve_static(files);
const server = http.createServer((req, res) =>
	middleware(req, res, () => {
		res.statusCode = 404;
		res.end('next');
	})
);

let origin: string;

beforeAll(async () => {
	await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
	const address = server.address() as { port: number };
	origin = `http://127.0.0.1:${address.port}`;
});

afterAll(async () => {
	await new Promise((resolve) => server.close(resolve));
	fs.rmSync(dir, { recursive: true, force: true });
});

function get(pathname: string, { method = 'GET', headers = {} as Record<string, string> } = {}) {
	return new Promise<{ status: number; headers: http.IncomingHttpHeaders; body: string }>(
		(resolve, reject) => {
			http
				.request(origin + pathname, { method, headers }, (res) => {
					const chunks: Buffer[] = [];
					res.on('data', (chunk) => chunks.push(chunk));
					res.on('end', () =>
						resolve({
							status: res.statusCode ?? 0,
							headers: res.headers,
							body: Buffer.concat(chunks).toString()
						})
					);
				})
				.on('error', reject)
				.end();
		}
	);
}

test('serves a recorded file with its precomputed headers', async () => {
	const response = await get('/plain.txt');
	expect(response.status).toBe(200);
	expect(response.body).toBe('plain');
	expect(response.headers['content-type']).toBe('text/plain');
	expect(response.headers['content-length']).toBe('5');
	expect(response.headers['accept-ranges']).toBe('bytes');
	expect(response.headers['etag']).toBe(`"${plain.etag}"`);
	expect(response.headers['vary']).toBeUndefined();

	const head = await get('/plain.txt', { method: 'HEAD' });
	expect(head.headers['content-length']).toBe('5');
	expect(head.body).toBe('');
});

test('passes unknown paths to the next handler', async () => {
	expect((await get('/missing.txt')).status).toBe(404);
});

test('disallows non-GET/HEAD methods', async () => {
	const post = await get('/plain.txt', { method: 'POST' });
	expect(post.status).toBe(405);
	expect(post.headers['allow']).toBe('GET, HEAD');
});

test('passes non-GET/HEAD requests to non-asset paths to the next handler', async () => {
	const post = await get('/missing.txt', { method: 'POST' });
	expect(post.status).toBe(404);
	expect(post.body).toBe('next');
});

test('decodes percent-encoding but not reserved characters or +', async () => {
	// https://github.com/sveltejs/kit/issues/11766
	expect((await get('/pl%61in.txt')).body).toBe('plain');
	expect((await get('/a+b.txt')).body).toBe('plus');
	expect((await get('/a%2Bb.txt')).status).toBe(404);
	expect((await get('/sub%2Findex.html')).status).toBe(404);
});

test('resolves aliases to their html file', async () => {
	const page = await get('/page');
	expect(page.body).toBe('<h1>page</h1>');
	expect(page.headers['content-type']).toBe('text/html;charset=utf-8');
	expect((await get('/sub/')).body).toBe('<h1>sub</h1>');
});

test('marks assets below the immutable directory only', async () => {
	const immutable = 'public,max-age=31536000,immutable';
	expect((await get('/_app/immutable/chunks/x.js')).headers['cache-control']).toBe(immutable);
	expect((await get('/_app/version.json')).headers['cache-control']).toBeUndefined();
});

test('serves prerendered pages and redirects their non-canonical trailing-slash form', async () => {
	expect((await get('/about')).body).toBe('<h1>about</h1>');

	const redirect = await get('/about/?x=1');
	expect(redirect.status).toBe(308);
	expect(redirect.headers['location']).toBe('../about?x=1');
});

test('answers a matching if-none-match with a 304 that carries the validators', async () => {
	const etag = `"${range.etag}"`;

	for (const header of [etag, `"stale", ${etag}`, `W/${etag}`, '*']) {
		const cached = await get('/range.txt', { headers: { 'if-none-match': header } });
		expect(cached.status, header).toBe(304);
		expect(cached.body).toBe('');
		expect(cached.headers['etag']).toBe(etag);
		expect(cached.headers['vary']).toBe('Accept-Encoding');
	}

	expect((await get('/range.txt', { headers: { 'if-none-match': '"stale"' } })).status).toBe(200);
});

test('serves byte ranges', async () => {
	const single = await get('/range.txt', { headers: { range: 'bytes=0-0' } });
	expect(single.status).toBe(206);
	expect(single.headers['content-range']).toBe('bytes 0-0/10');
	expect(single.headers['content-length']).toBe('1');
	expect(single.body).toBe('0');

	const suffix = await get('/range.txt', { headers: { range: 'bytes=-3' } });
	expect(suffix.headers['content-range']).toBe('bytes 7-9/10');
	expect(suffix.body).toBe('789');

	const open = await get('/range.txt', { headers: { range: 'bytes=4-' } });
	expect(open.body).toBe('456789');

	const clamped = await get('/range.txt', { headers: { range: 'bytes=8-100' } });
	expect(clamped.headers['content-range']).toBe('bytes 8-9/10');

	const unsatisfiable = await get('/range.txt', { headers: { range: 'bytes=10-' } });
	expect(unsatisfiable.status).toBe(416);
	expect(unsatisfiable.headers['content-range']).toBe('bytes */10');

	// a stale `If-Range` validator gets the whole current representation
	const etag = `"${range.etag}"`;
	const fresh = await get('/range.txt', { headers: { range: 'bytes=0-1', 'if-range': etag } });
	expect(fresh.status).toBe(206);
	const stale = await get('/range.txt', { headers: { range: 'bytes=0-1', 'if-range': '"stale"' } });
	expect(stale.status).toBe(200);
	expect(stale.body).toBe('0123456789');
});

test('negotiates the compressed variant', async () => {
	const gzip = await get('/range.txt', { headers: { 'accept-encoding': 'gzip' } });
	expect(gzip.headers['content-encoding']).toBe('gzip');
	expect(gzip.headers['content-length']).toBe(String(range.gz));
	expect(gzip.headers['vary']).toBe('Accept-Encoding');

	const preferred = await get('/range.txt', {
		headers: { 'accept-encoding': 'gzip;q=1, br;q=0.5' }
	});
	expect(preferred.headers['content-encoding']).toBe('gzip');

	const upper = await get('/range.txt', { headers: { 'accept-encoding': 'BR' } });
	expect(upper.headers['content-encoding']).toBe('br');

	const wildcard = await get('/range.txt', { headers: { 'accept-encoding': '*' } });
	expect(wildcard.headers['content-encoding']).toBe('br');

	const rejected = await get('/range.txt', { headers: { 'accept-encoding': 'br;q=0, gzip;q=0' } });
	expect(rejected.headers['content-encoding']).toBeUndefined();
	expect(rejected.body).toBe('0123456789');

	// each representation has its own validator and its own range base
	const br = await get('/range.txt', { headers: { 'accept-encoding': 'br' } });
	expect(br.headers['etag']).toBe(`"${range.etag}.br"`);
	const partial = await get('/range.txt', {
		headers: { 'accept-encoding': 'br', range: 'bytes=0-0' }
	});
	expect(partial.headers['content-range']).toBe(`bytes 0-0/${range.br}`);
});
