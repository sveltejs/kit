import path from 'node:path';
import { tsPlugin } from '@sveltejs/acorn-typescript';
import { Parser } from 'acorn';
import { loadEnv } from 'vite';
import { posixify, read } from '../../utils/filesystem.js';
import { negotiate } from '../../utils/http.js';
import { filter_private_env, filter_public_env } from '../../utils/env.js';
import { escape_html } from '../../utils/escape.js';
import {
	app_server,
	env_dynamic_private,
	env_dynamic_public,
	env_static_private,
	env_static_public,
	service_worker
} from './module_ids.js';

/**
 * Transforms kit.alias to a valid vite.resolve.alias array.
 *
 * Related to tsconfig path alias creation.
 *
 * @param {import('types').ValidatedKitConfig} config
 * */
export function get_config_aliases(config) {
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
				replacement: `${path.resolve(value)}/$1`
			});
		} else if (key + '/*' in config.alias) {
			// key and key/* both exist -> the replacement for key needs to happen _only_ on import .. from "key"
			alias.push({
				find: new RegExp(`^${escape_for_regexp(key)}$`),
				replacement: path.resolve(value)
			});
		} else {
			alias.push({ find: key, replacement: path.resolve(value) });
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
 * Load environment variables from process.env and .env files
 * @param {import('types').ValidatedKitConfig['env']} env_config
 * @param {string} mode
 */
export function get_env(env_config, mode) {
	const { publicPrefix: public_prefix, privatePrefix: private_prefix } = env_config;
	const env = loadEnv(mode, env_config.dir, '');

	return {
		public: filter_public_env(env, { public_prefix, private_prefix }),
		private: filter_private_env(env, { public_prefix, private_prefix })
	};
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

/**
 * Removes cwd/lib path from the start of the id
 * @param {string} id
 * @param {string} lib
 * @param {string} cwd
 */
export function normalize_id(id, lib, cwd) {
	if (id.startsWith(lib)) {
		id = id.replace(lib, '$lib');
	}

	if (id.startsWith(cwd)) {
		id = path.relative(cwd, id);
	}

	if (id === app_server) {
		return '$app/server';
	}

	if (id === env_static_private) {
		return '$env/static/private';
	}

	if (id === env_static_public) {
		return '$env/static/public';
	}

	if (id === env_dynamic_private) {
		return '$env/dynamic/private';
	}

	if (id === env_dynamic_public) {
		return '$env/dynamic/public';
	}

	if (id === service_worker) {
		return '$service-worker';
	}

	return posixify(id);
}

export const strip_virtual_prefix = /** @param {string} id */ (id) => id.replace('\0virtual:', '');

const parser = Parser.extend(tsPlugin());

/**
 * Collect all exported page options from a +page.js/+layout.js file.
 * Returns `null` if those exports cannot be statically analyzed.
 * @param {string} node_path
 */
function statically_analyse_exports(node_path) {
	const input = read(node_path);

	const node = parser.parse(input, {
		sourceType: 'module',
		ecmaVersion: 'latest',
		locations: true
	});

	/** @type {Map<string, any>} */
	const static_exports = new Map();

	for (const statement of node.body) {
		if (
			statement.type === 'ExportDefaultDeclaration' ||
			statement.type === 'ExportAllDeclaration'
		) {
			return null;
		} else if (statement.type !== 'ExportNamedDeclaration') {
			continue;
		}

		// TODO: handle exports referencing constants in the same file?

		// export specifiers
		if (statement.specifiers.length) {
			for (const specifier of statement.specifiers) {
				if (
					specifier.exported.type === 'Identifier' &&
					is_not_a_page_option(specifier.exported.name)
				) {
					continue;
				}
				return null;
			}
			continue;
		}

		if (!statement.declaration) {
			continue;
		}

		if (
			statement.declaration.type === 'FunctionDeclaration' &&
			is_not_a_page_option(statement.declaration.id.name)
		) {
			continue;
		}

		// other exported classes and functions
		if (statement.declaration.type !== 'VariableDeclaration') {
			return null;
		}

		for (const declaration of statement.declaration.declarations) {
			if (declaration.id.type === 'Identifier') {
				if (is_not_a_page_option(declaration.id.name)) {
					continue;
				} else if (statement.declaration.kind === 'const' && declaration.init?.type === 'Literal') {
					static_exports.set(declaration.id.name, declaration.init.value);
					continue;
				}
				// TODO analyze that variable is not reassigned, i.e. so that `let` is also allowed?
			}
			return null;
		}
	}

	return Object.fromEntries(static_exports);
}

/**
 * @param {string} name
 * @returns {boolean}
 */
function is_not_a_page_option(name) {
	return name === 'load' || name.startsWith('_');
}

/**
 * Returns a map of universal nodes and their exports that we can determine are
 * CSR-only through static analysis.
 * @param {import('types').ManifestData} manifest_data
 * @param {(server_node: string) => Promise<Record<string, any>>} resolve
 */
export async function get_client_only_nodes(manifest_data, resolve) {
	/** @type {Set<number>} */
	const ssr_lookup = new Set();

	/** @type {Map<number, Record<string, any>>} */
	const static_exports = new Map();

	for (const route of manifest_data.routes) {
		if (!route.page) continue;

		/** @type {Record<string, any> | null} */
		let options = {
			prerender: false,
			trailingSlash: 'never',
			ssr: true,
			csr: true
		};

		const node_indexes = [...route.page.layouts, route.page.leaf];

		for (const index of node_indexes) {
			if (!index) continue;

			const node = manifest_data.nodes[index];

			if (node.server) {
				const module = await resolve(node.server);
				Object.assign(options, module);
			}

			if (node.universal) {
				const exports = statically_analyse_exports(node.universal);
				if (!exports) {
					options = null;
					break;
				}
				static_exports.set(index, exports);
				Object.assign(options, exports);
			} else {
				static_exports.set(index, {});
			}
		}

		if (options?.ssr || options === null) {
			for (const index of node_indexes) {
				if (!index) continue;
				ssr_lookup.add(index);
			}
		}
	}

	for (const index of ssr_lookup) {
		static_exports.delete(index);
	}

	return static_exports;
}
