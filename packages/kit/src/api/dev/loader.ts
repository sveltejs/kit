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
	// relative URLs!
	dependencies: string[],
	type: 'internal'
}

interface ExternalModule {
	exports: any,
	type: 'external'
}

interface CircularModule {
	exports: {},
	type: 'circular'
}

interface CachedModule {
	module: Promise<InternalModule>;
	time: number;
}

type Module = ExternalModule | InternalModule | CircularModule;

// if a cached module is not older than this, do not re-check if it has changed
const min_revalidate_time_ms = 500

// This function makes it possible to load modules from the 'server'
// snowpack server, for the sake of SSR
export default function loader(snowpack: SnowpackDevServer): Loader {
	const cache = new Map<string, CachedModule>();

	const is_internal_module = (name: string) => name[0] === '/' || name[0] === '.';
	const is_unchangeable = (url: string) => url.startsWith('/web_modules/');

	async function get_module(importer: string, imported: string, url_stack: string[]): Promise<Module> {
		if (is_internal_module(imported)) {
			return load(new URL(imported, `http://localhost${importer}`).pathname, url_stack);
		}
		else {
			return load_node(imported);
		}
	}

	async function get_code_from_snowpack(url: string) {
		try {
			return (await snowpack.loadUrl(url, {isSSR: true, encoding: 'utf-8'})).contents;
		} catch (err) {
			throw new Error(`Failed to load ${url}: ${err.message}`);
		}
	}

	async function get_dependencies_as_map(relative_urls: string[], importer_url: string, url_stack: string[]) {
		let dependencies: Record<string, InternalModule> = {};

		await Promise.all(relative_urls.map(
			async dependencyUrl => {
				const dependency = await get_module(importer_url, dependencyUrl, url_stack)

				if (dependency.type === 'internal') {
					dependencies[dependencyUrl] = dependency;
				}
			}
		))

		return dependencies;
	}

	async function load(url: string, url_stack: string[]): Promise<InternalModule | CircularModule> {
		// TODO: meriyah (JS parser) doesn't support `import.meta.hot = ...` used in HMR setup code.
		if (url.endsWith('.css.proxy.js')) {
			return { exports: null, type: 'circular' };
		}

		if (url_stack.includes(url)) {
			console.warn(`Circular dependency: ${url_stack.join(' -> ')} -> ${url}`);

			return { exports: {}, type: 'circular' };
		}

		url_stack = url_stack.concat(url);

		let cached = cache.get(url);

		if (cached && (cached.time > get_time() - min_revalidate_time_ms || is_unchangeable(url))) {
			return cached.module;
		}

		// the cached module may or may not be stale here, but to handle race conditions while validating whether it is,
		// we store a promise that is checking the staleness, so that subsequent calls don't trigger a new check.
		const module = (async () => {
			// references to any dependencies we have loaded. key: relative URL
			let dependencies: Record<string, InternalModule> = {};

			// don't await here so we can instead fetch the code
			// in parallel with the dependencies
			let code_promise = get_code_from_snowpack(url);

			const calculate_hash = async () => get_hash(
				await code_promise,
				(dependencies = await get_dependencies_as_map((await cached.module).dependencies, url, url_stack))
			);

			if (cached && (await cached.module).hash === await calculate_hash()) {
				return cached.module;
			}
			else {
				return code_promise
					.then(code => initialize_module(url, code, url_stack, dependencies))
					.catch(e => {
						console.error(e)
						cache.delete(url);
						throw e;
					});
			}
		})();

		cache.set(url, {
			time: get_time(),
			module
		});

		return module
	}

	/**
	 * Evaluate the module to calculate its exports.
	 * @param oldDependencies Any previously known dependencies (passing them saves us having to re-fetch them)
	 */
	async function initialize_module(
		url: string,
		data: string,
		url_stack: string[],
		oldDependencies: Record<string, InternalModule> = {}
	): Promise<InternalModule> {
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

		const imported_symbols: {name: string, promise: Promise<any>}[] = [];
		let dependencies: Record<string, InternalModule> = {};

		async function get_imported_module(url_to_import: string): Promise<Module> {
			const module = oldDependencies[url_to_import] || (await get_module(url, url_to_import, url_stack));

			if (module.type == 'internal') {
				dependencies[url_to_import] = module;
			}

			return module;
		}

		imports.forEach(node => {
			const promise = get_imported_module(node.source.value).then(module => module.exports);

			if (node.type === 'ExportAllDeclaration' || node.type === 'ExportNamedDeclaration') {
				// `export * from './other.js'` or `export { foo } from './other.js'`
				imported_symbols.push({
					name: export_from_identifiers.get(node.source),
					promise
				});
			}

			else if (node.specifiers.length === 0) {
				// bare import
				imported_symbols.push({
					name: null,
					promise
				});
			}

			else if (node.specifiers[0].type === 'ImportNamespaceSpecifier') {
				imported_symbols.push({
					name: node.specifiers[0].local.name,
					promise
				});
			}

			else {
				imported_symbols.push(...node.specifiers.map(specifier => ({
					name: specifier.local.name,
					promise: promise.then(exports => exports[specifier.imported ? specifier.imported.name : 'default'])
				})));
			}
		});

		imported_symbols.sort((a, b) => !!a.name !== !!b.name ? a.name ? -1 : 1 : 0);

		code.append(`\n//# sourceURL=${url}`);

		const fn = new Function('exports', 'global', 'require', '__import__', '__importmeta__', ...imported_symbols.map(d => d.name).filter(Boolean), code.toString());
		const values = await Promise.all(imported_symbols.map(d => d.promise));

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
			(source: string) => get_imported_module(source).then(module => module.exports),

			// import.meta
			{ url },

			...values
		);

		return {
			exports,
			hash: get_hash(data, dependencies),
			dependencies: Object.keys(dependencies),
			type: 'internal'
		};
	}

	return url => load(url, []).then(module => module.exports);
}

/** A dependency is stale if either its code has changed or its dependencies have */
function get_hash(code: string, dependencies: Record<string, InternalModule>) {
	let hash = 5381;
	let i = code.length;

	while (i) hash = (hash * 33) ^ code.charCodeAt(--i);

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

const get_time = () => new Date().getTime();