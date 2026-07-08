import { EventEmitter, once } from 'node:events';
import { PassThrough } from 'node:stream';
import { expect, test, vi } from 'vitest';
import { getRequest, setResponse } from './index.js';

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

/**
 * Minimal `ServerResponse` stand-in that emits `finish` when ended.
 * @param {import('http').IncomingMessage} req
 */
function create_response(req) {
	const res = /** @type {any} */ (new EventEmitter());
	res.req = req;
	res.destroyed = false;
	res.setHeader = () => {};
	res.getHeaderNames = () => [];
	res.writeHead = () => res;
	res.write = () => true;
	res.end = () => {
		res.emit('finish');
		res.emit('close');
	};
	return /** @type {import('http').ServerResponse} */ (res);
}

/**
 * @param {Record<string, string>} [headers]
 * @param {import('stream').PassThrough} [stream]
 */
async function setup_post_request(headers = {}, stream) {
	const req = stream ?? new PassThrough();
	const incoming = /** @type {import('http').IncomingMessage} */ (/** @type {unknown} */ (req));
	incoming.headers = {
		'content-type': 'text/plain',
		...headers
	};
	incoming.method = 'POST';
	incoming.url = '/';
	incoming.httpVersionMajor = 1;

	const request = await getRequest({ request: incoming, base: 'http://localhost' });

	return { req, incoming, request };
}

/**
 * @param {import('stream').PassThrough} req
 */
async function expect_request_drained(req) {
	if (!req.readableEnded) await once(req, 'end');
	expect(req.readableEnded).toBe(true);
}

// https://github.com/sveltejs/kit/issues/14916
// https://github.com/sveltejs/kit/issues/15526
test('drains an unconsumed request body once the response finishes', async () => {
	const { req, incoming } = await setup_post_request({ 'content-length': '30' });

	// route never reads the body (e.g. a page route returning 405)
	req.write(Buffer.from('0123456789'));
	req.write(Buffer.from('0123456789'));
	req.write(Buffer.from('0123456789'));
	req.end();

	await setResponse(create_response(incoming), new Response(null, { status: 405 }));

	await expect_request_drained(req);
});

test('drains an unconsumed chunked request body once the response finishes', async () => {
	const { req, incoming } = await setup_post_request({ 'transfer-encoding': 'chunked' });

	req.write(Buffer.from('0123456789'));
	req.write(Buffer.from('0123456789'));
	req.write(Buffer.from('0123456789'));
	req.end();

	await setResponse(create_response(incoming), new Response(null, { status: 405 }));

	await expect_request_drained(req);
});

test('closes the request body stream after draining an unconsumed body', async () => {
	const { req, incoming, request } = await setup_post_request({ 'content-length': '30' });

	req.write(Buffer.from('0123456789'));
	req.write(Buffer.from('0123456789'));
	req.write(Buffer.from('0123456789'));
	req.end();

	await setResponse(create_response(incoming), new Response(null, { status: 405 }));

	await expect_request_drained(req);

	// the unconsumed body stream should be closed (not left hanging), so reading
	// it to completion resolves rather than blocking forever
	const reader = /** @type {ReadableStream} */ (request.body).getReader();
	for (;;) {
		const { done } = await reader.read();
		if (done) break;
	}
});

test('drains the remainder of a partially consumed request body', async () => {
	const { req, incoming, request } = await setup_post_request({ 'content-length': '30' });

	req.write(Buffer.from('0123456789'));
	req.write(Buffer.from('0123456789'));
	req.write(Buffer.from('0123456789'));

	const reader = request.body?.getReader();
	if (!reader) throw new Error('expected request body');

	await reader.read();

	req.end();

	await setResponse(create_response(incoming), new Response(null, { status: 200 }));

	await expect_request_drained(req);
});

test('does not remove unrelated data listeners when draining', async () => {
	const req = new PassThrough();
	const unrelated = vi.fn();
	req.on('data', unrelated);

	const { incoming } = await setup_post_request({ 'content-length': '10' }, req);

	req.write(Buffer.from('0123456789'));
	req.end();

	await setResponse(create_response(incoming), new Response(null, { status: 405 }));

	await expect_request_drained(req);
	expect(unrelated).toHaveBeenCalled();
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
