import { URL } from 'url';
import * as meriyah from 'meriyah';
import MagicString from 'magic-string';
import { extract_names } from 'periscopic';
import { Loader } from './types';
import { SnowpackDevServer } from 'snowpack';
import { walk } from 'estree-walker';

interface InternalModule {
	exports: any,
	hash: number
	dependencies: string[],
	type: 'internal'
}

interface ExternalModule {
	exports: any,
	type: 'external'
}

interface CachedModule {
	module: Promise<InternalModule>;
	time: number;
}

// This function makes it possible to load modules from the 'server'
// snowpack server, for the sake of SSR
export default function loader(snowpack: SnowpackDevServer): Loader {
	const cache = new Map<string, CachedModule>();

	const isInternalModule = (name: string) => name[0] === '/' || name[0] === '.'
	
	const get_module = (importer: string, imported: string, url_stack: string[]): Promise<InternalModule | ExternalModule> =>
		isInternalModule(imported)
			? load(new URL(imported, `http://localhost${importer}`).pathname, url_stack)
			: Promise.resolve(load_node(imported));

	async function loadFromSnowpack(url: string) {
		try {
			return (await snowpack.loadUrl(url, {isSSR: true, encoding: 'utf-8'})).contents;
		} catch (err) {
			throw new Error(`Failed to load ${url}: ${err.message}`);
		}
	}

	async function load(url: string, url_stack: string[]): Promise<InternalModule> {
		// TODO: meriyah (JS parser) doesn't support `import.meta.hot = ...` used in HMR setup code.
		if (url.endsWith('.css.proxy.js')) {
			return null;
		}

		if (url_stack.includes(url)) {
			console.warn(`Circular dependency: ${url_stack.join(' -> ')} -> ${url}`);
			return { exports: {}, hash: -1, dependencies: [], type: 'internal' };
		}

		let cached = cache.get(url);

		// TODO: if time shorter than x, return cached value

		let data: string;
		let dependencies: Record<string, InternalModule>;

		await Promise.all([
			async () => data = await loadFromSnowpack(url),
			async () => {
				if (cached) {
					dependencies = {}

					await Promise.all(
						(await cached.module).dependencies.map(async dependencyUrl =>
							dependencies[dependencyUrl] = await load(dependencyUrl, url_stack.concat(url))
						)
					);
				}
			}
		])

		const hash = get_hash(data, dependencies);

		if (!cached || (await cached.module).hash !== hash) {
			cached = {
				time: new Date().getTime(),
				module: initialize_module(url, data, url_stack.concat(url), dependencies)
					.catch(e => {
						cache.delete(url);
						throw e;
					})
			};

			cache.set(url, cached);
		}

		return cached.module;
	}

	async function initialize_module(url: string, data: string, url_stack: string[], oldDependencies: Record<string, InternalModule> = {}): Promise<InternalModule> {
		const code = new MagicString(data);
		const ast = meriyah.parseModule(data, {
			ranges: true,
			next: true
		});

		const imports = [];

		const export_from_identifiers = new Map();
		let uid = 1;

		ast.body.forEach(node => {
			if (node.type === 'ImportDeclaration') {
				imports.push(node);
				code.remove(node.start, node.end);
			}

			if (node.type === 'ExportAllDeclaration') {
				if (!export_from_identifiers.has(node.source)) {
					export_from_identifiers.set(node.source, `__import${uid++}`);
				}

				code.overwrite(node.start, node.end, `Object.assign(exports, ${export_from_identifiers.get(node.source)})`)
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

					node.specifiers.forEach((specifier: meriyah.ESTree.ExportSpecifier) => {
						const lhs = `exports.${specifier.exported.name}`;
						const rhs = node.source
							? `${export_from_identifiers.get(node.source)}.${specifier.local.name}`
							: specifier.local.name;

						code.overwrite(specifier.start, specifier.end, `${lhs} = ${rhs}`)
					});

					code.remove(node.specifiers[node.specifiers.length - 1].end, node.end);
				}

				else {
					// `export const foo = ...` or `export function foo() {...}`
					if (node.declaration.type === 'VariableDeclaration') {
						code.remove(node.start, node.declaration.start);

						const names = [];
						node.declaration.declarations.forEach(declarator => {
							names.push(...extract_names(declarator.id as any));
						});

						code.appendLeft(node.end, names.map(name => ` exports.${name} = ${name};`).join(''));
					} else {
						code.overwrite(node.start, node.declaration.start, `exports.${node.declaration.id.name} = `);
					}
				}
			}
		});

		// replace import.meta and import(dynamic)
		if (/import\s*\.\s*meta/.test(data) || /import\s*\(/.test(data)) {
			walk(ast.body, {
				enter(node: any) {
					if (node.type === 'MetaProperty' && node.meta.name === 'import') {
						code.overwrite(node.start, node.end, '__importmeta__');
					}

					else if (node.type === 'ImportExpression') {
						code.overwrite(node.start, node.start + 6, `__import__`);
					}
				}
			});
		}

		const deps: {name: string, promise: Promise<any>}[] = [];
		let dependencies: Record<string, InternalModule> = {};

		imports.forEach(node => {
			const url_to_import = node.source.value;

			const promise = (oldDependencies[url]
				? Promise.resolve(oldDependencies[url])
				: get_module(url, url_to_import, url_stack)
			).then(module => {
				if (module.type == 'internal') {
					dependencies[url] = module;
				}

				return module;
			});

			if (node.type === 'ExportAllDeclaration' || node.type === 'ExportNamedDeclaration') {
				// `export * from './other.js'` or `export { foo } from './other.js'`
				deps.push({
					name: export_from_identifiers.get(node.source),
					promise
				});
			}

			else if (node.specifiers.length === 0) {
				// bare import
				deps.push({
					name: null,
					promise
				});
			}

			else if (node.specifiers[0].type === 'ImportNamespaceSpecifier') {
				deps.push({
					name: node.specifiers[0].local.name,
					promise
				});
			}

			else {
				deps.push(...node.specifiers.map(specifier => ({
					name: specifier.local.name,
					promise: promise.then(exports => exports[specifier.imported ? specifier.imported.name : 'default'])
				})));
			}
		});

		deps.sort((a, b) => !!a.name !== !!b.name ? a.name ? -1 : 1 : 0);

		code.append(`\n//# sourceURL=${url}`);

		const fn = new Function('exports', 'global', 'require', '__import__', '__importmeta__', ...deps.map(d => d.name).filter(Boolean), code.toString());
		const values = await Promise.all(deps.map(d => d.promise));

		let exports = {};

		fn(
			exports,
			global,

			// require(...)
			id => {
				// TODO can/should this restriction be relaxed?
				throw new Error(`Use import instead of require (attempted to load '${id}' from '${url}')`);
			},

			// import(...)
			source => get_module(url, source, url_stack).then(module => {
				if (module.type == 'internal') {
					dependencies[url] = module;
				}

				return module;
			}),

			// import.meta
			{ url },

			...values
		);

		return { exports, hash: get_hash(data, dependencies), dependencies: Object.keys(dependencies), type: 'internal' };
	}

	return url => load(url, []).then(module => module.exports);
}

function get_hash(url: string, dependencies: Record<string, InternalModule>) {
	let hash = 5381;
	let i = url.length;

	while (i) hash = (hash * 33) ^ url.charCodeAt(--i);

	Object.keys(dependencies).sort().forEach(url => {
		hash = (hash * 33) ^ dependencies[url].hash
	})

	// set sign bit to zero
	return hash >>> 0;
}

function load_node(source: string): ExternalModule {
	// mirror Rollup's interop by allowing both of these:
	//  import fs from 'fs';
	//  import { readFileSync } from 'fs';
	return {
		exports: new Proxy(require(source), {
			get(mod, prop) {
				if (prop === 'default') return mod;
				return mod[prop];
			}
		}),
		type: 'external'
	};
}