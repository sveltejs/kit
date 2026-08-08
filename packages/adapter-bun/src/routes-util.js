import { manifest, base, embed } from 'MANIFEST';
import { dirname, resolve, posix } from 'node:path';

const dir = dirname(Bun.main);

/**
 * @param {string} pathname
 * @returns {string}
 */
function encode_pathname(pathname) {
	return pathname.split('/').map(encodeURIComponent).join('/');
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
 * @param {string} [filePath]
 * @returns {[string, Response]}
 */
export function client_asset(urlPath, filePath = urlPath) {
	const file = Bun.file(embed ? filePath : resolve(dir, 'client', filePath));

	/** @type {Record<string, string>} */
	const headers = { 'content-type': file.type };

	if (urlPath.startsWith(`/${manifest.appPath}/immutable/`)) {
		headers['cache-control'] = 'public,max-age=31536000,immutable';
	}

	return [to_path(urlPath), new Response(file, { headers })];
}

/**
 * @param {string} urlPath
 * @param {string} [filePath]
 * @returns {[string, Response]}
 */
export function prerendered_asset(urlPath, filePath = urlPath) {
	const file = Bun.file(embed ? filePath : resolve(dir, 'prerendered', filePath));
	const headers = { 'content-type': file.type };
	return [to_path(urlPath), new Response(file, { headers })];
}

/**
 * @param {string} urlPath
 * @param {string} filePath
 * @returns {[[string, Response], [string, function]]}
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

	// path already contains base, no need to call to_path here
	return [
		[encode_pathname(urlPath), new Response(file, { headers })],
		[encode_pathname(inverted), handle_redirect]
	];
}

/**
 * @param {string} urlPath
 * @param {number} status
 * @param {string} location
 * @returns {[string, Response]}
 */
export function prerendered_redirect(urlPath, status, location) {
	// path already contains base, no need to call to_path here
	return [encode_pathname(urlPath), Response.redirect(location, status)];
}
