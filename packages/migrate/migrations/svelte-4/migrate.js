import fs from 'node:fs';
import { Project, ts, Node } from 'ts-morph';

/**
 * @param {string} file_path
 * @param {boolean} migrate_transition
 */
export function update_svelte_file(file_path, migrate_transition) {
	const content = fs.readFileSync(file_path, 'utf-8');
	const updated = content.replace(
		/<script([^]*?)>([^]+?)<\/script>(\n*)/g,
		(_match, attrs, contents, whitespace) => {
			return `<script${attrs}>${transform_code(
				contents,
				(attrs.includes('lang=') || attrs.includes('type=')) &&
					(attrs.includes('ts') || attrs.includes('typescript'))
			)}</script>${whitespace}`;
		}
	);
	fs.writeFileSync(file_path, transform_svelte_code(updated, migrate_transition), 'utf-8');
}

/** @param {string} file_path */
export function update_js_file(file_path) {
	const content = fs.readFileSync(file_path, 'utf-8');
	const updated = transform_code(content, file_path.endsWith('.ts'));
	fs.writeFileSync(file_path, updated, 'utf-8');
}

/**
 * @param {string} code
 * @param {boolean} is_ts
 */
export function transform_code(code, is_ts) {
	const project = new Project({ useInMemoryFileSystem: true });
	const source = project.createSourceFile(`svelte.${is_ts ? 'ts' : 'js'}`, code);
	update_imports(source, is_ts);
	update_typeof_svelte_component(source, is_ts);
	update_action_types(source, is_ts);
	update_action_return_types(source, is_ts);
	return source.getFullText();
}

/**
 * @param {string} code
 * @param {boolean} migrate_transition
 */
export function transform_svelte_code(code, migrate_transition) {
	code = update_svelte_options(code);
	return update_transitions(code, migrate_transition);
}

/**
 * <svelte:options tag=".." /> -> <svelte:options customElement=".." />
 * @param {string} code
 */
function update_svelte_options(code) {
	return code.replace(/<svelte:options([^]*?)\stag=([^]*?)\/?>/, (match) => {
		return match.replace('tag=', 'customElement=');
	});
}

/**
 * transition/in/out:x -> transition/in/out:x|global
 * transition/in/out|local:x -> transition/in/out:x
 * @param {string} code
 * @param {boolean} migrate_transition
 */
function update_transitions(code, migrate_transition) {
	if (migrate_transition) {
		code = code.replace(/(\s)(transition:|in:|out:)(\w+)(?=[\s>=])/g, '$1$2$3|global');
	}
	code = code.replace(/(\s)(transition:|in:|out:)(\w+)(\|local)(?=[\s>=])/g, '$1$2$3');
	return code;
}

/**
 * Action<T> -> Action<T, any>
 * @param {import('ts-morph').SourceFile} source
 * @param {boolean} is_ts
 */
function update_action_types(source, is_ts) {
	const imports = get_imports(source, 'svelte/action', 'Action');
	for (const namedImport of imports) {
		const identifiers = find_identifiers(source, namedImport.getAliasNode()?.getText() ?? 'Action');
		for (const id of identifiers) {
			const parent = id.getParent();
			if (Node.isTypeReference(parent)) {
				const type_args = parent.getTypeArguments();
				if (type_args.length === 1) {
					parent.addTypeArgument('any');
				} else if (type_args.length === 0) {
					parent.addTypeArgument('HTMLElement');
					parent.addTypeArgument('any');
				}
			}
		}
	}

	if (!is_ts) {
		replaceInJsDoc(source, (text) => {
			return text.replace(
				/import\((['"])svelte\/action['"]\).Action(<\w+>)?(?=[^<\w]|$)/g,
				(_, quote, type) =>
					`import(${quote}svelte/action${quote}).Action<${
						type ? type.slice(1, -1) + '' : 'HTMLElement'
					}, any>`
			);
		});
	}
}

/**
 * ActionReturn -> ActionReturn<any>
 * @param {import('ts-morph').SourceFile} source
 * @param {boolean} is_ts
 */
function update_action_return_types(source, is_ts) {
	const imports = get_imports(source, 'svelte/action', 'ActionReturn');
	for (const namedImport of imports) {
		const identifiers = find_identifiers(
			source,
			namedImport.getAliasNode()?.getText() ?? 'ActionReturn'
		);
		for (const id of identifiers) {
			const parent = id.getParent();
			if (Node.isTypeReference(parent)) {
				const type_args = parent.getTypeArguments();
				if (type_args.length === 0) {
					parent.addTypeArgument('any');
				}
			}
		}
	}

	if (!is_ts) {
		replaceInJsDoc(source, (text) => {
			return text.replace(
				/import\((['"])svelte\/action['"]\).ActionReturn(?=[^<\w]|$)/g,
				'import($1svelte/action$1).ActionReturn<any>'
			);
		});
	}
}

/**
 * SvelteComponentTyped -> SvelteComponent
 * @param {import('ts-morph').SourceFile} source
 * @param {boolean} is_ts
 */
function update_imports(source, is_ts) {
	const identifiers = find_identifiers(source, 'SvelteComponent');
	const can_rename = identifiers.every((id) => {
		const parent = id.getParent();
		return (
			(Node.isImportSpecifier(parent) &&
				!parent.getAliasNode() &&
				parent.getParent().getParent().getParent().getModuleSpecifier().getText() === 'svelte') ||
			!is_declaration(parent)
		);
	});

	const imports = get_imports(source, 'svelte', 'SvelteComponentTyped');
	for (const namedImport of imports) {
		if (can_rename) {
			namedImport.renameAlias('SvelteComponent');
			if (
				namedImport
					.getParent()
					.getElements()
					.some((e) => !e.getAliasNode() && e.getNameNode().getText() === 'SvelteComponent')
			) {
				namedImport.remove();
			} else {
				namedImport.setName('SvelteComponent');
				namedImport.removeAlias();
			}
		} else {
			namedImport.renameAlias('SvelteComponentTyped');
			namedImport.setName('SvelteComponent');
		}
	}

	if (!is_ts) {
		replaceInJsDoc(source, (text) => {
			return text.replace(
				/import\((['"])svelte['"]\)\.SvelteComponentTyped(?=\W|$)/g,
				'import($1svelte$1).SvelteComponent'
			);
		});
	}
}

/**
 * typeof SvelteComponent -> typeof SvelteComponent<any>
 * @param {import('ts-morph').SourceFile} source
 * @param {boolean} is_ts
 */
function update_typeof_svelte_component(source, is_ts) {
	const imports = get_imports(source, 'svelte', 'SvelteComponent');

	for (const type of imports) {
		if (type) {
			const name = type.getAliasNode() ?? type.getNameNode();
			name.findReferencesAsNodes().forEach((ref) => {
				const parent = ref.getParent();
				if (parent && Node.isTypeQuery(parent)) {
					const id = parent.getFirstChildByKind(ts.SyntaxKind.Identifier);
					if (id?.getText() === name.getText()) {
						const typeArguments = parent.getTypeArguments();
						if (typeArguments.length === 0) {
							parent.addTypeArgument('any');
						}
					}
				}
			});
		}
	}

	if (!is_ts) {
		replaceInJsDoc(source, (text) => {
			return text.replace(
				/typeof import\((['"])svelte['"]\)\.SvelteComponent(?=[^<\w]|$)/g,
				'typeof import($1svelte$1).SvelteComponent<any>'
			);
		});
	}
}

/**
 * @param {import('ts-morph').SourceFile} source
 * @param {string} from
 * @param {string} name
 */
function get_imports(source, from, name) {
	return source
		.getImportDeclarations()
		.filter((i) => i.getModuleSpecifierValue() === from)
		.flatMap((i) => i.getNamedImports())
		.filter((i) => i.getName() === name);
}

/**
 * @param {import('ts-morph').SourceFile} source
 * @param {string} name
 */
function find_identifiers(source, name) {
	return source.getDescendantsOfKind(ts.SyntaxKind.Identifier).filter((i) => i.getText() === name);
}

/**
 * Does not include imports
 * @param {Node} node
 */
function is_declaration(node) {
	return (
		Node.isVariableDeclaration(node) ||
		Node.isFunctionDeclaration(node) ||
		Node.isClassDeclaration(node) ||
		Node.isTypeAliasDeclaration(node) ||
		Node.isInterfaceDeclaration(node)
	);
}

/**
 * @param {import('ts-morph').SourceFile} source
 * @param {(text: string) => string | undefined} replacer
 */
function replaceInJsDoc(source, replacer) {
	source.forEachChild((node) => {
		if (Node.isJSDocable(node)) {
			const tags = node.getJsDocs().flatMap((jsdoc) => jsdoc.getTags());
			tags.forEach((t) =>
				t.forEachChild((c) => {
					if (Node.isJSDocTypeExpression(c)) {
						const text = c.getText().slice(1, -1);
						const replacement = replacer(text);
						if (replacement && replacement !== text) {
							c.replaceWithText(`{${replacement}}`);
						}
					}
				})
			);
		}
	});
}
