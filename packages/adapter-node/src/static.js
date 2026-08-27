import fs from 'node:fs';
import path from 'node:path';

/** @typedef {AssetEntry & { type?: string }} Asset */

/**
 * Splits `req.url` into a decoded pathname and the search string.
 * Decoding follows kit's router: reserved characters such as `%2F` stay
 * encoded. An undecodable pathname is returned as-is, so it misses the
 * asset table and falls through to SvelteKit's 400
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
			pathname = pathname.split('%25').map(decodeURI).join('%25');
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
 * Parses `Accept-Encoding` and picks the preferred variant that exists
 * @param {string | undefined} header
 * @param {Asset} asset
 * @returns {'br' | 'gzip' | undefined}
 */
function negotiate(header, asset) {
	if (!header) return;

	/** @type {Map<string, number>} */
	const weights = new Map();

	for (const part of header.toLowerCase().split(',')) {
		const [coding, ...params] = part.split(';');
		let weight = 1;

		for (const param of params) {
			const [name, value] = param.split('=');
			if (name.trim() === 'q') weight = parseFloat(value) || 0;
		}

		weights.set(coding.trim(), weight);
	}

	const wildcard = weights.get('*') ?? 0;

	/** @type {'br' | 'gzip' | undefined} */
	let best;
	let best_weight = 0;

	if (asset.br) {
		best_weight = weights.get('br') ?? wildcard;
		if (best_weight > 0) best = 'br';
	}

	if (asset.gz && (weights.get('gzip') ?? wildcard) > best_weight) best = 'gzip';

	return best;
}

/**
 * Whether an `If-None-Match` value matches `etag`, using weak comparison
 * @param {string | undefined} header
 * @param {string} etag
 */
function etag_matches(header, etag) {
	if (!header) return false;
	if (header.trim() === '*') return true;

	return header.split(',').some((tag) => tag.trim().replace(/^W\//, '') === etag);
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
		if (req.method !== 'GET' && req.method !== 'HEAD') return next();

		const { pathname, search } = split_url(req);

		const asset = files.get(pathname);
		if (!asset) {
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

		let file = asset.file;
		let size = asset.size;
		let etag = `"${asset.etag}"`;

		const encoding = negotiate(req.headers['accept-encoding'], asset);
		if (encoding === 'br') {
			size = /** @type {number} */ (asset.br);
			file += '.br';
			etag = `"${asset.etag}.br"`;
		} else if (encoding === 'gzip') {
			size = /** @type {number} */ (asset.gz);
			file += '.gz';
			etag = `"${asset.etag}.gz"`;
		}

		/** @type {Record<string, string | number>} */
		const headers = { etag };

		if (asset.br || asset.gz) headers.vary = 'Accept-Encoding';

		if (immutable_prefix && pathname.startsWith(immutable_prefix)) {
			headers['cache-control'] = 'public,max-age=31536000,immutable';
		}

		if (etag_matches(req.headers['if-none-match'], etag)) {
			res.writeHead(304, headers).end();
			return;
		}

		headers['content-length'] = size;
		headers['accept-ranges'] = 'bytes';
		if (asset.type) headers['content-type'] = asset.type;
		if (encoding) headers['content-encoding'] = encoding;

		/** @type {{ start?: number, end?: number }} */
		const range = {};
		let status = 200;

		// a stale `If-Range` validator means the client's partial copy is of an older
		// representation, so it gets the whole current one
		const if_range = req.headers['if-range'];
		if (req.headers.range && (!if_range || if_range === etag)) {
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

		// headers are already sent, so all we can do is drop the connection
		fs.createReadStream(file, range)
			.on('error', () => res.destroy())
			.pipe(res);
	};
}
