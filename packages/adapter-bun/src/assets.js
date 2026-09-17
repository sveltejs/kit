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
		return header
			.split(',')
			.some((value) => ['*', etag].includes(value.trim().replace(/^W\//, '')));
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
 * Serves one file with its build-time validator and precompressed variants. Everything
 * that does not depend on the request is created once, here.
 * @param {string} file
 * @param {AssetMeta} meta
 * @param {boolean} [immutable]
 * @returns {{ serve: Serve, native?: Response }}
 */
function file_entry(file, meta, immutable = false) {
	/** @type {Record<string, string>} */
	const base_headers = { 'content-type': Bun.file(file).type };
	if (immutable) base_headers['cache-control'] = 'public,max-age=31536000,immutable';

	/** @param {'br' | 'gz' | null} encoding */
	const variant = (encoding) => {
		const etag = encoding === null ? `"${meta.hash}"` : `"${meta.hash}-${encoding}"`;
		/** @type {Record<string, string>} */
		const headers = { ...base_headers, etag, 'last-modified': new Date(meta.mtime).toUTCString() };
		if (meta.br || meta.gz) headers['vary'] = 'accept-encoding';

		return {
			etag,
			not_modified: { status: 304, headers },
			body: Bun.file(encoding === null ? file : `${file}.${encoding}`),
			ok: {
				headers:
					encoding === null
						? headers
						: { ...headers, 'content-encoding': CONTENT_ENCODING[encoding] }
			}
		};
	};

	const variants = {
		identity: variant(null),
		br: meta.br ? variant('br') : undefined,
		gz: meta.gz ? variant('gz') : undefined
	};

	/** @type {Serve} */
	const serve = (request) => {
		// ranges apply to the identity representation
		const encoding =
			request.headers.get('range') === null
				? negotiate(request.headers.get('accept-encoding'), meta)
				: null;
		const { etag, not_modified, body, ok } = variants[encoding ?? 'identity'] ?? variants.identity;

		return is_fresh(request, etag, meta.mtime)
			? new Response(null, not_modified)
			: new Response(body, ok);
	};

	// Given the validators as headers, a Bun file route answers conditional requests, HEAD and
	// Range without calling into JavaScript. It opens the file before checking them though, which
	// makes its 304 slower than `serve`'s, so only files that are never revalidated use it
	const native =
		immutable && !meta.br && !meta.gz
			? new Response(variants.identity.body, variants.identity.ok)
			: undefined;

	return { serve, native };
}

/** @type {Map<string, Serve>} */
const lookup = new Map();

/** @type {BunServe.Routes<undefined, string>} */
export const routes = {};

// Bun matches route keys against the raw request path, and these are the paths user agents never re-encode
const UNRESERVED_PATH = /^[\w\-./~]+$/;

/**
 * The first entry for a pathname wins, so exact files beat aliases like sirv's lookup order.
 * @param {string} pathname
 * @param {{ serve: Serve, native?: Response }} entry
 */
function add(pathname, { serve, native }) {
	if (lookup.has(pathname)) return;
	lookup.set(pathname, serve);
	if (UNRESERVED_PATH.test(pathname)) routes[pathname] = { GET: native ?? serve };
}

for (const [kind, url, filename, meta] of assets) {
	if (kind === 'prerendered_page') {
		// url already contains base
		add(url, file_entry(resolve_file('prerendered', filename), meta));

		const inverted = url.endsWith('/') ? url.slice(0, -1) : `${url}/`;
		if (inverted) {
			const location = encodeURI(url);
			add(inverted, {
				serve: (request) => {
					const { search } = new URL(request.url);
					return new Response(null, { status: 308, headers: { location: location + search } });
				}
			});
		}
		continue;
	}

	const pathname = path.posix.join(base, url);

	if (kind === 'prerendered_asset') {
		add(pathname, file_entry(resolve_file('prerendered', filename), meta));
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
	add(url, { serve: () => new Response(null, init), native: new Response(null, init) });
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

	let pathname = url.pathname;
	if (pathname.includes('%')) {
		try {
			// an encoded slash is not a path separator
			pathname = decodeURIComponent(pathname.replace(/%2f/gi, '%252F'));
		} catch {
			return;
		}
	}

	return lookup.get(pathname)?.(request);
}

export const server_assets = new Map(
	server_files.map(([file, embedded = file]) => [file, Bun.file(resolve_file('client', embedded))])
);
