// We're using `pathe` rather than `node:path` for compatibility with other runtimes.
import * as pathe from 'pathe';

/** @param {string} url */
async function loud_ssr_load_module(url) {
	// We can use a dynamic import rather than `vite.ssrLoadModule` because it will be executed inside the environment module runner.
	return await import(/* @vite-ignore */ url);

	// TODO: report errors using import.meta.hot.send
}

/** @param {string} cwd */
export function create_resolve(cwd) {
	/** @param {string} id */
	return async function resolve(id) {
		// Do we need `to_fs` here? If so we'll need to split it out into a module that doesn't import from Node.
		const url = id.startsWith('..') ? pathe.resolve(cwd, id) : `/${id}`;

		const module = await loud_ssr_load_module(url);

		return { module, url };

		// TODO: return module nodes or use alternative approach to collect dependencies for inlining CSS
	};
}
