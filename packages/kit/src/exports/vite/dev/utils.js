import * as pathe from 'pathe';

/** @param {string} url */
async function loud_ssr_load_module(url) {
	return await import(/* @vite-ignore */ url);
}

/** @param {string} cwd */
export function create_resolve(cwd) {
	/** @param {string} id */
	return async function resolve(id) {
		// use to_fs?
		const url = id.startsWith('..') ? pathe.resolve(cwd, id) : `/${id}`;

		const module = await loud_ssr_load_module(url);

		return { module, url };
	};
}
