import { client_files, manifest, prerendered_files, prerendered_paths } from 'MANIFEST';
import { asset_path } from './assets.js';

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
 * @returns {Partial<Record<import('bun').Serve.HTTPMethod, Response>>}
 */
function file_route(directory, relative, client) {
	const headers = new Headers();
	if (client && relative.startsWith(`${manifest.appPath}/immutable/`)) {
		headers.set('cache-control', 'public,max-age=31536000,immutable');
	}

	const path = asset_path(directory, relative);
	return {
		GET: new Response(Bun.file(path), { headers }),
		HEAD: new Response(Bun.file(path), { headers })
	};
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
