import { tsPlugin } from '@sveltejs/acorn-typescript';
import { Parser } from 'acorn';
import { read } from '../../../utils/filesystem.js';
import { get_exported_name, is_reassigned } from './utils.js';

const inheritable_page_options = new Set(['ssr', 'prerender', 'csr', 'trailingSlash', 'config']);

const page_options = new Set([...inheritable_page_options, 'entries']);

const skip_parsing_regex = new RegExp(
	`${Array.from(page_options).join('|')}|(export[\\s\\n]+\\*[\\s\\n]+from)`
);

const parser = Parser.extend(tsPlugin());

/**
 * Collects exported page options from a +page.js/+layout.js file.
 * Returns `null` if any export is too difficult to analyse.
 * @param {string} input
 * @returns {Record<string, any> | null}
 */
export function statically_analyse_exports(input) {
	// if there's a chance there are no page exports or export all declaration,
	// then we can skip the AST parsing which is expensive
	if (!skip_parsing_regex.test(input)) {
		return {};
	}

	const source = parser.parse(input, {
		sourceType: 'module',
		ecmaVersion: 'latest'
	});

	/** @type {Map<string, any>} */
	const static_exports = new Map();

	for (const statement of source.body) {
		// ignore export all declarations with aliases that are not page options
		if (
			statement.type === 'ExportAllDeclaration' &&
			statement.exported &&
			!page_options.has(get_exported_name(statement))
		) {
			continue;
		}

		if (
			statement.type === 'ExportDefaultDeclaration' ||
			statement.type === 'ExportAllDeclaration'
		) {
			return null;
		} else if (statement.type !== 'ExportNamedDeclaration') {
			continue;
		}

		// export specifiers
		if (statement.specifiers.length) {
			for (const specifier of statement.specifiers) {
				if (!page_options.has(get_exported_name(specifier))) {
					continue;
				}

				if (!statement.source) {
					// TODO: allow specifiers that reference a literal value and is never re-assigned?
				}

				return null;
			}
		}

		if (!statement.declaration) {
			continue;
		}

		// class and function export declarations
		if (statement.declaration.type !== 'VariableDeclaration') {
			if (page_options.has(statement.declaration.id.name)) {
				return null;
			}
			continue;
		}

		for (const declaration of statement.declaration.declarations) {
			if (declaration.id.type !== 'Identifier') {
				// TODO: handle values of destructured variables
				return null;
			}

			if (!page_options.has(declaration.id.name)) {
				continue;
			}

			if (declaration.init?.type === 'Literal') {
				if (statement.declaration.kind === 'const') {
					static_exports.set(declaration.id.name, declaration.init.value);
					continue;
				}

				if (is_reassigned(source, declaration.id.name)) {
					return null;
				}

				static_exports.set(declaration.id.name, declaration.init.value);
				continue;
			}

			if (declaration.init?.type === 'Identifier' && !is_reassigned(source, declaration.init.name)) {
				// TODO: allow referencing declared variables that have a literal value and is never re-assigned
				// continue;
			}

			// references a variable we can't easily evaluate statically
			return null;
		}
	}

	return Object.fromEntries(static_exports);
}

/**
 * @param {(server_node: string) => Promise<Record<string, any>>} resolve
 */
export function create_static_analyser(resolve) {
	/** @type {Map<string, Record<string, any> | null>} */
	const static_exports = new Map();

	/**
	 * Computes the final page options for a node (if possible). Otherwise, returns `null`.
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
				const input = read(node.universal);
				universal_exports = statically_analyse_exports(input);
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
				// if the parent cannot be statically analysed, we can't know what
				// page options the current node inherits, so we invalidate it too
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
