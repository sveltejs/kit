import * as meriyah from 'meriyah';
import MagicString from 'magic-string';
import { extract_names } from 'periscopic';
import { walk } from 'estree-walker';

export function transform(data) {
	const code = new MagicString(data);
	const ast = meriyah.parseModule(data, {
		ranges: true,
		next: true
	});

	const imports = [];

	const export_from_identifiers = new Map();
	let uid = 1;

	ast.body.forEach((node) => {
		if (node.type === 'ImportDeclaration') {
			imports.push(node);
			code.remove(node.start, node.end);
		}

		if (node.type === 'ExportAllDeclaration') {
			if (!export_from_identifiers.has(node.source)) {
				export_from_identifiers.set(node.source, `__import${uid++}`);
			}

			code.overwrite(
				node.start,
				node.end,
				`Object.assign(exports, ${export_from_identifiers.get(node.source)})`
			);
			imports.push(node);
		}

		if (node.type === 'ExportDefaultDeclaration') {
			code.overwrite(node.start, node.declaration.start, 'exports.default = ');
		}

		if (node.type === 'ExportNamedDeclaration') {
			if (node.source) {
				imports.push(node);

				if (!export_from_identifiers.has(node.source)) {
					export_from_identifiers.set(node.source, `__import${uid++}`);
				}
			}

			if (node.specifiers && node.specifiers.length > 0) {
				code.remove(node.start, node.specifiers[0].start);

				node.specifiers.forEach((specifier) => {
					const lhs = `exports.${specifier.exported.name}`;
					const rhs = node.source
						? `${export_from_identifiers.get(node.source)}.${specifier.local.name}`
						: specifier.local.name;

					code.overwrite(specifier.start, specifier.end, `${lhs} = ${rhs}`);
				});

				code.remove(node.specifiers[node.specifiers.length - 1].end, node.end);
			} else {
				// `export const foo = ...` or `export function foo() {...}`
				code.remove(node.start, node.declaration.start);

				let suffix;

				if (node.declaration.type === 'VariableDeclaration') {
					const names = [];
					node.declaration.declarations.forEach((declarator) => {
						names.push(...extract_names(declarator.id));
					});

					suffix = names.map((name) => ` exports.${name} = ${name};`).join('');
				} else {
					const { name } = node.declaration.id;
					suffix = ` exports.${name} = ${name};`;
				}

				code.appendLeft(node.end, suffix);
			}
		}
	});

	// replace import.meta and import(dynamic)
	if (/import\s*\.\s*meta/.test(data) || /import\s*\(/.test(data)) {
		walk(ast.body, {
			enter(node) {
				if (node.type === 'MetaProperty' && node.meta.name === 'import') {
					code.overwrite(node.start, node.end, '__importmeta__');
				} else if (node.type === 'ImportExpression') {
					code.overwrite(node.start, node.start + 6, '__import__');
				}
			}
		});
	}

	const deps = [];
	imports.forEach((node) => {
		const source = node.source.value;

		if (node.type === 'ExportAllDeclaration' || node.type === 'ExportNamedDeclaration') {
			// `export * from './other.js'` or `export { foo } from './other.js'`
			deps.push({
				name: export_from_identifiers.get(node.source),
				prop: null,
				source
			});
		} else if (node.specifiers.length === 0) {
			// bare import
			deps.push({
				name: null,
				prop: null,
				source
			});
		} else if (node.specifiers[0].type === 'ImportNamespaceSpecifier') {
			deps.push({
				name: node.specifiers[0].local.name,
				prop: null,
				source
			});
		} else {
			deps.push(
				...node.specifiers.map((specifier) => ({
					name: specifier.local.name,
					prop: specifier.imported ? specifier.imported.name : 'default',
					source
				}))
			);
		}
	});

	deps.sort((a, b) => (!!a.name !== !!b.name ? (a.name ? -1 : 1) : 0));

	return { code: code.toString(), deps };
}
