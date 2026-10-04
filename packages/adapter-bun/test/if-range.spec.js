import { afterAll, beforeAll, expect, mock, test } from 'bun:test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import zlib from 'node:zlib';
import { mock_handoff } from './mocks.js';

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'adapter-bun-if-range-'));
const body = '0123456789'.repeat(500);
const etag = '"abc"';

/** @type {import('bun').Server<undefined>} */
let server;

beforeAll(async () => {
	fs.mkdirSync(path.join(dir, 'client'));
	fs.writeFileSync(path.join(dir, 'client', 'asset.txt'), body);
	fs.writeFileSync(path.join(dir, 'client', 'asset.txt.br'), zlib.brotliCompressSync(body));
	mock_handoff({ base: '/', dir });
	const specifier = '../src/routes-util.js?if-range';
	const { client_asset } = /** @type {typeof import('../src/routes-util.js')} */ (
		await import(specifier)
	);
	server = Bun.serve({
		hostname: '127.0.0.1',
		port: 0,
		routes: Object.fromEntries(
			client_asset('asset.txt', undefined, { hash: 'abc', mtime: 0, br: true })
		),
		fetch: () => new Response('Not found', { status: 404 })
	});
});

afterAll(async () => {
	if (server) await server.stop(true);
	fs.rmSync(dir, { recursive: true, force: true });
	mock.restore();
});

test.each(['"old"', 'W/"abc"', '"abc-br"', 'Thu, 01 Jan 1970 00:00:00 GMT'])(
	'ignores Range when If-Range is not a matching strong ETag: %s',
	async (validator) => {
		const response = await get({ range: 'bytes=0-3', 'if-range': validator });
		expect(response.status).toBe(200);
		expect(response.headers['content-range']).toBeUndefined();
		expect(response.headers.etag).toBe(etag);
		expect(response.body).toBe(body);
	}
);

test.each([{}, { 'if-range': etag }])('preserves native ranges for %j', async (headers) => {
	const response = await get({ ...headers, range: 'bytes=0-3' });
	expect(response.status).toBe(206);
	expect(response.headers['content-range']).toBe(`bytes 0-3/${body.length}`);
	expect(response.body).toBe(body.slice(0, 4));
});

test('does not combine a cached compressed representation with an identity range', async () => {
	const compressed = await get({ 'accept-encoding': 'br' });
	expect(compressed.headers['content-encoding']).toBe('br');
	const response = await get({
		'accept-encoding': 'br',
		range: 'bytes=0-3',
		'if-range': String(compressed.headers.etag)
	});
	expect(response.status).toBe(200);
	expect(response.headers['content-encoding']).toBeUndefined();
	expect(response.body).toBe(body);
});

test('preserves native unsatisfiable range responses with a matching ETag', async () => {
	const response = await get({ range: 'bytes=99999-', 'if-range': etag });
	expect(response.status).toBe(416);
});

test('does not send a body for HEAD with a mismatched If-Range', async () => {
	const response = await get({ range: 'bytes=0-3', 'if-range': '"old"' }, 'HEAD');
	expect(response.status).toBe(200);
	expect(response.body).toBe('');
});

test('evaluates If-None-Match before If-Range', async () => {
	const response = await get({
		range: 'bytes=0-3',
		'if-range': '"old"',
		'if-none-match': etag
	});
	expect(response.status).toBe(304);
	expect(response.body).toBe('');
});

test('ignores If-Range when no Range header is present', async () => {
	const response = await get({ 'if-range': '"old"' });
	expect(response.status).toBe(200);
	expect(response.body).toBe(body);
});

test('returns the entire representation for stale If-Range and an unsatisfiable range', async () => {
	const response = await get({ range: 'bytes=99999-', 'if-range': '"old"' });
	expect(response.status).toBe(200);
	expect(response.body).toBe(body);
});

/**
 * @param {http.OutgoingHttpHeaders} headers
 * @param {string} [method]
 * @returns {Promise<{ status: number | undefined, headers: http.IncomingHttpHeaders, body: string }>}
 */
function get(headers, method = 'GET') {
	return new Promise((resolve, reject) => {
		const request = http.get(new URL('/asset.txt', server.url), { headers, method }, (response) => {
			/** @type {Buffer[]} */
			const chunks = [];
			response.on('data', (chunk) => chunks.push(chunk));
			response.on('end', () =>
				resolve({
					status: response.statusCode,
					headers: response.headers,
					body: Buffer.concat(chunks).toString()
				})
			);
			response.on('error', reject);
		});
		request.on('error', reject);
	});
}
