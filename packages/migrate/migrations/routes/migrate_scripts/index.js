import ts from 'typescript';
import { adjust_imports, error, parse } from '../utils.js';
import * as TASKS from '../tasks.js';
import { comment, dedent, except_str, guess_indent } from '../../../utils.js';

/**
 * @param {string} content
 * @param {boolean} is_error
 * @param {boolean} moved
 */
export function migrate_scripts(content, is_error, moved) {
	/** @type {string | null} */
	let module = null;

	let ext = '.js';

	// instance script
	const main = content.replace(
		/<script([^]*?)>([^]+?)<\/script>(\n*)/g,
		(match, attrs, contents, whitespace) => {
			const indent = guess_indent(contents) ?? '';

			if (moved) {
				contents = adjust_imports(contents);
			}

			if (/context=(['"])module\1/.test(attrs)) {
				// special case — load is no longer supported in error
				if (is_error) {
					const body = `\n${indent}${error('Replace error load function', '3293209')}\n${comment(
						contents,
						indent
					)}`;

					return `<script${attrs}>${body}</script>${whitespace}`;
				}

				if (/lang(?:uage)?=(['"])(ts|typescript)\1/.test(attrs)) {
					ext = '.ts';
				}

				module = dedent(contents.replace(/^\n/, ''));

				const declared = find_declarations(contents);
				const delete_var = (/** @type {string } */ key) => {
					const declaration = declared?.get(key);
					if (declaration && !declaration.import) {
						declared?.delete(key);
					}
				};
				delete_var('load');
				delete_var('router');
				delete_var('hydrate');
				delete_var('prerender');
				const delete_kit_type = (/** @type {string } */ key) => {
					const declaration = declared?.get(key);
					if (
						declaration &&
						declaration.import?.type_only &&
						declaration.import.from === '@sveltejs/kit' &&
						!new RegExp(`\\W${key}\\W`).test(except_str(content, match))
					) {
						declared?.delete(key);
					}
				};
				delete_kit_type('Load');
				delete_kit_type('LoadEvent');
				delete_kit_type('LoadOutput');

				if (!declared || declared.size > 0) {
					const body = `\n${indent}${error(
						'Check code was safely removed',
						TASKS.PAGE_MODULE_CTX
					)}\n${comment(contents, indent)}`;

					return `<script${attrs}>${body}</script>${whitespace}`;
				}

				// nothing was declared here, we can safely remove the script
				return '';
			}

			if (!is_error && /export let [\w]+[^"`'\w\s]/.test(contents)) {
				contents = `\n${indent}${error('Add data prop', TASKS.PAGE_DATA_PROP)}\n${contents}`;
				// Possible TODO: migrate props to data.prop, or suggest $: ({propX, propY, ...} = data);
			}

			return `<script${attrs}>${contents}</script>${whitespace}`;
		}
	);

	return { module, main, ext };
}

/** @param {string} content */
function find_declarations(content) {
	const file = parse(content);
	if (!file) return;

	/** @type {Map<string, {name: string, import?: {from: string, type_only: boolean}}>} */
	const declared = new Map();
	/**
	 * @param {string} name
	 * @param {{from: string, type_only: boolean}} [import_def]
	 */
	function add(name, import_def) {
		declared.set(name, { name, import: import_def });
	}

	for (const statement of file.ast.statements) {
		if (ts.isImportDeclaration(statement) && statement.importClause) {
			const type_only = statement.importClause.isTypeOnly;
			const from = ts.isStringLiteral(statement.moduleSpecifier)
				? statement.moduleSpecifier.text
				: '';

			if (statement.importClause.name) {
				add(statement.importClause.name.text, { from, type_only });
			}

			const bindings = statement.importClause.namedBindings;

			if (bindings) {
				if (ts.isNamespaceImport(bindings)) {
					add(bindings.name.text, { from, type_only });
				} else {
					for (const binding of bindings.elements) {
						add(binding.name.text, { from, type_only: type_only || binding.isTypeOnly });
					}
				}
			}
		} else if (ts.isVariableStatement(statement)) {
			for (const declaration of statement.declarationList.declarations) {
				if (ts.isIdentifier(declaration.name)) {
					add(declaration.name.text);
				} else {
					return; // bail out if it's not a simple variable
				}
			}
		} else if (ts.isFunctionDeclaration(statement) || ts.isClassDeclaration(statement)) {
			if (statement.name && ts.isIdentifier(statement.name)) {
				add(statement.name.text);
			}
		} else if (ts.isExportDeclaration(statement) && !statement.exportClause) {
			return; // export * from '..' -> bail
		}
	}

	return declared;
}
