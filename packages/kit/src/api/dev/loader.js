import { existsSync, readFileSync } from 'fs';
import { URL } from 'url';
import snowpack from 'snowpack';
import { sourcemap_stacktrace } from './sourcemap_stacktrace';
import { transform } from './transform';

// This function makes it possible to load modules from the 'server'
// snowpack server, for the sake of SSR
export default function loader(sp, config) {
	const cache = new Map();
	const graph = new Map();

	const get_module = (importer, imported, url_stack) => {
		if (imported[0] === '/' || imported[0] === '.') {
			const { pathname } = new URL(imported, `http://localhost${importer}`);

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
		// TODO seems odd that getUrlForFile isn't a property of the `sp` instance!
		const url = snowpack.getUrlForFile(filePath, config);
		if (url) invalidate_all(url);
	});

	async function load(url, url_stack) {
		if (url.endsWith('.css.proxy.js')) {
			return null;
		}

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
		const { code, deps, names } = transform(loaded.contents);

		const exports = {};

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
				value: (source) => get_module(url, source, url_stack)
			},
			{
				name: names.__import_meta,
				value: { url }
			},

			...(await Promise.all(
				deps.map(async (dep) => {
					return {
						name: dep.name,
						value: await get_module(url, dep.source, url_stack)
					};
				})
			))
		];

		const fn = new Function(...args.map((d) => d.name), `${code}\n//# sourceURL=${url}`);

		try {
			fn(...args.map((d) => d.value));
		} catch (e) {
			e.stack = await sourcemap_stacktrace(e.stack, async (address) => {
				if (existsSync(address)) {
					// it's a filepath
					return readFileSync(address, 'utf-8');
				}

				try {
					const { contents } = await sp.loadUrl(address, { isSSR: true, encoding: 'utf8' });
					return contents;
				} catch {
					// fail gracefully
				}
			});

			throw e;
		}

		return exports;
	}

	return (url) => load(url, []);
}

function load_node(source) {
	// mirror Rollup's interop by allowing both of these:
	//  import fs from 'fs';
	//  import { readFileSync } from 'fs';
	return new Proxy(require(source), {
		get(mod, prop) {
			if (prop === 'default') return mod;
			return mod[prop];
		}
	});
}
