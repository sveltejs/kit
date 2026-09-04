import { EventEmitter, once } from 'node:events';
import { validateHeaderValue } from 'node:http';
import { PassThrough } from 'node:stream';
import { expect, test, vi } from 'vitest';
import { getRequest, setResponse } from './index.js';

/**
 * @param {{
 * 	headers?: Record<string, string>;
 * 	bodySizeLimit?: number;
 * }} [options]
 */
function create_request(options = {}) {
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
		request: getRequest({
			request: incoming,
			base: 'http://localhost',
			bodySizeLimit: options.bodySizeLimit
		}),
		req
	};
}

test('rejects chunked request bodies that exceed body size limit', async () => {
	const { request, req } = create_request({
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
	const { request, req } = create_request({
		headers: { 'transfer-encoding': 'chunked' },
		bodySizeLimit: 10
	});

	const text = request.text();

	req.write(Buffer.from('0123456789'));
	req.end();

	await expect(text).resolves.toBe('0123456789');
});

test('rejects request bodies that exceed content-length', async () => {
	const { request, req } = create_request({
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
 * Minimal `ServerResponse` stand-in that records headers and body writes and
 * emits `finish` when ended.
 * @param {import('http').IncomingMessage} [req]
 */
function create_response(req) {
	const res = /** @type {any} */ (new EventEmitter());
	res.req = req;
	res.destroyed = false;
	res.headers = new Map();
	res.chunks = [];
	res.setHeader = (/** @type {string} */ name, /** @type {unknown} */ value) => {
		validateHeaderValue(name, value);
		res.headers.set(name.toLowerCase(), value);
	};
	res.hasHeader = (/** @type {string} */ name) => res.headers.has(name.toLowerCase());
	res.getHeaderNames = () => [...res.headers.keys()];
	res.removeHeader = (/** @type {string} */ name) => res.headers.delete(name.toLowerCase());
	res.writeHead = (/** @type {number} */ status) => {
		res.statusCode = status;
		return res;
	};
	res.write = (/** @type {unknown} */ chunk) => {
		res.chunks.push(chunk);
		return true;
	};
	res.end = (/** @type {unknown} */ chunk) => {
		if (chunk !== undefined) res.chunks.push(chunk);
		res.emit('finish');
		res.emit('close');
	};
	return /** @type {import('http').ServerResponse} */ (res);
}

/**
 * @param {Record<string, string>} [headers]
 * @param {import('stream').PassThrough} [stream]
 * @param {import('http').ServerResponse} [response]
 */
function setup_post_request(headers = {}, stream, response) {
	const req = stream ?? new PassThrough();
	const incoming = /** @type {import('http').IncomingMessage} */ (/** @type {unknown} */ (req));
	incoming.headers = {
		'content-type': 'text/plain',
		...headers
	};
	incoming.method = 'POST';
	incoming.url = '/';
	incoming.httpVersionMajor = 1;

	const request = getRequest({ request: incoming, response, base: 'http://localhost' });

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
	const { req, incoming } = setup_post_request({ 'content-length': '30' });

	// route never reads the body (e.g. a page route returning 405)
	req.write(Buffer.from('0123456789'));
	req.write(Buffer.from('0123456789'));
	req.write(Buffer.from('0123456789'));
	req.end();

	setResponse(create_response(incoming), new Response(null, { status: 405 }));

	await expect_request_drained(req);
});

test('drains an unconsumed chunked request body once the response finishes', async () => {
	const { req, incoming } = setup_post_request({ 'transfer-encoding': 'chunked' });

	req.write(Buffer.from('0123456789'));
	req.write(Buffer.from('0123456789'));
	req.write(Buffer.from('0123456789'));
	req.end();

	setResponse(create_response(incoming), new Response(null, { status: 405 }));

	await expect_request_drained(req);
});

test('closes the request body stream after draining an unconsumed body', async () => {
	const { req, incoming, request } = setup_post_request({ 'content-length': '30' });

	req.write(Buffer.from('0123456789'));
	req.write(Buffer.from('0123456789'));
	req.write(Buffer.from('0123456789'));
	req.end();

	setResponse(create_response(incoming), new Response(null, { status: 405 }));

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
	const { req, incoming, request } = setup_post_request({ 'content-length': '30' });

	req.write(Buffer.from('0123456789'));
	req.write(Buffer.from('0123456789'));
	req.write(Buffer.from('0123456789'));

	const reader = request.body?.getReader();
	if (!reader) throw new Error('expected request body');

	await reader.read();

	req.end();

	setResponse(create_response(incoming), new Response(null, { status: 200 }));

	await expect_request_drained(req);
});

test('does not remove unrelated data listeners when draining', async () => {
	const req = new PassThrough();
	const unrelated = vi.fn();
	req.on('data', unrelated);

	const { incoming } = setup_post_request({ 'content-length': '10' }, req);

	req.write(Buffer.from('0123456789'));
	req.end();

	setResponse(create_response(incoming), new Response(null, { status: 405 }));

	await expect_request_drained(req);
	expect(unrelated).toHaveBeenCalled();
});

// https://github.com/sveltejs/kit/issues/16778
test('aborts the request signal when the response closes before finishing', async () => {
	const res = /** @type {any} */ (new EventEmitter());
	res.writableEnded = false;

	const { req, request } = setup_post_request({ 'content-length': '10' }, undefined, res);

	// fully read the body, so the request stream can no longer report the disconnect
	req.write(Buffer.from('0123456789'));
	req.end();
	await request.text();

	res.emit('close');

	expect(request.signal.aborted).toBe(true);
});

test('does not abort the request signal when the response finishes normally', async () => {
	const res = /** @type {any} */ (new EventEmitter());
	res.writableEnded = true;

	const { req, request } = setup_post_request({ 'content-length': '10' }, undefined, res);

	req.write(Buffer.from('0123456789'));
	req.end();
	await request.text();

	res.emit('close');

	expect(request.signal.aborted).toBe(false);
});

test('responds with a 500 when Node rejects a header, instead of leaving the request open', async () => {
	const res = /** @type {any} */ (create_response());
	const finished = once(res, 'finish');

	setResponse(res, new Response('{}', { headers: { 'x-test': '\u001f' } }));

	await finished;
	expect(res.statusCode).toBe(500);
	expect(res.headers.size).toBe(0);
	expect(Buffer.concat(res.chunks.map(Buffer.from)).toString()).toMatch('ERR_INVALID_CHAR');
});

test('sends fixed response bodies with a content-length', async () => {
	const res = /** @type {any} */ (create_response());
	const finished = once(res, 'finish');

	setResponse(res, Response.json({ snowman: '☃' }));

	await finished;
	expect(res.headers.get('content-length')).toBe(Buffer.byteLength('{"snowman":"☃"}'));
	expect(Buffer.concat(res.chunks).toString()).toBe('{"snowman":"☃"}');
});

test('sends empty fixed bodies with a zero content-length', async () => {
	const res = /** @type {any} */ (create_response());
	const finished = once(res, 'finish');

	setResponse(res, new Response(''));

	await finished;
	expect(res.headers.get('content-length')).toBe(0);
	expect(res.chunks).toEqual([]);
});

// proxied responses can carry a transfer-encoding header copied from the
// upstream hop; adding a content-length next to it would be invalid
test('does not add a content-length to responses with a transfer-encoding', async () => {
	const res = /** @type {any} */ (create_response());
	const finished = once(res, 'finish');

	setResponse(res, new Response('hello', { headers: { 'transfer-encoding': 'chunked' } }));

	await finished;
	expect(res.headers.has('content-length')).toBe(false);
	expect(Buffer.concat(res.chunks).toString()).toBe('hello');
});

test('does not overwrite an explicit content-length header', async () => {
	const res = /** @type {any} */ (create_response());
	const finished = once(res, 'finish');

	setResponse(res, new Response('hello', { headers: { 'content-length': '999' } }));

	await finished;
	expect(res.headers.get('content-length')).toBe('999');
	expect(Buffer.concat(res.chunks).toString()).toBe('hello');
});

test('streams bodies that do not settle within a tick, without a content-length', async () => {
	const res = /** @type {any} */ (create_response());

	let controller = /** @type {ReadableStreamDefaultController} */ (/** @type {any} */ (null));
	const body = new ReadableStream({
		start(c) {
			controller = c;
			c.enqueue(new TextEncoder().encode('first'));
		}
	});

	setResponse(res, new Response(body));

	// headers and the first chunk must go out while the stream is still open
	await vi.waitFor(() => expect(res.chunks.length).toBe(1));
	expect(res.headers.has('content-length')).toBe(false);

	const finished = once(res, 'finish');
	controller.enqueue(new TextEncoder().encode(' second'));
	controller.close();
	await finished;
	expect(Buffer.concat(res.chunks).toString()).toBe('first second');
});

// Test for fix of CVE-2026-40073
test('requests with no content-length and no transfer-encoding return null body', async () => {
	const { request, req } = create_request({
		headers: {},
		bodySizeLimit: 10
	});

	const text = request.text();

	req.write(Buffer.from('0123456789a')); // 11 bytes, over limit
	req.end();

	await expect(text).resolves.toBe(''); // Should return an empty string if bug is actually fixed
});
