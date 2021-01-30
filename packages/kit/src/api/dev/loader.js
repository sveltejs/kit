import { resolve } from 'url';
import { transform } from './transform';

// This function makes it possible to load modules from the 'server'
// snowpack server, for the sake of SSR
export default function loader(sp) {
	const cache = new Map();
	const graph = new Map();

	const get_module = (importer, imported, url_stack) => {
		if (imported[0] === '/' || imported[0] === '.') {
			const pathname = resolve(importer, imported);

			if (!graph.has(pathname)) graph.set(pathname, new Set());
			graph.get(pathname).add(importer);

			return load(pathname, url_stack);
		}

		return Promise.resolve(load_node(imported));
	};

	const invalidate_all = (path) => {
		cache.delete(path);

		const dependents = graph.get(path);
		graph.delete(path);

		if (dependents) dependents.forEach(invalidate_all);
	};

	sp.onFileChange(({ filePath }) => {
		const url = sp.getUrlForFile(filePath);
		if (url) invalidate_all(url);
	});

	async function load(url, url_stack) {
		if (url_stack.includes(url)) {
			console.warn(`Circular dependency: ${url_stack.join(' -> ')} -> ${url}`);
			return {};
		}

		if (cache.has(url)) return cache.get(url);

		const promise = sp
			.loadUrl(url, { isSSR: true, encoding: 'utf8' })
			.then((loaded) => initialize_module(url, loaded, url_stack.concat(url)))
			.catch((e) => {
				cache.delete(url);
				throw e;
			});

		cache.set(url, promise);
		return promise;
	}

	async function initialize_module(url, loaded, url_stack) {
		const { code, deps, css, names } = transform(loaded.contents);

		const exports = {};
		const all_css = new Set(css.map((relative) => resolve(url, relative)));

		const args = [
			{
				name: 'global',
				value: global
			},
			{
				name: 'require',
				value: (id) => {
					// TODO can/should this restriction be relaxed?
					throw new Error(
						`Use import instead of require (attempted to load '${id}' from '${url}')`
					);
				}
			},
			{
				name: names.exports,
				value: exports
			},
			{
				name: names.__export,
				value: (name, get) => {
					Object.defineProperty(exports, name, { get });
				}
			},
			{
				name: names.__export_all,
				value: (mod) => {
					for (const name in mod) {
						Object.defineProperty(exports, name, {
							get: () => mod[name]
						});
					}
				}
			},
			{
				name: names.__import,
				value: (source) => get_module(url, source, url_stack).then((mod) => mod.exports)
			},
			{
				name: names.__import_meta,
				value: { url }
			},

			...(await Promise.all(
				deps.map(async (dep) => {
					const module = await get_module(url, dep.source, url_stack);
					module.css.forEach((dep) => all_css.add(dep));

					return {
						name: dep.name,
						value: module.exports
					};
				})
			))
		];

		const fn = new Function(...args.map((d) => d.name), `${code}\n//# sourceURL=${url}`);

		fn(...args.map((d) => d.value));

		return {
			exports,
			css: Array.from(all_css)
		};
	}

	return async (url) => load(url, []);
}

function load_node(source) {
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
		css: []
	};
}
