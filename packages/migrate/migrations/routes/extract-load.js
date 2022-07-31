import { parse } from 'svelte/compiler';
import { forEachFile } from './utils';
import MagicString from 'magic-string';
import ts from 'typescript';

/**
 * Move load function in out of module context of Svelte files into own file and adjust code
 *
 * @param {import('./types').BranchHierarchy} branch_hierarchy
 * @param {string[]} ext File extensions that signal Svelte files
 */
export function extract_load(branch_hierarchy, ext) {
	const ext_regex = ext.map((e) => e.replace('.', '\\.')).join('|');

	const page_todos = forEachFile(
		branch_hierarchy,
		new RegExp(`\\+page(@\\w+)?(${ext_regex})`),
		(content, [, referenced_layout], moved_down) => {
			const result = parseHtmlx(content);
			if (!result) {
				return;
			}
			const { htmlx_ast, is_ts, module_ts_ast, html_str, module_str, module_context } = result;

			const module_ast_offset = module_context.content.start;
			/** @type {string[]} imports to be kept in the Svelte file */
			const svelte_imports = [];
			/**
			 * @param {ts.Node} node
			 * @param {ts.Node} parent
			 */
			const walk = (node, parent) => {
				// type onLeaveCallback = () => void;
				// const onLeaveCallbacks: onLeaveCallback[] = [];

				// early stop gaps to not confuse ourselves
				if (
					ts.isClassDeclaration(node) ||
					ts.isTypeAliasDeclaration(node) ||
					ts.isInterfaceDeclaration(node)
				) {
					return;
				}

				// Update imports
				if (ts.isImportDeclaration(node)) {
					if (moved_down) {
						adjust_relative_import(node.moduleSpecifier, module_str);
					}
					const import_path = node.moduleSpecifier.getText().slice(1, -1); // omit " / '
					if (import_path.endsWith('.svelte')) {
						svelte_imports.push(node.getText());
					}
					if (import_path.startsWith('./__types')) {
						module_str.overwrite(
							node.moduleSpecifier.getStart() + 1,
							node.moduleSpecifier.getEnd() - 1,
							'./$types'
						);
					}
				} else if (
					moved_down &&
					ts.isCallExpression(node) &&
					node.expression.kind === ts.SyntaxKind.ImportKeyword
				) {
					// import('..')
					adjust_relative_import(node.arguments[0], module_str);
				}

				// if (ts.isVariableStatement(node)) {
				// 	exportedNames.handleVariableStatement(node, parent);
				// }

				// if (ts.isFunctionDeclaration(node)) {
				// 	exportedNames.handleExportFunctionOrClass(node);

				// 	pushScope();
				// 	onLeaveCallbacks.push(() => popScope());
				// }

				// if (ts.isBlock(node) || ts.isArrowFunction(node) || ts.isFunctionExpression(node)) {
				// 	pushScope();
				// 	onLeaveCallbacks.push(() => popScope());
				// }

				// if (ts.isExportDeclaration(node)) {
				// 	exportedNames.handleExportDeclaration(node);
				// }

				// if (ts.isImportDeclaration(node)) {
				// 	handleImportDeclaration(node, str, astOffset, script.start, tsAst);

				// 	// Check if import is the event dispatcher
				// 	events.checkIfImportIsEventDispatcher(node);
				// }

				// // workaround for import statement completion
				// if (ts.isImportEqualsDeclaration(node)) {
				// 	const end = node.getEnd() + astOffset;

				// 	if (str.original[end - 1] !== ';') {
				// 		preprendStr(str, end, ';');
				// 	}
				// }

				// if (ts.isVariableDeclaration(node)) {
				// 	events.checkIfIsStringLiteralDeclaration(node);
				// 	events.checkIfDeclarationInstantiatedEventDispatcher(node);
				// 	implicitStoreValues.addVariableDeclaration(node);
				// }

				// if (ts.isCallExpression(node)) {
				// 	events.checkIfCallExpressionIsDispatch(node);
				// }

				// if (ts.isVariableDeclaration(parent) && parent.name == node) {
				// 	isDeclaration = true;
				// 	onLeaveCallbacks.push(() => (isDeclaration = false));
				// }

				// if (ts.isBindingElement(parent) && parent.name == node) {
				// 	isDeclaration = true;
				// 	onLeaveCallbacks.push(() => (isDeclaration = false));
				// }

				// if (ts.isImportClause(node)) {
				// 	isDeclaration = true;
				// 	onLeaveCallbacks.push(() => (isDeclaration = false));
				// 	implicitStoreValues.addImportStatement(node);
				// }

				// if (ts.isImportSpecifier(node)) {
				// 	implicitStoreValues.addImportStatement(node);
				// }

				// //handle stores etc
				// if (ts.isIdentifier(node)) {
				// 	handleIdentifier(node, parent);
				// }

				ts.forEachChild(node, (n) => walk(n, node));
				// onLeaveCallbacks.map((c) => c());
			};

			module_ts_ast.forEachChild((n) => walk(n, module_ts_ast));

			// TODO:
			// 1. use regex to extra context=module (don't parse, we could be using TS)
			// 2. use TS to parse contents and
			//     - find .svelte imports which should be left in the Svelte file and removed from the new file
			//     - replace __types import (for jsdocs try regex-replace)
			//     - adjust imports if this was moved into a folder
			// 3. throw an error in the new ts/js file to tell people to adjust the code
			// 4. see if we can update props in load
			return {
				content: content,
				todo: 'check if page file was updated properly', // TODO check if props present, if yes, also add this to the todo
				file: {
					content: module_str.toString(),
					name: `+load${referenced_layout ? `@${referenced_layout}` : ''}.${is_ts ? 'ts' : 'js'}`,
					todo: 'update load'
				}
			};
		}
	);
	const layout_todos = forEachFile(
		branch_hierarchy,
		new RegExp(`\\+layout(-\\w+)?(@\\w+)?${ext_regex}`),
		(content, [, layout_name, referenced_layout]) => {
			const result = parseHtmlx(content);
			if (!result) {
				return;
			}
			const { htmlx_ast, is_ts, module_ts_ast, html_str, module_str, module_context } = result;

			// TODO: same as above
			return {
				content: content,
				todo: 'check if layout file was updated properly', // TODO check if props present, if yes, also add this to the todo
				file: {
					content: 'todo',
					name: `+layout${layout_name ? `-${layout_name}` : ''}${
						referenced_layout ? `@${referenced_layout}` : ''
					}.${is_ts ? 'ts' : 'js'}`,
					todo: 'update load'
				}
			};
		}
	);

	return `## Pages
${page_todos.join('\n')}
    
## Layouts
${layout_todos.join('\n')}`;
}

/**
 * @param {ts.Expression} expr
 * @param {MagicString} str
 */
function adjust_relative_import(expr, str) {
	const text = expr.getText().substring(1);
	if (text.startsWith('../')) {
		str.overwrite(expr.getFullStart() + 1, expr.getFullStart() + 4, '../../');
	} else if (text.startsWith('./')) {
		str.overwrite(expr.getFullStart() + 1, expr.getFullStart() + 3, '../');
	}
}

/**
 * @param {string} str
 */
function parseAttributes(str) {
	/** @type {import('./types').Attribute[]} */
	const attrs = [];
	str
		.split(/\s+/)
		.filter(Boolean)
		.forEach((attr) => {
			const [name, value] = attr.split('=');
			attrs.push({
				name,
				value: value.startsWith('"') || value.startsWith("'") ? value.slice(1, -1) : value
			});
		});

	return attrs;
}

/**
 * @param {string} htmlx
 * @param {string} tag
 */
function extractTag(htmlx, tag) {
	const exp = new RegExp(`(<!--[^]*?-->)|(<${tag}([\\S\\s]*?)>)([\\S\\s]*?)<\\/${tag}>`, 'g');
	/**@type {import('./types').VerbatimElement[]} */
	const matches = [];

	/** @type { RegExpExecArray | null } */
	let match = null;
	while ((match = exp.exec(htmlx)) != null) {
		if (match[0].startsWith('<!--')) {
			// Tag is inside comment
			continue;
		}

		let content = match[4];
		if (!content) {
			// Self-closing/empty tags don't need replacement
			continue;
		}

		const start = match.index + match[2].length;
		const end = start + content.length;
		const containerStart = match.index;
		const containerEnd = match.index + match[0].length;

		matches.push({
			start: containerStart,
			end: containerEnd,
			name: tag,
			attributes: parseAttributes(match[3]),
			content: {
				start,
				end,
				value: content
			}
		});
	}

	return matches;
}

/**
 * @param {string} htmlx
 */
function findVerbatimElements(htmlx) {
	return [...extractTag(htmlx, 'script'), ...extractTag(htmlx, 'style')];
}

/**
 * @param {string} htmlx
 * @param {import('./types').Node[]} verbatimElements
 */
function blankVerbatimContent(htmlx, verbatimElements) {
	let output = htmlx;
	for (const node of verbatimElements) {
		const content = node.content;
		if (content) {
			output =
				output.substring(0, content.start) +
				output
					.substring(content.start, content.end)
					// blank out the content
					.replace(/[^\n]/g, ' ')
					// excess blank space can make the svelte parser very slow (sec->min). break it up with comments (works in style/script)
					.replace(/[^\n][^\n][^\n][^\n]\n/g, '/**/\n') +
				output.substring(content.end);
		}
	}
	return output;
}

/**
 * @param {string} htmlx
 */
function parseHtmlx(htmlx) {
	//Svelte tries to parse style and script tags which doesn't play well with typescript, so we blank them out.
	//HTMLx spec says they should just be retained after processing as is, so this is fine
	const verbatimElements = findVerbatimElements(htmlx);
	const parsingCode = blankVerbatimContent(htmlx, verbatimElements);
	const htmlx_ast = parse(parsingCode).html;

	const module_context = verbatimElements.find(
		(el) =>
			el.name === 'script' &&
			el.attributes.some((attr) => attr.name === 'context' && attr.value === 'module')
	);
	if (!module_context) {
		return;
	}

	const is_ts = module_context.attributes.find(
		(attr) =>
			attr.name === 'lang' && (attr.value === 'ts' || attr.value === 'typescript') /* legacy */
	);

	const module_ts_ast = ts.createSourceFile(
		'filename.ts',
		module_context.content.value,
		ts.ScriptTarget.Latest,
		true,
		is_ts ? ts.ScriptKind.TS : ts.ScriptKind.JS
	);

	return {
		is_ts,
		htmlx_ast,
		module_ts_ast,
		html_str: new MagicString(htmlx),
		module_str: new MagicString(module_context.content.value),
		module_context
	};
}
