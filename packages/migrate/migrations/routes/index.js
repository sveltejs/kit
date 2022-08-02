import fs from 'fs';
import path from 'path';
import colors from 'kleur';
import glob from 'tiny-glob/sync.js';
import prompts from 'prompts';
import ts from 'typescript';
import MagicString from 'magic-string';
import { pathToFileURL } from 'url';

const TASK_STANDALONE_ENDPOINT = '3292701';
const TASK_PAGE_ENDPOINT = '3292699';
const TASK_PAGE_LOAD = '3292693';
const TASK_PAGE_MODULE_CTX = '3292722';
const TASK_PAGE_DATA_PROP = '3292707';

/** @param {string} message */
function bail(message) {
	console.error(colors.bold().red(message));
	process.exit(1);
}

/** @param {string} file */
function relative(file) {
	return path.relative('.', file);
}

/**
 * @param {string} description
 * @param {string} [comment_id]
 */
function task(description, comment_id) {
	return (
		`@migration task: ${description}` +
		(comment_id
			? ` (https://github.com/sveltejs/kit/discussions/5774#discussioncomment-${comment_id})`
			: '')
	);
}

/**
 * @param {string} description
 * @param {string} comment_id
 */
function error(description, comment_id) {
	return `throw new Error(${JSON.stringify(task(description, comment_id))});`;
}

export async function migrate() {
	if (!fs.existsSync('svelte.config.js')) {
		bail('Please re-run this script in a directory with a svelte.config.js');
	}

	const { default: config } = await import(pathToFileURL(path.resolve('svelte.config.js')).href);

	const routes = path.resolve(config.kit?.files?.routes ?? 'src/routes');

	/** @type {string[]} */
	const extensions = config.extensions ?? ['.svelte'];

	/** @type {string[]} */
	const module_extensions = config.kit?.moduleExtensions ?? ['.js', '.ts'];

	/** @type {((filepath: string) => boolean)} */
	const filter =
		config.kit?.routes ??
		((filepath) => !/(?:(?:^_|\/_)|(?:^\.|\/\.)(?!well-known))/.test(filepath));

	const files = glob(`${routes}/**`, { filesOnly: true }).map((file) => file.replace(/\\/g, '/'));

	// validate before proceeding
	for (const file of files) {
		const basename = path.basename(file);
		if (
			basename.startsWith('+page.') ||
			basename.startsWith('+layout.') ||
			basename.startsWith('+server.') ||
			basename.startsWith('+error.')
		) {
			bail(`It looks like this migration has already been run (found ${relative(file)}). Aborting`);
		}

		if (basename.startsWith('+')) {
			// prettier-ignore
			bail(
				`Please rename any files in ${relative(routes)} with a leading + character before running this migration (found ${relative(file)}). Aborting`
			);
		}
	}

	const response = await prompts({
		type: 'confirm',
		name: 'value',
		message:
			'This will overwrite files in the current directory. We advise you to use Git and commit any pending changes. Continue?',
		initial: false
	});

	if (!response.value) {
		process.exit(1);
	}

	for (const file of files) {
		const basename = path.basename(file);
		if (!filter(file) && !basename.startsWith('__')) continue;

		// replace `./__types` or `./__types/foo` with `./$types`
		const content = fs.readFileSync(file, 'utf8').replace(/\.\/__types(?:\/[^'"]+)?/g, './$types');

		const svelte_ext = extensions.find((ext) => file.endsWith(ext));
		const module_ext = module_extensions.find((ext) => file.endsWith(ext));

		if (svelte_ext) {
			// file is a component
			const bare = basename.slice(0, -svelte_ext.length);
			const [name, layout] = bare.split('@');
			const is_error_page = bare === '__error';

			/**
			 * Whether file should be moved to a subdirectory — e.g. `src/routes/about.svelte`
			 * should become `src/routes/about/+page.svelte`
			 */
			let move_to_directory = false;

			/**
			 * The new name of the file
			 */
			let renamed = file.slice(0, -basename.length);

			/**
			 * If a component has `<script context="module">`, the contents are moved
			 * into a sibling module with the same name
			 */
			let sibling;

			if (bare.startsWith('__layout')) {
				sibling = renamed + '+layout';
				renamed += '+' + bare.slice(2); // account for __layout-foo etc
			} else if (is_error_page) {
				renamed += '+error';
				// no sibling, because error files can no longer have load
			} else if (name === 'index') {
				sibling = renamed + '+page';
				renamed += '+page' + (layout ? '@' + layout : '');
			} else {
				sibling = `${renamed}${name}/+page`;
				renamed += `${name}/+page${layout ? '@' + layout : ''}`;

				move_to_directory = true;
			}

			renamed += svelte_ext;

			const { module, main } = extract_load(content, is_error_page, move_to_directory);

			const edited = main.replace(/<script([^]*?)>([^]+?)<\/script>/, (match, attrs, content) => {
				const indent = guess_indent(content) ?? '';

				if (move_to_directory) {
					content = adjust_imports(content);
				}

				if (!is_error_page && /export/.test(content)) {
					content = `\n${indent}${error('Add data prop', TASK_PAGE_DATA_PROP)}\n${content}`;
				}

				return `<script${attrs}>${content}</script>`;
			});

			if (move_to_directory) {
				const dir = path.dirname(renamed);
				if (!fs.existsSync(dir)) fs.mkdirSync(dir);
			}

			fs.unlinkSync(file);
			fs.writeFileSync(renamed, edited);

			// if component has a <script context="module">, move it to a sibling .js file
			if (module) {
				const ext = /<script[^>]+?lang=['"](ts|typescript)['"][^]*?>/.test(module) ? '.ts' : '.js';
				const injected = /load/.test(module)
					? `${error('Update load function', TASK_PAGE_LOAD)}\n\n`
					: '';

				const content = migrate_load(dedent(move_to_directory ? adjust_imports(module) : module));

				fs.writeFileSync(sibling + ext, injected + content);
			}
		} else if (module_ext) {
			// file is a module
			const bare = basename.slice(0, -module_ext.length);
			const [name] = bare.split('@');

			/**
			 * Whether the file is paired with a page component, and should
			 * therefore become `+page.server.js`, or not in which case
			 * it should become `+server.js`
			 */
			const is_page_endpoint = extensions.some((ext) =>
				files.includes(`${file.slice(0, -module_ext.length)}${ext}`)
			);

			const type = is_page_endpoint ? '+page.server' : '+server';

			const move_to_directory = name !== 'index';
			const is_standalone_index = !is_page_endpoint && name.startsWith('index.');

			let renamed = '';
			if (is_standalone_index) {
				// handle <folder>/index.json.js -> <folder>.json/+server.js
				const dir = path.dirname(file);
				renamed =
					// prettier-ignore
					`${file.slice(0, -(basename.length + dir.length + 1))}${dir + name.slice('index'.length)}/+server${module_ext}`;
			} else if (move_to_directory) {
				renamed = `${file.slice(0, -basename.length)}${name}/${type}${module_ext}`;
			} else {
				renamed = `${file.slice(0, -basename.length)}${type}${module_ext}`;
			}

			const injected = error(
				`Update ${type}.js`,
				is_page_endpoint ? TASK_PAGE_ENDPOINT : TASK_STANDALONE_ENDPOINT
			);
			// Standalone index endpoints are edge case enough that we don't spend time on trying to update all the imports correctly
			const edited =
				injected +
				(is_standalone_index && /import/.test(content) ? `\n// ${task('Check imports')}` : '') +
				'\n\n' +
				(!is_standalone_index && move_to_directory ? adjust_imports(content) : content);
			if (move_to_directory) {
				const dir = path.dirname(renamed);
				if (!fs.existsSync(dir)) fs.mkdirSync(dir);
			}

			fs.unlinkSync(file);
			fs.writeFileSync(
				renamed,
				is_page_endpoint ? migrate_page_endpoint(edited) : migrate_standalone(edited)
			);
		}
	}
}

/**
 * @param {string} content
 * @param {boolean} is_error
 * @param {boolean} moved
 */
function extract_load(content, is_error, moved) {
	/** @type {string | null} */
	let module = null;

	const main = content.replace(
		/<script([^>]+?context=(['"])module\1[^>]*)>([^]*?)<\/script>/,
		(match, attrs, quote, contents) => {
			const imports = extract_static_imports(moved ? adjust_imports(contents) : contents);

			if (is_error) {
				// special case — load is no longer supported in load
				const indent = guess_indent(contents) ?? '';

				contents = comment(contents);
				const body = `\n${indent}${error('Replace error load function', '3293209')}\n${contents}`;

				return `<script${attrs}>${body}</script>`;
			}

			module = contents.replace(/^\n/, '');
			return `<!-- ${task(
				'Check for missing imports and code that should be moved back to the module context',
				TASK_PAGE_MODULE_CTX
			)}\n\nThe following imports were found:\n${imports.length ? imports.join('\n') : '-'}\n-->`;
		}
	);

	return { module, main };
}

/**
 * @param {string} contents
 */
function comment(contents) {
	return contents.replace(/^(.+)/gm, '// $1');
}

/** @param {string} content */
function adjust_imports(content) {
	try {
		const ast = ts.createSourceFile(
			'filename.ts',
			content,
			ts.ScriptTarget.Latest,
			true,
			ts.ScriptKind.TS
		);

		const code = new MagicString(content);

		/** @param {number} pos */
		function adjust(pos) {
			// TypeScript AST is a clusterfuck, we need to step forward to find
			// where the node _actually_ starts
			while (content[pos] !== '.') pos += 1;

			// replace ../ with ../../ and ./ with ../
			code.prependLeft(pos, content[pos + 1] === '.' ? '../' : '.');
		}

		/** @param {ts.Node} node */
		function walk(node) {
			if (ts.isImportDeclaration(node)) {
				const text = /** @type {ts.StringLiteral} */ (node.moduleSpecifier).text;
				if (text[0] === '.') adjust(node.moduleSpecifier.pos);
			}

			if (ts.isCallExpression(node) && node.expression.getText() === 'import') {
				const arg = node.arguments[0];

				if (ts.isStringLiteral(arg)) {
					if (arg.text[0] === '.') adjust(arg.pos);
				} else if (ts.isTemplateLiteral(arg) && !ts.isNoSubstitutionTemplateLiteral(arg)) {
					if (arg.head.text[0] === '.') adjust(arg.head.pos);
				}
			}

			node.forEachChild(walk);
		}

		ast.forEachChild(walk);

		return code.toString();
	} catch {
		// this is enough of an edge case that it's probably fine to
		// just leave the code as we found it
		return content;
	}
}

/** @param {string} content */
function extract_static_imports(content) {
	try {
		const ast = ts.createSourceFile(
			'filename.ts',
			content,
			ts.ScriptTarget.Latest,
			true,
			ts.ScriptKind.TS
		);

		/** @type {string[]} */
		let imports = [];

		/** @param {ts.Node} node */
		function walk(node) {
			if (ts.isImportDeclaration(node)) {
				imports.push(node.getText());
			}

			node.forEachChild(walk);
		}

		ast.forEachChild(walk);

		return imports;
	} catch {
		return [];
	}
}

/** @param {string} content */
function dedent(content) {
	const indent = guess_indent(content);
	if (!indent) return content;

	/** @type {string[]} */
	const substitutions = [];

	try {
		const ast = ts.createSourceFile(
			'filename.ts',
			content,
			ts.ScriptTarget.Latest,
			true,
			ts.ScriptKind.TS
		);

		const code = new MagicString(content);

		/** @param {ts.Node} node */
		function walk(node) {
			if (ts.isTemplateLiteral(node)) {
				let pos = node.pos;
				while (/\s/.test(content[pos])) pos += 1;

				code.overwrite(pos, node.end, `____SUBSTITUTION_${substitutions.length}____`);
				substitutions.push(node.getText());
			}

			node.forEachChild(walk);
		}

		ast.forEachChild(walk);

		return code
			.toString()
			.replace(new RegExp(`^${indent}`, 'gm'), '')
			.replace(/____SUBSTITUTION_(\d+)____/g, (match, index) => substitutions[index]);
	} catch {
		// as above — ignore this edge case
		return content;
	}
}

/** @param {string} content */
function guess_indent(content) {
	const lines = content.split('\n');

	const tabbed = lines.filter((line) => /^\t+/.test(line));
	const spaced = lines.filter((line) => /^ {2,}/.test(line));

	if (tabbed.length === 0 && spaced.length === 0) {
		return null;
	}

	// More lines tabbed than spaced? Assume tabs, and
	// default to tabs in the case of a tie (or nothing
	// to go on)
	if (tabbed.length >= spaced.length) {
		return '\t';
	}

	// Otherwise, we need to guess the multiple
	const min = spaced.reduce((previous, current) => {
		const count = /^ +/.exec(current)[0].length;
		return Math.min(count, previous);
	}, Infinity);

	return new Array(min + 1).join(' ');
}

/**
 * @param {string} content
 * @param {string} indent
 */
function indent_with(content, indent) {
	return indent + content.split('\n').join('\n' + indent);
}

/**
 * @param {string} content
 * @param {number} offset
 */
function indent_at_line(content, offset) {
	const substr = content.substring(content.lastIndexOf('\n', offset) + 1, offset);
	return /\s*/.exec(substr)[0];
}

/**
 * @param {string} content
 *  */
function migrate_load(content) {
	let imports = new Set();
	try {
		const ast = ts.createSourceFile(
			'filename.ts',
			content,
			ts.ScriptTarget.Latest,
			true,
			ts.ScriptKind.TS
		);
		const str = new MagicString(content);

		/** @param {ts.Node} node */
		function walk(node) {
			if (ts.isReturnStatement(node) && is_directly_in_exported_fn(node, ['load'])) {
				if (node.expression && ts.isObjectLiteralExpression(node.expression)) {
					if (contains_only(node.expression, ['props'])) {
						automigration(
							node,
							str,
							'return ' + dedent(get_prop_initializer_text(node.expression.properties, 'props'))
						);
					} else if (
						contains_only(node.expression, ['redirect', 'status']) &&
						((Number(get_prop_initializer_text(node.expression.properties, 'status')) > 300 &&
							Number(get_prop_initializer_text(node.expression.properties, 'status')) < 310) ||
							contains_only(node.expression, ['redirect']))
					) {
						automigration(
							node,
							str,
							'throw redirect(' +
								get_prop_initializer_text(node.expression.properties, 'status') +
								', ' +
								get_prop_initializer_text(node.expression.properties, 'redirect') +
								');'
						);
						imports.add('redirect');
					} else if (
						contains_only(node.expression, ['error', 'status']) &&
						(Number(get_prop_initializer_text(node.expression.properties, 'status')) > 399 ||
							contains_only(node.expression, ['error']))
					) {
						automigration(
							node,
							str,
							'throw error(' +
								get_prop_initializer_text(node.expression.properties, 'status') +
								', ' +
								get_prop_initializer_text(node.expression.properties, 'error') +
								');'
						);
						imports.add('error');
					}
				} else {
					manual_return_migration(node, str, TASK_PAGE_LOAD);
				}
			}

			node.forEachChild(walk);
		}

		ast.forEachChild(walk);

		const import_str =
			imports.size > 0 ? `import { ${[...imports.keys()].join(', ')} } from '@sveltejs/kit';` : '';

		return import_str + '\n' + str.toString();
	} catch {
		return content;
	}
}

/**
 * @param {string} content
 *  */
function migrate_page_endpoint(content) {
	try {
		const ast = ts.createSourceFile(
			'filename.ts',
			content,
			ts.ScriptTarget.Latest,
			true,
			ts.ScriptKind.TS
		);
		const str = new MagicString(content);

		/** @param {ts.Node} node */
		function walk(node) {
			if (ts.isReturnStatement(node) && is_directly_in_exported_fn(node, ['GET'])) {
				if (
					node.expression &&
					ts.isObjectLiteralExpression(node.expression) &&
					contains_only(node.expression, ['body'])
				) {
					automigration(
						node,
						str,
						'return ' + dedent(get_prop_initializer_text(node.expression.properties, 'body'))
					);
				} else {
					manual_return_migration(node, str, TASK_PAGE_ENDPOINT);
				}
			} else if (
				ts.isReturnStatement(node) &&
				is_directly_in_exported_fn(node, ['PUT', 'POST', 'PATCH', 'DELETE'])
			) {
				manual_return_migration(node, str, TASK_PAGE_ENDPOINT);
			}

			node.forEachChild(walk);
		}

		ast.forEachChild(walk);

		return str.toString();
	} catch {
		return content;
	}
}

/**
 * @param {string} content
 *  */
function migrate_standalone(content) {
	try {
		const ast = ts.createSourceFile(
			'filename.ts',
			content,
			ts.ScriptTarget.Latest,
			true,
			ts.ScriptKind.TS
		);
		const str = new MagicString(content);

		/** @param {ts.Node} node */
		function walk(node) {
			if (
				ts.isReturnStatement(node) &&
				is_directly_in_exported_fn(node, ['GET', 'PUT', 'POST', 'PATH', 'DELETE'])
			) {
				if (
					node.expression &&
					ts.isObjectLiteralExpression(node.expression) &&
					contains_only(node.expression, ['body', 'status', 'headers'], true)
				) {
					const body = get_prop(node.expression.properties, 'body');
					const headers = get_prop(node.expression.properties, 'headers');
					const status = get_prop(node.expression.properties, 'status');

					const headers_has_multiple_cookies = /['"]set-cookie['"]:\s*\[/.test(
						headers?.getText()?.toLowerCase()
					);
					const is_safe_transformation =
						(!body ||
							(!ts.isShorthandPropertyAssignment(body) &&
								ts.isObjectLiteralExpression(body.initializer))) &&
						(!headers ||
							((!headers.getText().toLowerCase().includes('content-type') ||
								headers.getText().includes('application/json')) &&
								!headers_has_multiple_cookies));

					const headers_str =
						body &&
						(!ts.isPropertyAssignment(body) || !is_string_like(body.initializer)) &&
						(!headers || !headers.getText().toLowerCase().includes('content-type'))
							? `headers: { 'content-type': 'application/json; charset=utf-8'${
									headers
										? ', ' +
										  (ts.isPropertyAssignment(headers)
												? remove_outer_braces(
														get_prop_initializer_text(node.expression.properties, 'headers')
												  )
												: '...headers')
										: ''
							  } }`
							: headers
							? headers.getText()
							: undefined;

					const body_str = get_prop_initializer_text(node.expression.properties, 'body');
					const response_body = body
						? (!ts.isPropertyAssignment(body) ||
								!is_string_like(body.initializer) ||
								(headers && headers.getText().includes('application/json'))) &&
						  (!headers ||
								!headers.getText().toLowerCase().includes('content-type') ||
								headers.getText().includes('application/json')) &&
						  !body_str.startsWith('JSON.stringify')
							? `JSON.stringify(${body_str})`
							: body_str
						: 'undefined';

					const response_init =
						headers_str || status
							? // prettier-ignore
							  ', ' +
						(headers_has_multiple_cookies ? '\n// set-cookie with multiple values needs a different conversion, see the link at the top for more info\n' : '') +
						`{ ${headers_str ? `${headers_str}${status ? ', ' : ''}` : ''}${status ? status.getText() : ''} }`
							: '';

					if (is_safe_transformation) {
						automigration(node, str, `return new Response(${response_body}${response_init});`);
					} else {
						manual_return_migration(
							node,
							str,
							TASK_STANDALONE_ENDPOINT,
							`return new Response(${response_body}${response_init});`
						);
					}
				} else {
					manual_return_migration(node, str, TASK_STANDALONE_ENDPOINT);
				}
			}

			node.forEachChild(walk);
		}

		ast.forEachChild(walk);

		return str.toString();
	} catch {
		return content;
	}
}

/**
 *
 * @param {ts.ObjectLiteralExpression} node
 * @param {string[]} valid_keys
 * @param {boolean} [allow_empty]
 */
function contains_only(node, valid_keys, allow_empty = false) {
	return (
		(allow_empty || node.properties.length > 0) &&
		node.properties.every(
			(prop) =>
				(ts.isPropertyAssignment(prop) || ts.isShorthandPropertyAssignment(prop)) &&
				ts.isIdentifier(prop.name) &&
				valid_keys.includes(prop.name.text)
		)
	);
}

/**
 *
 * @param {ts.Node} node
 * @param {MagicString} str
 * @param {string} comment_nr
 * @param {string} [suggestion]
 */
function manual_return_migration(node, str, comment_nr, suggestion) {
	str.prependLeft(
		node.getStart(),
		error('Migrate this return statement', comment_nr) +
			'\n' +
			(suggestion
				? indent_with(
						comment(`Suggestion (check for correctness before using):\n${suggestion}`) + '\n',
						indent_at_line(str.original, node.getStart())
				  )
				: indent_at_line(str.original, node.getStart()))
	);
}

/**
 *
 * @param {ts.Node} node
 * @param {MagicString} str
 * @param {string} migration
 */
function automigration(node, str, migration) {
	str.overwrite(
		node.getStart(),
		node.getEnd(),
		'// @migration automigrated\n' + indent_at_line(str.original, node.getStart()) + migration
	);
}

/**
 * @param {ts.NodeArray<ts.ObjectLiteralElementLike>} node
 * @param {string} name
 * @returns {undefined | ts.ShorthandPropertyAssignment | ts.PropertyAssignment}
 */
function get_prop(node, name) {
	return /** @type {any} */ (
		node.find(
			(prop) =>
				(ts.isPropertyAssignment(prop) || ts.isShorthandPropertyAssignment(prop)) &&
				ts.isIdentifier(prop.name) &&
				prop.name.text === name
		)
	);
}

/**
 * @param {ts.NodeArray<ts.ObjectLiteralElementLike>} node
 * @param {string} name
 */
function get_prop_initializer_text(node, name) {
	const prop = get_prop(node, name);
	return prop
		? ts.isShorthandPropertyAssignment(prop)
			? name
			: prop.initializer.getText()
		: 'undefined';
}

/**
 * @param {string} str
 */
function remove_outer_braces(str) {
	return str.substring(str.indexOf('{') + 1, str.lastIndexOf('}'));
}

/**
 * @param {ts.Node} node
 */
function is_string_like(node) {
	return (
		ts.isStringLiteral(node) ||
		ts.isTemplateExpression(node) ||
		ts.isNoSubstitutionTemplateLiteral(node)
	);
}

/**
 * True if this node is inside the given function that is `export`ed.
 *
 * @param {ts.Node} node
 * @param {string[]} fn_name
 * @returns {boolean}
 */
function is_directly_in_exported_fn(node, fn_name) {
	if (node.parent === node || !node.parent) {
		return false;
	} else if (is_exported_fn(node, fn_name)) {
		return true;
	} else if (
		ts.isFunctionDeclaration(node) ||
		ts.isVariableStatement(node) ||
		((ts.isArrowFunction(node) || ts.isFunctionExpression(node)) &&
			!is_exported_fn(node.parent.parent.parent, fn_name))
	) {
		return false;
	}
	return is_directly_in_exported_fn(node.parent, fn_name);
}

/**
 * True if node is `export function <fn_name>` or `export let/const <fn_name> = ..`
 *
 * @param {ts.Node} node
 * @param {string[]} fn_name
 */
function is_exported_fn(node, fn_name) {
	// export function X
	return (
		(ts.isFunctionDeclaration(node) &&
			node.modifiers?.[0]?.kind === ts.SyntaxKind.ExportKeyword &&
			fn_name.includes(node.name.text)) ||
		// export const/let X
		(ts.isVariableStatement(node) &&
			node.modifiers?.[0]?.kind === ts.SyntaxKind.ExportKeyword &&
			node.declarationList.declarations.length === 1 &&
			ts.isIdentifier(node.declarationList.declarations[0].name) &&
			fn_name.includes(node.declarationList.declarations[0].name.text)) ||
		// export { X }
		((ts.isVariableStatement(node) || ts.isFunctionDeclaration(node)) &&
			ts.isSourceFile(node.parent) &&
			node.parent.statements.some(
				(statement) =>
					ts.isExportDeclaration(statement) &&
					// prettier-ignore
					// @ts-ignore
					statement.exportClause?.elements
						?.some(
							// @ts-ignore
							(child) =>
								ts.isExportSpecifier(child) &&
								((!child.propertyName && fn_name.includes(child.name.text)) || fn_name.includes(child.propertyName.text))
						)
			))
	);
}
