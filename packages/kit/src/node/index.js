import * as set_cookie_parser from 'set-cookie-parser';
import { Request as NodeFetchRequest } from 'node-fetch';
import { Readable } from 'stream';

/** @param {import('http').IncomingMessage} req */
function get_raw_body(req) {
	const h = req.headers;

	if (!h['content-type']) {
		return null;
	}

	const length = Number(h['content-length']);

	// check if no request body
	// https://github.com/jshttp/type-is/blob/c1f4388c71c8a01f79934e68f630ca4a15fffcd6/index.js#L81-L95
	if (isNaN(length) && h['transfer-encoding'] == null) {
		return null;
	}

	return new ReadableStream({
		start(controller) {
			req.on('error', (error) => {
				controller.error(error);
			});

			let size = 0;

			req.on('data', (chunk) => {
				size += chunk.length;

				if (size > length) {
					controller.error(new Error('content-length exceeded'));
				}

				controller.enqueue(chunk);
			});

			req.on('end', () => {
				controller.close();
			});
		}
	});
}

/** @type {import('@sveltejs/kit/node').getRequest} */
export async function getRequest(base, req) {
	let headers = /** @type {Record<string, string>} */ (req.headers);
	if (req.httpVersionMajor === 2) {
		// we need to strip out the HTTP/2 pseudo-headers because node-fetch's
		// Request implementation doesn't like them
		// TODO is this still true with Node 18
		headers = Object.assign({}, headers);
		delete headers[':method'];
		delete headers[':path'];
		delete headers[':authority'];
		delete headers[':scheme'];
	}

	const request = new Request(base + req.url, {
		method: req.method,
		headers,
		body: get_raw_body(req)
	});

	request.formData = async () => {
		return new NodeFetchRequest(request.url, {
			method: request.method,
			headers: request.headers,
			// @ts-expect-error TypeScript doesn't understand that ReadableStream implements Symbol.asyncIterator
			body: request.body && Readable.from(request.body)
		}).formData();
	};

	return request;
}

/** @type {import('@sveltejs/kit/node').setResponse} */
export async function setResponse(res, response) {
	const headers = Object.fromEntries(response.headers);

	if (response.headers.has('set-cookie')) {
		const header = /** @type {string} */ (response.headers.get('set-cookie'));
		const split = set_cookie_parser.splitCookiesString(header);

		// @ts-expect-error
		headers['set-cookie'] = split;
	}

	res.writeHead(response.status, headers);

	if (response.body) {
		let cancelled = false;

		const reader = response.body.getReader();

		res.on('close', () => {
			reader.cancel();
			cancelled = true;
		});

		const next = async () => {
			const { done, value } = await reader.read();

			if (cancelled) return;

			if (done) {
				res.end();
				return;
			}

			res.write(Buffer.from(value), (error) => {
				if (error) {
					console.error('Error writing stream', error);
					res.end();
				} else {
					next();
				}
			});
		};

		next();
	} else {
		res.end();
	}
}
