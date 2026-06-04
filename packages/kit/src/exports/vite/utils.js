import path from 'node:path';
import { posixify } from '../../utils/os.js';
import { negotiate } from '../../utils/http.js';
import { escape_html } from '../../utils/escape.js';
import { dedent } from '../../core/sync/utils.js';
import {
	app_server,
	app_env_private,
	service_worker,
	sveltekit_env_private
} from './module_ids.js';

/**
 * Transforms kit.alias to a valid vite.resolve.alias array.
 *
 * Related to tsconfig path alias creation.
 *
 * @param {import('types').ValidatedKitConfig} config
 * @param {string} root
 * */
export function get_config_aliases(config, root) {
	/** @type {import('vite').Alias[]} */
	const alias = [
		// For now, we handle `$lib` specially here rather than make it a default value for
		// `config.kit.alias` since it has special meaning for packaging, etc.
		{ find: '$lib', replacement: config.files.lib }
	];

	for (let [key, value] of Object.entries(config.alias)) {
		value = posixify(value);
		if (value.endsWith('/*')) {
			value = value.slice(0, -2);
		}
		if (key.endsWith('/*')) {
			// Doing just `{ find: key.slice(0, -2) ,..}` would mean `import .. from "key"` would also be matched, which we don't want
			alias.push({
				find: new RegExp(`^${escape_for_regexp(key.slice(0, -2))}\\/(.+)$`),
				replacement: `${path.resolve(root, value)}/$1`
			});
		} else if (key + '/*' in config.alias) {
			// key and key/* both exist -> the replacement for key needs to happen _only_ on import .. from "key"
			alias.push({
				find: new RegExp(`^${escape_for_regexp(key)}$`),
				replacement: path.resolve(root, value)
			});
		} else {
			alias.push({ find: key, replacement: path.resolve(root, value) });
		}
	}

	return alias;
}

/**
 * @param {string} str
 */
function escape_for_regexp(str) {
	return str.replace(/[.*+?^${}()|[\]\\]/g, (match) => '\\' + match);
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
 * Removes cwd/lib path from the start of the id
 * @param {string} id
 * @param {string} lib
 * @param {string} cwd
 */
export function normalize_id(id, lib, cwd) {
	id = id.replace(query_pattern, '');

	if (id.startsWith(lib)) {
		id = id.replace(lib, '$lib');
	}

	if (id.startsWith(cwd)) {
		id = path.relative(cwd, id);
	}

	if (id === app_server) {
		return '$app/server';
	}

	if (id === app_env_private || id === sveltekit_env_private) {
		return '$app/env/private';
	}

	if (id === service_worker) {
		return '$service-worker';
	}

	return posixify(id);
}

/**
 * For times when you need to throw an error, but without
 * displaying a useless stack trace (since the developer
 * can't do anything useful with it)
 * @param {string} message
 */
export function stackless(message) {
	const error = new Error(message);
	error.stack = '';
	return error;
}

export const strip_virtual_prefix = /** @param {string} id */ (id) => id.replace('\0virtual:', '');

/**
 * For `error_for_missing_config('instrumentation.server.js', 'kit.experimental.instrumentation.server', true)`,
 * returns:
 *
 * ```
 * To enable `instrumentation.server.js`, add the following to your `svelte.config.js`:
 *
 *\`\`\`js
 *	kit:
 *		experimental:
 *			instrumentation:
 *				server: true
 *			}
 *		}
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
			To enable ${feature_name}, add the following to your \`svelte.config.js\`:

			${result}
		`
	);
}
