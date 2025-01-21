import fs from 'node:fs';
import { Project, ts, Node } from 'ts-morph';
import { log_migration, log_on_ts_modification, update_pkg } from '../../utils.js';

export function update_pkg_json() {
	fs.writeFileSync(
		'package.json',
		update_pkg_json_content(fs.readFileSync('package.json', 'utf8'))
	);
}

/**
 * @param {string} content
 */
export function update_pkg_json_content(content) {
	return update_pkg(content, [
		['svelte', '^4.0.0'],
		['svelte-check', '^3.4.3'],
		['svelte-preprocess', '^5.0.3'],
		['@sveltejs/kit', '^1.20.4'],
		['@sveltejs/vite-plugin-svelte', '^2.4.1'],
		[
			'svelte-loader',
			'^3.1.8',
			' (if you are still on webpack 4, you need to update to webpack 5)'
		],
		['rollup-plugin-svelte', '^7.1.5'],
		['prettier-plugin-svelte', '^2.10.1'],
		['eslint-plugin-svelte', '^2.30.0'],
		[
			'eslint-plugin-svelte3',
			'^4.0.0',
			' (this package is deprecated, use eslint-plugin-svelte instead. More info: https://svelte.dev/docs/v4-migration-guide#new-eslint-package)'
		],
		[
			'typescript',
			'^5.0.0',
			' (this might introduce new type errors due to breaking changes within TypeScript)'
		]
	]);
}

/**
 * @param {string} code
 * @param {boolean} is_ts
 */
export function transform_code(code, is_ts) {
	const project = new Project({ useInMemoryFileSystem: true });
	const source = project.createSourceFile('svelte.ts', code);
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
		log_migration(
			'Replaced `svelte:options` `tag` attribute with `customElement` attribute: https://svelte.dev/docs/v4-migration-guide#custom-elements-with-svelte'
		);
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
		const replaced = code.replace(/(\s)(transition:|in:|out:)(\w+)(?=[\s>=])/g, '$1$2$3|global');
		if (replaced !== code) {
			log_migration(
				'Added `|global` to `transition`, `in`, and `out` directives (transitions are local by default now): https://svelte.dev/docs/v4-migration-guide#transitions-are-local-by-default'
			);
		}
		code = replaced;
	}
	const replaced = code.replace(/(\s)(transition:|in:|out:)(\w+)(\|local)(?=[\s>=])/g, '$1$2$3');
	if (replaced !== code) {
		log_migration(
			'Removed `|local` from `transition`, `in`, and `out` directives (transitions are local by default now): https://svelte.dev/docs/v4-migration-guide#transitions-are-local-by-default'
		);
	}
	return replaced;
}

/**
 * Action<T> -> Action<T, any>
 * @param {import('ts-morph').SourceFile} source
 * @param {boolean} is_ts
 */
function update_action_types(source, is_ts) {
	const logger = log_on_ts_modification(
		source,
		'Updated `Action` interface usages: https://svelte.dev/docs/v4-migration-guide#stricter-types-for-svelte-functions'
	);

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

	logger();
}

/**
 * ActionReturn -> ActionReturn<any>
 * @param {import('ts-morph').SourceFile} source
 * @param {boolean} is_ts
 */
function update_action_return_types(source, is_ts) {
	const logger = log_on_ts_modification(
		source,
		'Updated `ActionReturn` interface usages: https://svelte.dev/docs/v4-migration-guide#stricter-types-for-svelte-functions'
	);

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

	logger();
}

/**
 * SvelteComponentTyped -> SvelteComponent
 * @param {import('ts-morph').SourceFile} source
 * @param {boolean} is_ts
 */
function update_imports(source, is_ts) {
	const logger = log_on_ts_modification(
		source,
		'Replaced `SvelteComponentTyped` imports with `SvelteComponent` imports: https://svelte.dev/docs/v4-migration-guide#stricter-types-for-svelte-functions'
	);

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

	logger();
}

/**
 * typeof SvelteComponent -> typeof SvelteComponent<any>
 * @param {import('ts-morph').SourceFile} source
 * @param {boolean} is_ts
 */
function update_typeof_svelte_component(source, is_ts) {
	const logger = log_on_ts_modification(
		source,
		'Adjusted `typeof SvelteComponent` to `typeof SvelteComponent<any>`: https://svelte.dev/docs/v4-migration-guide#stricter-types-for-svelte-functions'
	);

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

	logger();
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
