/** @import { IncomingMessage, ServerResponse } from 'node:http' */
import fs from 'node:fs';
import path from 'node:path';
import { pipeline } from 'node:stream';

/**
 * @typedef {(req: IncomingMessage, res: ServerResponse, next: () => void | Promise<void>) => void | Promise<void>} Middleware
 * @typedef {AssetEntry & { type?: string, cache_control?: string }} Asset
 * @typedef {Asset | { location: string }} Entry
 */

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
 * @returns {'br' | 'gz' | undefined}
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

	/** @param {string} coding */
	const weight = (coding) => weights.get(coding) ?? weights.get('*') ?? 0;

	const br = asset.br ? weight('br') : 0;
	const gzip = asset.gz ? weight('gzip') : 0;

	if (gzip > br) return 'gz';
	if (br > 0) return 'br';
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
 * Absolute file paths and content types for one table
 * @param {string} dir
 * @param {AssetTable} table
 * @param {Record<string, string>} mime_types
 * @returns {Map<string, Asset>}
 */
function resolve(dir, table, mime_types) {
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

	return files;
}

/**
 * One lookup for every request, decided at boot: client assets (immutable below
 * `app_path`), prerendered pages, and a 308 from the non-canonical trailing-slash
 * form of a prerendered path to the canonical one. Client assets win a collision
 * @param {{
 *   dir: string,
 *   base: string,
 *   app_path: string,
 *   mime_types: Record<string, string>,
 *   assets: AssetTable,
 *   prerendered_assets: AssetTable
 * }} opts
 * @returns {Map<string, Entry>}
 */
export function create_file_map({ dir, base, app_path, mime_types, assets, prerendered_assets }) {
	/** @type {Map<string, Entry>} */
	const files = resolve(`${dir}/client${base}`, assets, mime_types);

	const immutable = `/${app_path}/immutable/`;
	for (const [key, asset] of files) {
		if (key.startsWith(immutable)) {
			/** @type {Asset} */ (asset).cache_control = 'public,max-age=31536000,immutable';
		}
	}

	const prerendered = resolve(`${dir}/prerendered${base}`, prerendered_assets, mime_types);
	for (const [key, asset] of prerendered) {
		if (!files.has(key)) files.set(key, asset);
	}

	for (const key of prerendered.keys()) {
		const inverted = key.at(-1) === '/' ? key.slice(0, -1) : key + '/';
		if (inverted && !files.has(inverted)) {
			files.set(inverted, { location: relative_pathname(inverted, key) });
		}
	}

	return files;
}

/**
 * Serves the closed set of files recorded at adapt time. Everything about a
 * response is decided before the first request, so a request is one map
 * lookup, header negotiation and a stream
 * @param {Map<string, Entry>} files
 * @returns {Middleware}
 */
export function serve_static(files) {
	return (req, res, next) => {
		if (req.method !== 'GET' && req.method !== 'HEAD') {
			res.writeHead(405, { allow: 'GET, HEAD' });
			res.end();
			return;
		}

		const { pathname, search } = split_url(req);

		const asset = files.get(pathname);
		if (!asset) return next();

		if ('location' in asset) {
			res.writeHead(308, { location: asset.location + search }).end();
			return;
		}

		let file = asset.file;
		let size = asset.size;
		let etag = `"${asset.etag}"`;

		const variant = negotiate(req.headers['accept-encoding'], asset);
		if (variant) {
			size = /** @type {number} */ (asset[variant]);
			file += `.${variant}`;
			etag = `"${asset.etag}.${variant}"`;
		}

		/** @type {Record<string, string | number>} */
		const headers = { etag };

		if (asset.br || asset.gz) headers.vary = 'Accept-Encoding';
		if (asset.cache_control) headers['cache-control'] = asset.cache_control;

		if (etag_matches(req.headers['if-none-match'], etag)) {
			res.writeHead(304, headers).end();
			return;
		}
		headers['content-length'] = size;
		headers['accept-ranges'] = 'bytes';
		if (asset.type) headers['content-type'] = asset.type;
		if (variant) headers['content-encoding'] = variant === 'gz' ? 'gzip' : 'br';

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

		// the headers are already sent, so a failed read can only drop the connection.
		// `pipeline` also closes the file when the client goes away mid-transfer
		pipeline(fs.createReadStream(file, range), res, () => {});
	};
}
