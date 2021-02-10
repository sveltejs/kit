import * as meriyah from 'meriyah';
import MagicString from 'magic-string';
import * as periscopic from 'periscopic'; // eslint-disable-line import/no-unresolved
import * as walker from 'estree-walker';
import is_reference from 'is-reference';

export function transform(data) {
	const code = new MagicString(data);
	const ast = meriyah.parseModule(data, {
		ranges: true,
		next: true
	});

	const { map, scope } = periscopic.analyze(ast);
	const all_identifiers = new Set();

	// first, get a list of all the identifiers used in the module...
	walker.walk(ast, {
		enter(node, parent) {
			if (is_reference(node, parent)) {
				all_identifiers.add(node.name);
			}
		}
	});

	// ...then deconflict injected values...
	function deconflict(name) {
		while (all_identifiers.has(name)) name += '_';
		return name;
	}

	const exports = deconflict('exports');
	const __import = deconflict('__import');
	const __import_meta = deconflict('__import_meta');
	const __export = deconflict('__export');
	const __export_all = deconflict('__export_all');

	// ...then extract imports/exports...
	let uid = 0;
	const get_import_name = () => deconflict(`__import${uid++}`);

	const replacements = new Map();
	const deps = [];
	const css = [];

	ast.body.forEach((node) => {
		if (node.type === 'ImportDeclaration') {
			const is_namespace =
				node.specifiers[0] && node.specifiers[0].type === 'ImportNamespaceSpecifier';
			const default_specifier = node.specifiers.find((specifier) => !specifier.imported);

			const name = is_namespace
				? node.specifiers[0].local.name
				: default_specifier
				? default_specifier.local.name
				: get_import_name();

			const source = node.source.value;

			if (source.endsWith('.css.proxy.js')) {
				css.push(source.replace(/\.proxy\.js$/, ''));
			} else {
				deps.push({ name, source });

				if (!is_namespace) {
					node.specifiers.forEach((specifier) => {
						const prop = specifier.imported ? specifier.imported.name : 'default';
						replacements.set(specifier.local.name, `${name}.${prop}`);
					});
				}
			}

			code.remove(node.start, node.end);
		}

		if (node.type === 'ExportAllDeclaration') {
			const source = node.source.value;
			const name = get_import_name();

			deps.push({ name, source });

			code.overwrite(node.start, node.end, `${__export_all}(${name})`);
		}

		if (node.type === 'ExportDefaultDeclaration') {
			code.overwrite(node.start, node.declaration.start, `${exports}.default = `);
		}

		if (node.type === 'ExportNamedDeclaration') {
			if (node.source) {
				const name = get_import_name();
				const source = node.source.value;

				deps.push({ name, source });

				const export_block = node.specifiers
					.map((specifier) => {
						return `${__export}('${specifier.exported.name}', () => ${name}.${specifier.local.name})`;
					})
					.join('; ');

				code.overwrite(node.start, node.end, export_block);
			} else if (node.declaration) {
				// `export const foo = ...` or `export function foo() {...}`
				code.remove(node.start, node.declaration.start);

				let suffix;

				if (node.declaration.type === 'VariableDeclaration') {
					const names = [];
					node.declaration.declarations.forEach((declarator) => {
						names.push(...periscopic.extract_names(declarator.id));
					});

					suffix = names.map((name) => ` ${__export}('${name}', () => ${name});`).join('');
				} else {
					const { name } = node.declaration.id;
					suffix = ` ${__export}('${name}', () => ${name});`;
				}

				code.appendLeft(node.end, suffix);
			} else {
				if (node.specifiers.length > 0) {
					code.remove(node.start, node.specifiers[0].start);

					node.specifiers.forEach((specifier) => {
						code.overwrite(
							specifier.start,
							specifier.end,
							`${__export}('${specifier.exported.name}', () => ${specifier.local.name})`
						);
					});

					code.remove(node.specifiers[node.specifiers.length - 1].end, node.end);
				} else {
					// export {};
					code.remove(node.start, node.end);
				}
			}
		}
	});

	// ...then rewrite import references
	if (replacements.size) {
		let current_scope = scope;

		walker.walk(ast, {
			enter(node, parent) {
				if (map.has(node)) {
					current_scope = map.get(node) || current_scope;
				}

				if (node.type === 'ImportDeclaration') {
					this.skip();
					return;
				}

				if (!is_reference(node, parent)) return;
				if (!replacements.has(node.name)) return;

				if (current_scope.find_owner(node.name) === scope) {
					let replacement = replacements.get(node.name);
					if (parent.type === 'Property' && node === parent.key && node === parent.value) {
						replacement = `${node.name}: ${replacement}`;
					}
					code.overwrite(node.start, node.end, replacement);
				}
			},
			leave(node) {
				if (map.has(node)) {
					current_scope = current_scope.parent;
				}
			}
		});
	}

	// replace import.meta and import(dynamic)
	if (/import\s*\.\s*meta/.test(data) || /import\s*\(/.test(data)) {
		walker.walk(ast.body, {
			enter(node) {
				if (node.type === 'MetaProperty' && node.meta.name === 'import') {
					code.overwrite(node.start, node.end, __import_meta);
				} else if (node.type === 'ImportExpression') {
					code.overwrite(node.start, node.start + 6, __import);
				}
			}
		});
	}

	return {
		code: code.toString(),
		deps,
		css,
		names: { exports, __import, __import_meta, __export, __export_all }
	};
}
