/** @import { Serve as BunServe } from 'bun' */
import {
	app_dir,
	assets,
	base,
	dir,
	embed,
	redirects,
	server_assets as server_files
} from '#@sveltejs/adapter-bun';
import path from 'node:path';

/**
 * @typedef {(request: Request) => Response} Serve
 * @typedef {{ hash: string, mtime: number, br?: boolean, gz?: boolean }} AssetMeta
 */

const CONTENT_ENCODING = { br: 'br', gz: 'gzip' };

/**
 * Embedded assets are imported by identity path; on-disk assets live under the
 * output directory next to the hand-off module.
 * @param {string} subdir
 * @param {string} filename
 */
function resolve_file(subdir, filename) {
	return embed ? filename : path.resolve(dir, subdir, filename);
}

/**
 * An encoded slash is not a path separator, and an undecodable pathname is looked up as sent
 * @param {string} pathname
 */
function decode(pathname) {
	if (!pathname.includes('%')) return pathname;
	try {
		return decodeURIComponent(pathname.replace(/%2f/gi, '%252F'));
	} catch {
		return pathname;
	}
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
		if (header === etag) return true;
		for (const value of header.split(',')) {
			const tag = value.trim();
			if (tag === etag || tag === '*' || tag === `W/${etag}`) return true;
		}
		return false;
	}

	const since = request.headers.get('if-modified-since');
	if (since === null) return false;
	const time = Date.parse(since);
	return Number.isFinite(time) && Math.trunc(mtime / 1000) <= Math.trunc(time / 1000);
}

/**
 * Picks the precompressed variant the client accepts, preferring brotli. An explicit
 * `q=0` refuses a coding even when `*` accepts the rest.
 * @template T
 * @param {string | null} accept
 * @param {T | undefined} br
 * @param {T | undefined} gz
 * @returns {T | undefined}
 */
function negotiate(accept, br, gz) {
	if (accept === null) return;

	/** @type {Map<string, boolean>} */
	const accepted = new Map();
	for (const part of accept.split(',')) {
		const [name = '', ...params] = part.trim().toLowerCase().split(';');
		accepted.set(name.trim(), !params.some((param) => /^q=0(\.0*)?$/.test(param.trim())));
	}

	/** @param {string} coding */
	const ok = (coding) => accepted.get(coding) ?? accepted.get('*') ?? false;
	if (br && ok('br')) return br;
	if (gz && ok('gzip')) return gz;
}

/**
 * Serves one file with its build-time validator and precompressed variants. Everything
 * that does not depend on the request is created once, here, including the `Headers`
 * (Bun copies them into each response).
 * @param {string} file
 * @param {AssetMeta} meta
 * @param {boolean} [immutable]
 * @returns {{ serve: Serve, native?: Response }}
 */
function file_entry(file, meta, immutable = false) {
	const source = Bun.file(file);
	const compressed = Boolean(meta.br || meta.gz);

	/** @type {Record<string, string>} */
	const base_headers = {
		'content-type': source.type,
		'last-modified': new Date(meta.mtime).toUTCString()
	};
	if (immutable) base_headers['cache-control'] = 'public,max-age=31536000,immutable';
	if (compressed) base_headers['vary'] = 'accept-encoding';

	/** @param {'br' | 'gz'} [encoding] */
	const variant = (encoding) => {
		const etag = encoding ? `"${meta.hash}-${encoding}"` : `"${meta.hash}"`;
		const headers = { ...base_headers, etag };

		return {
			etag,
			not_modified: { status: 304, headers: new Headers(headers) },
			body: encoding ? Bun.file(`${file}.${encoding}`) : source,
			ok: {
				headers: new Headers(
					encoding ? { ...headers, 'content-encoding': CONTENT_ENCODING[encoding] } : headers
				)
			}
		};
	};

	const identity = variant();
	const br = meta.br ? variant('br') : undefined;
	const gz = meta.gz ? variant('gz') : undefined;

	/** @type {Serve} */
	const serve = (request) => {
		// ranges apply to the identity representation
		const { etag, not_modified, body, ok } =
			(compressed &&
				request.headers.get('range') === null &&
				negotiate(request.headers.get('accept-encoding'), br, gz)) ||
			identity;

		return is_fresh(request, etag, meta.mtime)
			? new Response(null, not_modified)
			: new Response(body, ok);
	};

	// Given the validators as headers, a Bun file route answers conditional requests, HEAD and
	// Range without calling into JavaScript. It opens the file before checking them though, which
	// makes its 304 slower than `serve`'s, so only files that are never revalidated use it
	const native = immutable && !compressed ? new Response(identity.body, identity.ok) : undefined;

	return { serve, native };
}

/** @type {Map<string, Serve>} */
const lookup = new Map();

/** @type {BunServe.Routes<undefined, string>} */
export const routes = {};

// Bun matches route keys against the raw request path, and these are the paths user agents never re-encode
const UNRESERVED_PATH = /^[\w\-./~]+$/;

/**
 * The first entry for a pathname wins: files arrive sorted, so an exact file precedes the
 * aliases derived from it, in sirv's lookup order.
 * @param {string} pathname
 * @param {{ serve: Serve, native?: Response }} entry
 */
function add(pathname, { serve, native }) {
	if (lookup.has(pathname)) return;
	lookup.set(pathname, serve);
	if (UNRESERVED_PATH.test(pathname)) routes[pathname] = { GET: native ?? serve };
}

/**
 * Redirects the non-canonical trailing-slash form of a prerendered page to the canonical one,
 * spelled the way the client sent it.
 * @param {Request} request
 */
function redirect_to_canonical(request) {
	const { pathname, search } = new URL(request.url);
	const location = pathname.endsWith('/') ? pathname.slice(0, -1) : `${pathname}/`;
	return new Response(null, { status: 308, headers: { location: location + search } });
}

for (const [kind, url, filename, meta] of assets) {
	if (kind === 'prerendered_page') {
		// url already contains base, with reserved characters kept percent-encoded
		const pathname = decode(url);
		add(pathname, file_entry(resolve_file('prerendered', filename), meta));

		const inverted = pathname.endsWith('/') ? pathname.slice(0, -1) : `${pathname}/`;
		if (inverted) add(inverted, { serve: redirect_to_canonical });
		continue;
	}

	const pathname = path.posix.join(base, url);

	if (kind === 'prerendered_asset') {
		add(decode(pathname), file_entry(resolve_file('prerendered', filename), meta));
		continue;
	}

	const entry = file_entry(
		resolve_file('client', filename),
		meta,
		url.startsWith(`${app_dir}/immutable/`)
	);
	add(pathname, entry);

	// sirv also serves `dir/index.html` at `dir/` and `dir`, and `page.html` at `page`
	if (pathname.endsWith('/index.html')) {
		const directory = pathname.slice(0, -'index.html'.length);
		add(directory, entry);
		if (directory !== '/') add(directory.slice(0, -1), entry);
	} else if (pathname.endsWith('.html')) {
		add(pathname.slice(0, -'.html'.length), entry);
	}
}

for (const [url, status, location] of redirects) {
	// url already contains base
	const init = { status, headers: { location } };
	add(decode(url), { serve: () => new Response(null, init), native: new Response(null, init) });
}

/**
 * Catches the requests `routes` cannot: looked up by decoded pathname, so every
 * percent-encoding of a path finds its file. Other methods continue to SvelteKit.
 * @param {Request} request
 * @param {URL} url
 * @returns {Response | undefined}
 */
export function serve_static(request, url) {
	if (request.method !== 'GET' && request.method !== 'HEAD') return;
	return lookup.get(decode(url.pathname))?.(request);
}

export const server_assets = new Map(
	server_files.map(([file, embedded = file]) => [file, Bun.file(resolve_file('client', embedded))])
);
