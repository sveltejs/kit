import * as set_cookie_parser from 'set-cookie-parser';

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

	if (req.destroyed) {
		const readable = new ReadableStream();
		readable.cancel();
		return readable;
	}

	let size = 0;
	let cancelled = false;

	return new ReadableStream({
		start(controller) {
			req.on('error', (error) => {
				controller.error(error);
			});

			req.on('end', () => {
				if (cancelled) return;
				controller.close();
			});

			req.on('data', (chunk) => {
				if (cancelled) return;

				size += chunk.length;
				if (size > length) {
					controller.error(new Error('content-length exceeded'));
					return;
				}

				controller.enqueue(chunk);

				if (controller.desiredSize === null || controller.desiredSize <= 0) {
					req.pause();
				}
			});
		},

		pull() {
			req.resume();
		},

		cancel(reason) {
			cancelled = true;
			req.destroy(reason);
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

	return new Request(base + req.url, {
		method: req.method,
		headers,
		body: get_raw_body(req)
	});
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

	if (!response.body) {
		res.end();
		return;
	}

	const reader = response.body.getReader();

	if (res.destroyed) {
		reader.cancel();
		return;
	}

	const cancel = (/** @type {Error|undefined} */ error) => {
		res.off('close', cancel);
		res.off('error', cancel);

		// If the reader has already been interrupted with an error earlier,
		// then it will appear here, it is useless, but it needs to be catch.
		reader.cancel(error).catch(() => {});
		if (error) res.destroy(error);
	};

	res.on('close', cancel);
	res.on('error', cancel);

	next();
	async function next() {
		try {
			for (;;) {
				const { done, value } = await reader.read();

				if (done) break;

				if (!res.write(value)) {
					res.once('drain', next);
					return;
				}
			}
			res.end();
		} catch (error) {
			cancel(error instanceof Error ? error : new Error(String(error)));
		}
	}
}
