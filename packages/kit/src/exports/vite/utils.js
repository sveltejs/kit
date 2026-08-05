import fs from 'node:fs';
import path from 'node:path';
import { posixify } from '../../utils/os.js';
import { negotiate } from '../../utils/http.js';
import { escape_html } from '../../utils/escape.js';
import { escape_for_regexp } from '../../utils/regex.js';
import { stackless } from '../../utils/error.js';
import { dedent } from '../../core/sync/utils.js';
import { app_server, app_env_private, sveltekit_env_private } from './module_ids.js';
import { styleText } from 'node:util';

/**
 * Transforms alias to a valid vite.resolve.alias array.
 *
 * Related to tsconfig path alias creation.
 *
 * @param {import('types').ValidatedKitConfig} config
 * @param {string} root
 */
export function get_config_aliases(config, root) {
	/** @type {import('vite').Alias[]} */
	const alias = [];

	for (let [key, value] of Object.entries(config.alias)) {
		value = posixify(value);
		if (value.endsWith('/*')) {
			value = value.slice(0, -2);
		}
		if (key.endsWith('/*')) {
			// Doing just `{ find: key.slice(0, -2) ,..}` would mean `import .. from "key"` would also be matched, which we don't want
			alias.push({
				find: new RegExp(`^${escape_for_regexp(key.slice(0, -2))}\\/(.+)$`),
				replacement: `${posixify(path.resolve(root, value))}/$1`
			});
		} else if (key + '/*' in config.alias) {
			// key and key/* both exist -> the replacement for key needs to happen _only_ on import .. from "key"
			alias.push({
				find: new RegExp(`^${escape_for_regexp(key)}$`),
				replacement: posixify(path.resolve(root, value))
			});
		} else {
			alias.push({ find: key, replacement: posixify(path.resolve(root, value)) });
		}
	}

	return alias;
}

/**
 * Silently respond with 404 for Chrome DevTools workspaces request.
 * Chrome always requests this at the root, regardless of base path.
 * Users who want workspaces can install `vite-plugin-devtools-json`,
 * which takes precedence as Vite plugin middleware runs first.
 * @param {string} pathname
 * @param {import('http').ServerResponse} res
 * @returns {boolean} `true` if the request was handled
 */
export function is_chrome_devtools_request(pathname, res) {
	if (pathname === '/.well-known/appspecific/com.chrome.devtools.json') {
		res.writeHead(404);
		res.end('not found');
		return true;
	}
	return false;
}

/**
 * @param {import('http').IncomingMessage} req
 * @param {import('http').ServerResponse} res
 * @param {string} base
 */
export function not_found(req, res, base) {
	const type = negotiate(req.headers.accept ?? '*', ['text/plain', 'text/html']);

	// special case — handle `/` request automatically
	if (req.url === '/' && type === 'text/html') {
		res.statusCode = 307;
		res.setHeader('location', base);
		res.end();
		return;
	}

	res.statusCode = 404;

	const prefixed = base + req.url;

	if (type === 'text/html') {
		res.setHeader('Content-Type', 'text/html');
		res.end(
			`The server is configured with a public base URL of ${escape_html(
				base
			)} - did you mean to visit <a href="${escape_html(prefixed, true)}">${escape_html(
				prefixed
			)}</a> instead?`
		);
	} else {
		res.end(
			`The server is configured with a public base URL of ${escape_html(
				base
			)} - did you mean to visit ${escape_html(prefixed)} instead?`
		);
	}
}

const query_pattern = /\?.*$/s;

/**
 * Removes cwd path from the start of the id and replaces any `#`-prefixed
 * import alias target paths with their alias names.
 * @param {string} id
 * @param {Array<{ alias: string, path: string }>} aliases — sorted by path length descending
 * @param {string} cwd
 */
export function normalize_id(id, aliases, cwd) {
	id = id.replace(query_pattern, '');

	// check before the cwd is removed — in a user's app these modules live
	// inside `node_modules`, i.e. within the cwd
	if (id === app_server) {
		return '$app/server';
	}

	if (id === app_env_private || id === sveltekit_env_private) {
		return '$app/env/private';
	}

	for (const { alias, path } of aliases) {
		if (id === path || id.startsWith(path + '/')) {
			id = id.replace(path, alias);
			break;
		}
	}

	if (id.startsWith(cwd)) {
		id = path.relative(cwd, id);
	}

	return posixify(id);
}

export const remote_module_pattern = /[/.]remote\.[^/]+$/;

/**
 * A cache of which directories can export remote modules
 * @type {Map<string, boolean>}
 */
const remote_module_cache = new Map();

/**
 * Whether `id` is a remote module. Files in node_modules only count if the
 * package they belong to has a peer dependency on `@sveltejs/kit`
 * @param {string} id
 * @returns {boolean}
 */
export function is_remote_module(id) {
	id = posixify(id);
	if (!remote_module_pattern.test(id)) return false;
	if (!id.includes('node_modules')) return true;

	return can_export_remote_module(path.dirname(id));
}

/**
 * @param {string} directory
 * @returns {boolean}
 */
function can_export_remote_module(directory) {
	let cached = remote_module_cache.get(directory);
	if (cached !== undefined) return cached;

	let pkg;

	try {
		pkg = JSON.parse(fs.readFileSync(path.join(directory, 'package.json'), 'utf8'));
	} catch {}

	if (pkg?.peerDependencies?.['@sveltejs/kit']) {
		cached = true;
	} else {
		const parent = path.dirname(directory);

		cached =
			path.basename(directory) === 'node_modules' || parent === directory
				? false // base case
				: can_export_remote_module(parent); // recurse
	}

	remote_module_cache.set(directory, cached);
	return cached;
}

export const server_only_module_pattern = /[/.]server\.[^/]+$/;
export const server_only_directory_pattern = /\/server\//;

export const strip_virtual_prefix = /** @param {string} id */ (id) => id.replace('\0virtual:', '');

/**
 * For `error_for_missing_config('remote functions', 'experimental.remoteFunctions', 'true')`,
 * returns:
 *
 * ```
 * To enable remote functions, add the following to the SvelteKit plugin in your `vite.config.js`:
 *
 *\`\`\`js
 *	experimental: {
 *		remoteFunctions: true
 *	}
 *\`\`\`
 *```
 * @param {string} feature_name
 * @param {string} path
 * @param {string} value
 * @returns {never}
 */
export function error_for_missing_config(feature_name, path, value) {
	const hole = '__HOLE__';

	const result = path.split('.').reduce((acc, part, i, parts) => {
		const indent = '  '.repeat(i);
		const rhs = i === parts.length - 1 ? value : `{\n${hole}\n${indent}}`;

		return acc.replace(hole, `${indent}${part}: ${rhs}`);
	}, hole);

	throw stackless(
		dedent`\
			To enable ${feature_name}, add the following to your SvelteKit plugin in \`vite.config.js\`:

			${result}
		`
	);
}

/**
 * @param {number} status
 * @param {Request} request
 */
export function log_response(status, request) {
	const url = new URL(request.url);
	const log = `[${status}] ${request.method} ${url.href.replace(url.origin, '')}`;

	if (status < 400) {
		console.log(log);
	} else {
		console.error(styleText(['bold', 'red'], log));
	}
}
