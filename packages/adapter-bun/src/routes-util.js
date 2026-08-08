import { manifest, base, embed } from 'MANIFEST';
import { dirname, resolve, posix } from 'node:path';

const dir = dirname(Bun.main);

/**
 * @typedef {import('bun').Serve.Routes<never, string>[string]} RouteHandler
 */

/**
 * @param {string} pathname
 * @returns {string}
 */
function encode_pathname(pathname) {
	return pathname
		.split('/')
		.map((seg) => encodeURIComponent(seg).replace('*', '%2A'))
		.join('/');
}

/**
 * @param {string} urlPath
 * @returns {string}
 */
function to_path(urlPath) {
	return encode_pathname(posix.join(base, urlPath));
}

/**
 * @param {string} urlPath
 * @returns {string}
 */
function to_directory_path(urlPath) {
	return encode_pathname(`${posix.join(base, urlPath).replace(/\/$/, '')}/`);
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
	const entries = [[to_path(urlPath), { GET: new Response(file, { headers }) }]];

	if (urlPath.endsWith('/index.html') || urlPath === 'index.html') {
		const directory = urlPath.slice(0, -'index.html'.length);
		entries.push([to_directory_path(directory), { GET: new Response(file, { headers }) }]);
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
 * @returns {[string, RouteHandler]}
 */
export function prerendered_asset(urlPath, filePath = urlPath) {
	const file = Bun.file(embed ? filePath : resolve(dir, 'prerendered', filePath));
	const headers = { 'content-type': file.type };
	return [to_path(urlPath), { GET: new Response(file, { headers }) }];
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
	/** @type {Array<[string, RouteHandler]>} */
	const entries = [[encode_pathname(urlPath), { GET: new Response(file, { headers }) }]];

	if (inverted) {
		entries.push([encode_pathname(inverted), { GET: handle_redirect }]);
	}

	// path already contains base, no need to call to_path here
	return entries;
}

/**
 * @param {string} urlPath
 * @param {number} status
 * @param {string} location
 * @returns {[string, RouteHandler]}
 */
export function prerendered_redirect(urlPath, status, location) {
	// path already contains base, no need to call to_path here
	return [encode_pathname(urlPath), { GET: new Response(null, { status, headers: { location } }) }];
}
