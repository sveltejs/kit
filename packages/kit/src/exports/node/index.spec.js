import { PassThrough } from 'node:stream';
import { expect, test } from 'vitest';
import { getRequest } from './index.js';

/**
 * @param {{
 * 	headers?: Record<string, string>;
 * 	bodySizeLimit?: number;
 * }} [options]
 */
async function create_request(options = {}) {
	const req = new PassThrough();
	const incoming = /** @type {import('http').IncomingMessage} */ (/** @type {unknown} */ (req));

	incoming.headers = {
		'content-type': 'text/plain',
		...options.headers
	};
	incoming.method = 'POST';
	incoming.url = '/';
	incoming.httpVersionMajor = 1;

	return {
		request: await getRequest({
			request: incoming,
			base: 'http://localhost',
			bodySizeLimit: options.bodySizeLimit
		}),
		req
	};
}

test('rejects chunked request bodies that exceed body size limit', async () => {
	const { request, req } = await create_request({
		headers: { 'transfer-encoding': 'chunked' },
		bodySizeLimit: 10
	});

	const text = request.text();

	req.write(Buffer.from('0123456789'));
	req.write(Buffer.from('x'));
	req.end();

	await expect(text).rejects.toMatchObject({
		status: 413,
		text: 'Payload Too Large',
		message: 'request body size exceeded BODY_SIZE_LIMIT of 10'
	});
});

test('allows chunked request bodies within body size limit', async () => {
	const { request, req } = await create_request({
		headers: { 'transfer-encoding': 'chunked' },
		bodySizeLimit: 10
	});

	const text = request.text();

	req.write(Buffer.from('0123456789'));
	req.end();

	await expect(text).resolves.toBe('0123456789');
});

test('rejects request bodies that exceed content-length', async () => {
	const { request, req } = await create_request({
		headers: { 'content-length': '4' }
	});

	const text = request.text();

	req.write(Buffer.from('01234'));
	req.end();

	await expect(text).rejects.toMatchObject({
		status: 413,
		text: 'Payload Too Large',
		message: 'request body size exceeded content-length of 4'
	});
});

// Test for fix of CVE-2026-40073
test('requests with no content-length and no transfer-encoding return null body', async () => {
	const { request, req } = await create_request({
		headers: {},
		bodySizeLimit: 10
	});

	const text = request.text();

	req.write(Buffer.from('0123456789a')); // 11 bytes, over limit
	req.end();

	await expect(text).resolves.toBe(''); // Should return an empty string if bug is actually fixed
});
