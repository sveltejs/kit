import { tsPlugin } from '@sveltejs/acorn-typescript';
import { Parser } from 'acorn';
import { read } from '../../utils/filesystem.js';

const dynamic_page_options = new RegExp(`${['entries', 'config'].join('|')}`);

const statically_analysable_page_options = new RegExp(
	`${['prerender', 'csr', 'ssr', 'trailingSlash'].join('|')}`
);

const parser = Parser.extend(tsPlugin());

/**
 * Collect all exported page options from a +page.js/+layout.js file.
 * Returns `null` if those exports cannot be statically analyzed.
 * @param {string} node_path
 */
function statically_analyse_exports(node_path) {
	const input = read(node_path);

	// if there's something we can't analyse, we mark the node as not statically analysable
	if (dynamic_page_options.test(input)) {
		return null;
	}

	// if there's nothing to analyse, we can skip parsing
	if (!statically_analysable_page_options.test(input)) {
		return {};
	}

	const node = parser.parse(input, {
		sourceType: 'module',
		ecmaVersion: 'latest'
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

const inheritable_page_options = new Set(['ssr', 'prerender', 'csr', 'trailingSlash', 'config']);

/**
 * @param {(server_node: string) => Promise<Record<string, any>>} resolve
 * @returns
 */
export function create_static_analyser(resolve) {
	/** @type {Map<string, Record<string, any> | null>} */
	const static_exports = new Map();

	/**
	 * @param {import('types').PageNode} node
	 * @returns {Promise<import('types').UniversalNode | null>}
	 */
	const get_page_options = async (node) => {
		if (node.universal && static_exports.has(node.universal)) {
			return /** @type {import('types').UniversalNode | null} */ (
				static_exports.get(node.universal)
			);
		}

		/** @type {Record<string, any> | null} */
		let page_options = {};

		if (node.server) {
			const module = await resolve(node.server);
			for (const key in inheritable_page_options) {
				if (key in module) {
					page_options[key] = module[key];
				}
			}
		}

		if (node.universal) {
			let universal_exports = static_exports.get(node.universal);

			if (universal_exports === undefined) {
				universal_exports = statically_analyse_exports(node.universal);
			}

			if (universal_exports === null) {
				static_exports.set(node.universal, null);
				return null;
			}

			page_options = { ...page_options, ...universal_exports };
		}

		if (node.parent) {
			const parent_options = await get_page_options(node.parent);
			if (parent_options === null) {
				if (node.universal) {
					static_exports.set(node.universal, null);
				}
				return null;
			}

			page_options = { ...parent_options, ...page_options };
		}

		if (node.universal) {
			static_exports.set(node.universal, page_options);
		}

		return page_options;
	};

	return { get_page_options };
}
