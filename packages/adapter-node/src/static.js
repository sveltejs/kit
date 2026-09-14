import fs from 'node:fs';
import path from 'node:path';

/** @typedef {AssetEntry & { type?: string }} Asset */

/**
 * Splits `req.url` into a decoded pathname and the search string.
 * An undecodable pathname is returned as-is, so it misses the asset
 * tables and falls through to SvelteKit's 400
 * @param {import('node:http').IncomingMessage} req
 */
function split_url(req) {
	let pathname = /** @type {string} */ (req.url);
	let search = '';

	const query_index = pathname.indexOf('?');
	if (query_index !== -1) {
		search = pathname.slice(query_index);
		pathname = pathname.slice(0, query_index);
	}

	if (pathname.includes('%')) {
		try {
			pathname = decodeURIComponent(pathname);
		} catch {
			// invalid URI
		}
	}

	return { pathname, search };
}

/**
 * Relative reference from `from` to `to`, which must differ only by a trailing slash.
 * Keep in sync with the copy in `packages/kit/src/utils/url.js`
 * @param {string} from
 * @param {string} to
 * @returns {string}
 */
function relative_pathname(from, to) {
	const segment = to.replace(/\/$/, '').split('/').at(-1);

	return from.endsWith('/') ? `../${segment}` : `${segment}/`;
}

/**
 * Serves the closed set of files recorded in the manifest at adapt time.
 * Everything about a response is precomputed: exact pathname keys, sizes,
 * content-hash ETags, content types and which compressed variants exist,
 * so requests are a map lookup and a stream.
 *
 * @param {string} dir
 * @param {AssetTable} table
 * @param {{
 *   mime_types: Record<string, string>,
 *   immutable_prefix?: string,
 *   redirect_trailing_slash?: boolean
 * }} opts
 * @returns {import('./handler.js').Middleware}
 */
export function serve_static(
	dir,
	table,
	{ mime_types, immutable_prefix, redirect_trailing_slash }
) {
	/** @type {Map<string, Asset>} */
	const files = new Map();

	for (const [key, entry] of table.entries) {
		let type = mime_types[entry.file.slice(entry.file.lastIndexOf('.'))];
		if (type === 'text/html') type += ';charset=utf-8';
		files.set(key, { ...entry, file: path.join(dir, entry.file), type });
	}

	for (const [alias, key] of table.aliases) {
		files.set(alias, /** @type {Asset} */ (files.get(key)));
	}

	return (req, res, next) => {
		const { pathname, search } = split_url(req);

		const entry = files.get(pathname);
		if (!entry) {
			if (redirect_trailing_slash) {
				// redirect to the canonical path when only the trailing slash differs
				const inverted = pathname.at(-1) === '/' ? pathname.slice(0, -1) : pathname + '/';
				if (files.has(inverted)) {
					const location = relative_pathname(pathname, inverted) + search;
					res.writeHead(308, { location }).end();
					return;
				}
			}
			return next();
		}

		let file = entry.file;
		let size = entry.size;
		let etag = entry.etag;

		/** @type {string | undefined} */
		let encoding;

		const accept_encoding = req.headers['accept-encoding'] ?? '';
		if (entry.br && /\bbr\b/.test(accept_encoding)) {
			[size, etag] = entry.br;
			file += '.br';
			encoding = 'br';
		} else if (entry.gz && /\bgzip\b/.test(accept_encoding)) {
			[size, etag] = entry.gz;
			file += '.gz';
			encoding = 'gzip';
		}

		if (req.headers['if-none-match'] === `"${etag}"`) {
			res.writeHead(304).end();
			return;
		}

		/** @type {Record<string, string | number>} */
		const headers = {
			'content-length': size,
			etag: `"${etag}"`,
			'accept-ranges': 'bytes'
		};

		if (entry.type) headers['content-type'] = entry.type;
		if (encoding) headers['content-encoding'] = encoding;
		if (entry.br || entry.gz) headers.vary = 'Accept-Encoding';

		if (immutable_prefix && pathname.startsWith(immutable_prefix)) {
			headers['cache-control'] = 'public,max-age=31536000,immutable';
		}

		/** @type {{ start?: number, end?: number }} */
		const range = {};
		let status = 200;

		if (req.headers.range) {
			const match = /^bytes=(\d*)-(\d*)$/.exec(req.headers.range);

			if (match && (match[1] || match[2])) {
				let start = match[1] ? parseInt(match[1], 10) : NaN;
				let end = match[2] ? parseInt(match[2], 10) : size - 1;

				if (isNaN(start)) {
					// suffix range: the last `match[2]` bytes
					start = Math.max(size - end, 0);
					end = size - 1;
				} else {
					end = Math.min(end, size - 1);
				}

				if (start >= size || start > end) {
					res.writeHead(416, { 'content-range': `bytes */${size}` }).end();
					return;
				}

				status = 206;
				headers['content-range'] = `bytes ${start}-${end}/${size}`;
				headers['content-length'] = end - start + 1;
				range.start = start;
				range.end = end;
			}
		}

		res.writeHead(status, headers);

		if (req.method === 'HEAD') {
			res.end();
			return;
		}

		fs.createReadStream(file, range).pipe(res);
	};
}
