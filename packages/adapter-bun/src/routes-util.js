import { manifest, base, embed } from 'MANIFEST';
import { dirname, resolve, posix } from 'node:path';

const dir = dirname(Bun.main);

/**
 * @typedef {import('bun').Serve.Routes<never, string>[string]} RouteHandler
 * @typedef {{ hash: string, mtime: number, br?: boolean, gz?: boolean }} AssetMeta
 */

const CONTENT_ENCODING = { br: 'br', gz: 'gzip' };

// RFC 3986 pchar minus percent-escapes: characters user agents send raw in a path
const RAW_PATH_CHAR = /^[A-Za-z0-9\-._~!$&'()+,;=:@]$/;

/**
 * Percent-encodes only what user agents themselves encode when requesting the path,
 * because Bun matches route keys against the raw request pathname.
 * @param {string} pathname
 * @returns {string}
 */
function encode_pathname(pathname) {
	return pathname
		.split('/')
		.map((segment) =>
			[...segment]
				.map((char, i) => {
					if (char === ':' && i === 0) return '%3A'; // Bun route parameter marker
					return RAW_PATH_CHAR.test(char) ? char : encodeURIComponent(char);
				})
				.join('')
		)
		.join('/');
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
 * @param {string} urlPath
 * @returns {string[]}
 */
function to_paths(urlPath) {
	return route_paths(posix.join(base, urlPath));
}

/**
 * @param {string} urlPath
 * @returns {string[]}
 */
function to_directory_paths(urlPath) {
	const directory = `${posix.join(base, urlPath).replace(/\/$/, '')}/`;
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
 * Bun does not route HEAD requests to a GET handler, so every function route
 * registers both methods.
 * @param {(request: import('bun').BunRequest) => Response} handler
 * @returns {RouteHandler}
 */
function handlers(handler) {
	return { GET: handler, HEAD: handler };
}

/**
 * Serves one file with its build-time validator and precompressed variants.
 * @param {string} path
 * @param {AssetMeta} meta
 * @param {Record<string, string>} [extra_headers]
 * @returns {RouteHandler}
 */
function file_route(path, meta, extra_headers = {}) {
	const content_type = Bun.file(path).type;
	const last_modified = new Date(meta.mtime).toUTCString();

	/** @param {import('bun').BunRequest} request */
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
			return new Response(Bun.file(path), { headers: response_headers });
		}

		response_headers['content-encoding'] = CONTENT_ENCODING[encoding];
		return new Response(Bun.file(`${path}.${encoding}`), { headers: response_headers });
	};

	return handlers(handler);
}

/**
 * @param {string} urlPath
 * @param {string | undefined} filePath
 * @param {AssetMeta} meta
 * @returns {Array<[string, RouteHandler]>}
 */
export function client_asset(urlPath, filePath = urlPath, meta) {
	const immutable = urlPath.startsWith(`${manifest.appDir}/immutable/`);
	const route = file_route(
		embed ? filePath : resolve(dir, 'client', filePath),
		meta,
		immutable ? { 'cache-control': 'public,max-age=31536000,immutable' } : {}
	);

	const paths = to_paths(urlPath);
	if (urlPath.endsWith('/index.html') || urlPath === 'index.html') {
		paths.push(...to_directory_paths(urlPath.slice(0, -'index.html'.length)));
	} else if (urlPath.endsWith('.html')) {
		// sirv also serves `page.html` at `/page`
		paths.push(...to_paths(urlPath.slice(0, -'.html'.length)));
	}

	return paths.map((path) => /** @type {[string, RouteHandler]} */ ([path, route]));
}

/**
 * @param {string} urlPath
 * @param {string} [filePath]
 * @returns {import('bun').BunFile}
 */
export function server_asset(urlPath, filePath = urlPath) {
	return Bun.file(embed ? filePath : resolve(dir, 'client', urlPath));
}

/**
 * @param {string} urlPath
 * @param {string | undefined} filePath
 * @param {AssetMeta} meta
 * @returns {Array<[string, RouteHandler]>}
 */
export function prerendered_asset(urlPath, filePath = urlPath, meta) {
	const route = file_route(embed ? filePath : resolve(dir, 'prerendered', filePath), meta);
	return to_paths(urlPath).map((path) => [path, route]);
}

/**
 * @param {string} urlPath
 * @param {string} filePath
 * @param {AssetMeta} meta
 * @returns {Array<[string, RouteHandler]>}
 */
export function prerendered_page(urlPath, filePath, meta) {
	const canonical = encode_pathname(urlPath);

	/**
	 * @param {import('bun').BunRequest} req
	 * @returns {Response}
	 */
	function handle_redirect(req) {
		const url = new URL(req.url);
		const location = `${canonical}${url.search}`;
		return new Response(null, { status: 308, headers: { location } });
	}

	const route = file_route(embed ? filePath : resolve(dir, 'prerendered', filePath), meta);

	const inverted = urlPath.endsWith('/') ? urlPath.slice(0, -1) : `${urlPath}/`;
	// path already contains base, no need to add it here
	/** @type {Array<[string, RouteHandler]>} */
	const entries = route_paths(urlPath).map((path) => [path, route]);

	if (inverted) {
		for (const path of route_paths(inverted)) {
			entries.push([path, handlers(handle_redirect)]);
		}
	}

	return entries;
}

/**
 * @param {string} urlPath
 * @param {number} status
 * @param {string} location
 * @returns {Array<[string, RouteHandler]>}
 */
export function prerendered_redirect(urlPath, status, location) {
	// path already contains base, no need to add it here
	return route_paths(urlPath).map((path) => [
		path,
		{ GET: new Response(null, { status, headers: { location } }) }
	]);
}
