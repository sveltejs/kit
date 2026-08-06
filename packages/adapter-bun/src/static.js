import { client_files, manifest, prerendered_files, prerendered_paths } from 'MANIFEST';
import { asset_path, embedded_asset } from './assets.js';

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
 * @param {string} pathname
 * @returns {string}
 */
function encode_pathname(pathname) {
	return pathname.split('/').map(encodeURIComponent).join('/');
}

/**
 * @param {'client' | 'prerendered'} directory
 * @param {string} relative
 * @param {boolean} client
 * @returns {Partial<Record<import('bun').Serve.HTTPMethod, Response | ((request: Request) => Response)>>}
 */
function file_route(directory, relative, client) {
	const headers = new Headers();
	if (client && relative.startsWith(`${manifest.appPath}/immutable/`)) {
		headers.set('cache-control', 'public,max-age=31536000,immutable');
	}

	const embedded = embedded_asset(directory, relative);
	if (embedded) {
		return {
			GET: (request) => embedded_file_response(request, embedded, headers, false),
			HEAD: (request) => embedded_file_response(request, embedded, headers, true)
		};
	}

	const path = asset_path(directory, relative);
	const file = Bun.file(path);
	return {
		GET: new Response(file, { headers }),
		HEAD: new Response(file, { headers })
	};
}

/**
 * @param {Request} request
 * @param {import('./assets.js').EmbeddedAsset} asset
 * @param {Headers} route_headers
 * @param {boolean} head
 */
function embedded_file_response(request, asset, route_headers, head) {
	const headers = new Headers(route_headers);
	headers.set('accept-ranges', 'bytes');
	headers.set('content-length', String(asset.size));
	if (asset.type) headers.set('content-type', asset.type);
	headers.set('etag', asset.etag);
	headers.set('last-modified', asset.lastModified);

	if (is_not_modified(request, asset)) {
		headers.delete('content-length');
		return new Response(null, { status: 304, headers });
	}

	const range = get_range(request, asset);
	if (range === null) {
		headers.set('content-range', `bytes */${asset.size}`);
		headers.set('content-length', '0');
		return new Response(null, { status: 416, headers });
	}

	const file = Bun.file(asset.path);
	if (range) {
		const [start, end] = range;
		headers.set('content-range', `bytes ${start}-${end}/${asset.size}`);
		headers.set('content-length', String(end - start + 1));
		return new Response(head ? null : file.slice(start, end + 1), { status: 206, headers });
	}

	return new Response(head ? null : file, { headers });
}

/**
 * @param {Request} request
 * @param {import('./assets.js').EmbeddedAsset} asset
 */
function is_not_modified(request, asset) {
	const if_none_match = request.headers.get('if-none-match');
	if (if_none_match !== null) {
		return if_none_match.split(',').some((value) => {
			const tag = value.trim();
			return tag === '*' || tag === asset.etag || tag.replace(/^W\//, '') === asset.etag;
		});
	}

	const if_modified_since = request.headers.get('if-modified-since');
	if (if_modified_since === null) return false;
	const modified_since = Date.parse(if_modified_since);
	return Number.isFinite(modified_since) && modified_since >= Date.parse(asset.lastModified);
}

/**
 * @param {Request} request
 * @param {import('./assets.js').EmbeddedAsset} asset
 * @returns {[number, number] | null | undefined}
 */
function get_range(request, asset) {
	const value = request.headers.get('range');
	if (value === null) return;

	const if_range = request.headers.get('if-range');
	if (if_range !== null) {
		const date = Date.parse(if_range);
		if (
			if_range !== asset.etag &&
			(!Number.isFinite(date) || date < Date.parse(asset.lastModified))
		) {
			return;
		}
	}

	const match = /^bytes=(\d*)-(\d*)$/.exec(value);
	if (!match || (!match[1] && !match[2]) || asset.size === 0) return null;

	let start;
	let end;
	if (match[1]) {
		start = Number(match[1]);
		end = match[2] ? Number(match[2]) : asset.size - 1;
	} else {
		const length = Number(match[2]);
		if (length === 0) return null;
		start = Math.max(0, asset.size - length);
		end = asset.size - 1;
	}

	if (
		!Number.isSafeInteger(start) ||
		!Number.isSafeInteger(end) ||
		start >= asset.size ||
		end < start
	) {
		return null;
	}
	return [start, Math.min(end, asset.size - 1)];
}

/** @type {import('bun').Serve.Routes<undefined, string>} */
export const routes = {};

for (const file of client_files) {
	routes[encode_pathname(`/${file}`)] = file_route('client', file, true);
}

for (const pathname of prerendered_paths) {
	const file = find_prerendered_file(pathname);
	const route = encode_pathname(pathname);
	if (file && routes[route] === undefined) {
		routes[route] = file_route('prerendered', file, false);
	}
}

for (const pathname of prerendered_paths) {
	const inverted = pathname.endsWith('/') ? pathname.slice(0, -1) : `${pathname}/`;
	if (!inverted) continue;

	const route = encode_pathname(inverted);
	if (routes[route] !== undefined) continue;

	const location = relative_pathname(route, encode_pathname(pathname));
	const redirect = (/** @type {Request} */ request) =>
		new Response(null, {
			status: 308,
			headers: { location: location + new URL(request.url).search }
		});
	routes[route] = { GET: redirect, HEAD: redirect };
}
