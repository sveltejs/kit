import { manifest, base, embed } from 'MANIFEST';
import { dirname, resolve, posix } from 'node:path';

const dir = dirname(Bun.main);

/**
 * @typedef {import('bun').Serve.Routes<never, string>[string]} RouteHandler
 */

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
	return route_paths(`${posix.join(base, urlPath).replace(/\/$/, '')}/`);
}

/**
 * @param {string} urlPath
 * @param {string} [filePath]
 * @returns {Array<[string, RouteHandler]>}
 */
export function client_asset(urlPath, filePath = urlPath) {
	const file = Bun.file(embed ? filePath : resolve(dir, 'client', filePath));

	/** @type {Record<string, string>} */
	const headers = { 'content-type': file.type };

	if (urlPath.startsWith(`${manifest.appDir}/immutable/`)) {
		headers['cache-control'] = 'public,max-age=31536000,immutable';
	}

	/** @type {Array<[string, RouteHandler]>} */
	const entries = to_paths(urlPath).map((path) => [path, { GET: new Response(file, { headers }) }]);

	if (urlPath.endsWith('/index.html') || urlPath === 'index.html') {
		const directory = urlPath.slice(0, -'index.html'.length);
		for (const path of to_directory_paths(directory)) {
			entries.push([path, { GET: new Response(file, { headers }) }]);
		}
	}

	return entries;
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
 * @param {string} [filePath]
 * @returns {Array<[string, RouteHandler]>}
 */
export function prerendered_asset(urlPath, filePath = urlPath) {
	const file = Bun.file(embed ? filePath : resolve(dir, 'prerendered', filePath));
	const headers = { 'content-type': file.type };
	return to_paths(urlPath).map((path) => [path, { GET: new Response(file, { headers }) }]);
}

/**
 * @param {string} urlPath
 * @param {string} filePath
 * @returns {Array<[string, RouteHandler]>}
 */
export function prerendered_page(urlPath, filePath) {
	/**
	 * @param {import('bun').BunRequest} req
	 * @returns {Response}
	 */
	function handle_redirect(req) {
		const url = new URL(req.url);
		const location = `${urlPath}${url.search}`;
		return new Response(null, { status: 308, headers: { location } });
	}

	const file = Bun.file(embed ? filePath : resolve(dir, 'prerendered', filePath));
	const headers = { 'content-type': file.type };

	const inverted = urlPath.endsWith('/') ? urlPath.slice(0, -1) : `${urlPath}/`;
	// path already contains base, no need to add it here
	/** @type {Array<[string, RouteHandler]>} */
	const entries = route_paths(urlPath).map((path) => [
		path,
		{ GET: new Response(file, { headers }) }
	]);

	if (inverted) {
		for (const path of route_paths(inverted)) {
			entries.push([path, { GET: handle_redirect }]);
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
