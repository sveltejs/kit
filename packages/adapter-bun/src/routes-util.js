/** @import { BunFile, BunRequest, Serve } from 'bun' */
import { manifest, base, embed } from 'MANIFEST';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// not Bun.main: when the built server is imported from a wrapper script rather than
// run directly, Bun.main is the wrapper and every asset path resolves wrong
const dir = path.dirname(fileURLToPath(import.meta.url));

/**
 * @typedef {Serve.Routes<never, string>[string]} RouteHandler
 * @typedef {{ hash: string, mtime: number, br?: boolean, gz?: boolean }} AssetMeta
 */

const CONTENT_ENCODING = { br: 'br', gz: 'gzip' };

// the URL Standard's path percent-encode set, plus `%` and `\` so they stay literal
// eslint-disable-next-line no-control-regex -- control characters are part of the encode set
const ESCAPED_PATH_CHAR = /[\u0000-\u001f\u007f-\u{10ffff} "#<>?`{}%\\]/gu;

/**
 * WHATWG path serialization: the exact bytes user agents put on the wire, because
 * Bun matches route keys against the raw request pathname.
 * @param {string} pathname
 * @returns {string}
 */
function encode_pathname(pathname) {
	return pathname.replace(ESCAPED_PATH_CHAR, (char) => encodeURIComponent(char));
}

/**
 * Registers a path both as user agents send it and fully percent-encoded,
 * so clients that escape sub-delims still match.
 * @param {string} pathname
 * @returns {string[]}
 */
function route_paths(pathname) {
	const minimal = encode_pathname(pathname);
	const full = pathname.split('/').map(encodeURIComponent).join('/');
	return minimal === full ? [minimal] : [minimal, full];
}

/**
 * @param {string} url
 * @returns {string[]}
 */
function to_paths(url) {
	return route_paths(path.posix.join(base, url));
}

/**
 * @param {string} url
 * @returns {string[]}
 */
function to_directory_paths(url) {
	const directory = `${path.posix.join(base, url).replace(/\/$/, '')}/`;
	const paths = route_paths(directory);

	// `/dir` serves `dir/index.html` like sirv does in adapter-node
	if (directory !== '/') {
		paths.push(...route_paths(directory.slice(0, -1)));
	}

	return paths;
}

/**
 * If-None-Match takes precedence over If-Modified-Since (RFC 9110 §13.1.3);
 * dates compare at whole-second precision because HTTP dates have none finer.
 * @param {Request} request
 * @param {string} etag
 * @param {number} mtime
 * @returns {boolean}
 */
function is_fresh(request, etag, mtime) {
	const header = request.headers.get('if-none-match');
	if (header !== null) {
		return header.split(',').some((value) => {
			const tag = value.trim().replace(/^W\//, '');
			return tag === '*' || tag === etag;
		});
	}

	const since = Date.parse(request.headers.get('if-modified-since') ?? '');
	return Number.isFinite(since) && Math.trunc(mtime / 1000) <= Math.trunc(since / 1000);
}

/**
 * @param {string | null} accept
 * @param {AssetMeta} meta
 * @returns {'br' | 'gz' | null}
 */
function negotiate(accept, meta) {
	if (accept === null || (!meta.br && !meta.gz)) return null;

	const accepted = new Set();
	for (const part of accept.split(',')) {
		const [name = '', ...params] = part.trim().toLowerCase().split(';');
		if (params.some((param) => /^q=0(\.0*)?$/.test(param.trim()))) continue;
		accepted.add(name.trim());
	}

	if (meta.br && (accepted.has('br') || accepted.has('*'))) return 'br';
	if (meta.gz && (accepted.has('gzip') || accepted.has('*'))) return 'gz';
	return null;
}

/**
 * Bun does not route HEAD requests to a GET function handler, so every route
 * registers both methods.
 * @param {((request: BunRequest) => Response) | Response} handler
 * @returns {RouteHandler}
 */
function handlers(handler) {
	return { GET: handler, HEAD: handler };
}

/**
 * Serves one file with its build-time validator and precompressed variants.
 * @param {string} file
 * @param {AssetMeta} meta
 * @param {Record<string, string>} [extra_headers]
 * @returns {RouteHandler}
 */
function file_route(file, meta, extra_headers = {}) {
	const content_type = Bun.file(file).type;
	const last_modified = new Date(meta.mtime).toUTCString();

	/** @param {BunRequest} request */
	const handler = (request) => {
		// Bun serializes Range itself for file bodies; ranges apply to the identity representation
		const encoding =
			request.headers.get('range') === null
				? negotiate(request.headers.get('accept-encoding'), meta)
				: null;
		const etag = encoding === null ? `"${meta.hash}"` : `"${meta.hash}-${encoding}"`;

		/** @type {Record<string, string>} */
		const response_headers = {
			'content-type': content_type,
			...extra_headers,
			etag,
			'last-modified': last_modified
		};
		if (meta.br || meta.gz) response_headers['vary'] = 'accept-encoding';

		if (is_fresh(request, etag, meta.mtime)) {
			return new Response(null, { status: 304, headers: response_headers });
		}
		if (encoding === null) {
			return new Response(Bun.file(file), { headers: response_headers });
		}

		response_headers['content-encoding'] = CONTENT_ENCODING[encoding];
		return new Response(Bun.file(`${file}.${encoding}`), { headers: response_headers });
	};

	return handlers(handler);
}

/**
 * @param {string} url
 * @param {string | undefined} filename
 * @param {AssetMeta} meta
 * @returns {Array<[string, RouteHandler]>}
 */
export function client_asset(url, filename = url, meta) {
	const immutable = url.startsWith(`${manifest.appDir}/immutable/`);
	const route = file_route(
		embed ? filename : path.resolve(dir, 'client', filename),
		meta,
		immutable ? { 'cache-control': 'public,max-age=31536000,immutable' } : {}
	);

	const paths = to_paths(url);
	if (url.endsWith('/index.html') || url === 'index.html') {
		paths.push(...to_directory_paths(url.slice(0, -'index.html'.length)));
	} else if (url.endsWith('.html')) {
		// sirv also serves `page.html` at `/page`
		paths.push(...to_paths(url.slice(0, -'.html'.length)));
	}

	return paths.map((route_path) => /** @type {[string, RouteHandler]} */ ([route_path, route]));
}

/**
 * @param {string} url
 * @param {string} [filename]
 * @returns {BunFile}
 */
export function server_asset(url, filename = url) {
	return Bun.file(embed ? filename : path.resolve(dir, 'client', url));
}

/**
 * @param {string} url
 * @param {string | undefined} filename
 * @param {AssetMeta} meta
 * @returns {Array<[string, RouteHandler]>}
 */
export function prerendered_asset(url, filename = url, meta) {
	const route = file_route(embed ? filename : path.resolve(dir, 'prerendered', filename), meta);
	return to_paths(url).map((route_path) => [route_path, route]);
}

/**
 * @param {string} url
 * @param {string} filename
 * @param {AssetMeta} meta
 * @returns {Array<[string, RouteHandler]>}
 */
export function prerendered_page(url, filename, meta) {
	const canonical = encode_pathname(url);

	/**
	 * @param {BunRequest} req
	 * @returns {Response}
	 */
	function handle_redirect(req) {
		const request_url = new URL(req.url);
		const location = `${canonical}${request_url.search}`;
		return new Response(null, { status: 308, headers: { location } });
	}

	const route = file_route(embed ? filename : path.resolve(dir, 'prerendered', filename), meta);

	const inverted = url.endsWith('/') ? url.slice(0, -1) : `${url}/`;
	// path already contains base, no need to add it here
	/** @type {Array<[string, RouteHandler]>} */
	const entries = route_paths(url).map((route_path) => [route_path, route]);

	if (inverted) {
		for (const route_path of route_paths(inverted)) {
			entries.push([route_path, handlers(handle_redirect)]);
		}
	}

	return entries;
}

/**
 * @param {string} url
 * @param {number} status
 * @param {string} location
 * @returns {Array<[string, RouteHandler]>}
 */
export function prerendered_redirect(url, status, location) {
	const route = handlers(new Response(null, { status, headers: { location } }));
	// path already contains base, no need to add it here
	return route_paths(url).map((route_path) => [route_path, route]);
}
