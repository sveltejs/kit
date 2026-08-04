import { extname, join } from 'node:path';
import {
	client_files,
	compressed_files,
	manifest,
	prerendered_files,
	prerendered_paths
} from 'MANIFEST';
import { dir } from './dir.js';
import { accepts_encoding, append_vary } from './utils.js';

const embedded_files =
	/** @type {Map<string, { path: string; lastModified: number }> | undefined} */ (
		/** @type {any} */ (globalThis)[Symbol.for('sveltekit.adapter-bun.assets')]
	);

/**
 * @param {'client' | 'prerendered'} directory
 * @param {string} relative
 * @returns {{ path: string; lastModified?: number }}
 */
function asset(directory, relative) {
	return (
		embedded_files?.get(`${directory}/${relative}`) ?? {
			path: join(dir, directory, relative)
		}
	);
}

/**
 * @param {'client' | 'prerendered'} directory
 * @param {string} relative
 * @returns {string}
 */
export function asset_path(directory, relative) {
	return asset(directory, relative).path;
}

/**
 * @param {string} pathname
 * @returns {string | undefined}
 */
function find_prerendered_file(pathname) {
	const relative = pathname.slice(1);
	return (
		relative.endsWith('/')
			? [`${relative}index.html`]
			: [relative, `${relative}.html`, `${relative}/index.html`]
	).find((candidate) => prerendered_files.has(candidate));
}

/**
 * Relative reference from `from` to `to`, which must differ only by a trailing slash.
 * Keep in sync with the copy in `packages/kit/src/utils/url.js`.
 * @param {string} from
 * @param {string} to
 * @returns {string}
 */
function relative_pathname(from, to) {
	const segment = to.replace(/\/$/, '').split('/').at(-1);
	return from.endsWith('/') ? `../${segment}` : `${segment}/`;
}

/**
 * @param {Request} request
 * @param {string} pathname
 * @returns {Promise<Response | undefined>}
 */
export async function serve_static(request, pathname) {
	if (request.method !== 'GET' && request.method !== 'HEAD') return;

	const client_file = pathname.slice(1);
	if (client_files.has(client_file)) {
		return serve_file(request, client_file, true);
	}

	if (prerendered_paths.has(pathname)) {
		const file = find_prerendered_file(pathname);
		if (file) return serve_file(request, file, false);
	}

	const inverted = pathname.endsWith('/') ? pathname.slice(0, -1) : `${pathname}/`;
	if (prerendered_paths.has(inverted)) {
		const url = new URL(request.url);
		return new Response(null, {
			status: 308,
			headers: { location: relative_pathname(pathname, inverted) + url.search }
		});
	}
}

/**
 * @param {Request} request
 * @param {string} relative
 * @param {boolean} client
 * @returns {Promise<Response | undefined>}
 */
async function serve_file(request, relative, client) {
	const directory = client ? 'client' : 'prerendered';
	const original = asset(directory, relative);
	const can_precompress =
		PRECOMPRESS && compressed_files.has(relative) && !request.headers.has('range');

	/** @type {'br' | 'gzip' | undefined} */
	let encoding;
	if (can_precompress && accepts_encoding(request.headers.get('accept-encoding'), 'br')) {
		encoding = 'br';
	} else if (can_precompress && accepts_encoding(request.headers.get('accept-encoding'), 'gzip')) {
		encoding = 'gzip';
	}

	const selected =
		encoding === 'br'
			? asset(directory, `${relative}.br`)
			: encoding === 'gzip'
				? asset(directory, `${relative}.gz`)
				: original;
	const file = Bun.file(selected.path);
	if (!(await file.exists())) return;

	const size = file.size;
	const last_modified = Math.trunc((selected.lastModified ?? file.lastModified) / 1000) * 1000;
	const etag = `W/"${last_modified.toString(16)}-${size.toString(16)}${encoding ? `-${encoding}` : ''}"`;
	const headers = new Headers();

	let type = manifest.mimeTypes[extname(relative)] || Bun.file(original.path).type;
	if (type === 'text/html') type += ';charset=utf-8';
	if (type) headers.set('content-type', type);

	headers.set('accept-ranges', 'bytes');
	headers.set('etag', etag);
	if (last_modified > 0) {
		headers.set('last-modified', new Date(last_modified).toUTCString());
	}
	if (client && relative.startsWith(`${manifest.appPath}/immutable/`)) {
		headers.set('cache-control', 'public,max-age=31536000,immutable');
	}
	if (PRECOMPRESS && compressed_files.has(relative)) {
		append_vary(headers, 'Accept-Encoding');
	}
	if (encoding) headers.set('content-encoding', encoding);

	const if_none_match = request.headers.get('if-none-match');
	if (
		if_none_match === '*' ||
		if_none_match?.split(',').some((value) => value.trim() === etag) ||
		(!if_none_match &&
			last_modified > 0 &&
			new Date(request.headers.get('if-modified-since') || 0).getTime() >= last_modified)
	) {
		return new Response(null, { status: 304, headers });
	}

	let start = 0;
	let end = size - 1;
	let status = 200;
	const range = request.headers.get('range');
	const if_range = request.headers.get('if-range');
	if (
		range &&
		(!if_range ||
			if_range === etag ||
			(last_modified > 0 && new Date(if_range).getTime() >= last_modified))
	) {
		const match = /^bytes=(\d*)-(\d*)$/.exec(range);
		if (!match || (!match[1] && !match[2])) {
			headers.set('content-range', `bytes */${size}`);
			return new Response(null, { status: 416, headers });
		}

		if (!match[1]) {
			const suffix = Number(match[2]);
			start = Math.max(0, size - suffix);
		} else {
			start = Number(match[1]);
			if (match[2]) end = Number(match[2]);
		}

		if (start >= size || end < start) {
			headers.set('content-range', `bytes */${size}`);
			return new Response(null, { status: 416, headers });
		}

		end = Math.min(end, size - 1);
		status = 206;
		headers.set('content-range', `bytes ${start}-${end}/${size}`);
	}

	const content_length = end - start + 1;
	headers.set('content-length', String(content_length));
	const body = request.method === 'HEAD' ? null : file.slice(start, end + 1);

	return new Response(body, { status, headers });
}
