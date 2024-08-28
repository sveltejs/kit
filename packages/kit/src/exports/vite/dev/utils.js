import * as pathe from 'pathe';

const cwd = process.cwd();

/** @param {string} url */
export async function loud_ssr_load_module(url) {
	return await import(/* @vite-ignore */ url);
}

/** @param {string} id */
export async function resolve(id) {
	// use to_fs?
	const url = id.startsWith('..') ? pathe.resolve(cwd, id) : `/${id}`;

	const module = await loud_ssr_load_module(url);

	return { module, url };
}
