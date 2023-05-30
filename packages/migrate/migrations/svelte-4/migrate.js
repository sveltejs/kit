import fs from 'node:fs';
import { Project, ts, Node } from 'ts-morph';

/** @param {string} file_path */
export function update_svelte_file(file_path) {
	const content = fs.readFileSync(file_path, 'utf-8');
	const updated = content.replace(
		/<script([^]*?)>([^]+?)<\/script>(\n*)/g,
		(_match, attrs, contents, whitespace) => {
			return `<script${attrs}>${transform_code(contents)}</script>${whitespace}`;
		}
	);
	fs.writeFileSync(file_path, transform_svelte_code(updated), 'utf-8');
}

/** @param {string} file_path */
export function update_js_file(file_path) {
	const content = fs.readFileSync(file_path, 'utf-8');
	const updated = transform_code(content);
	fs.writeFileSync(file_path, updated, 'utf-8');
}

/** @param {string} code */
export function transform_code(code) {
	const project = new Project({ useInMemoryFileSystem: true });
	const source = project.createSourceFile('svelte.ts', code);
	update_imports(source);
	update_typeof_svelte_component(source);
	update_action_types(source);
	update_action_return_types(source);
	return source.getFullText();
}

/** @param {string} code */
export function transform_svelte_code(code) {
	return update_transitions(update_svelte_options(code));
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
 * @param {string} code
 */
function update_transitions(code) {
	return code.replace(/(\s)(transition:|in:|out:)(\w+)(?=[\s>=])/g, '$1$2$3|global');
}

/**
 * Action<T> -> Action<T, any>
 * @param {import('ts-morph').SourceFile} source
 */
function update_action_types(source) {
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
}

/**
 * ActionReturn -> ActionReturn<any>
 * @param {import('ts-morph').SourceFile} source
 */
function update_action_return_types(source) {
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
}

/**
 * SvelteComponentTyped -> SvelteComponent
 * @param {import('ts-morph').SourceFile} source
 */
function update_imports(source) {
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
}

/**
 * typeof SvelteComponent -> typeof SvelteComponent<any>
 * @param {import('ts-morph').SourceFile} source
 */
function update_typeof_svelte_component(source) {
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
