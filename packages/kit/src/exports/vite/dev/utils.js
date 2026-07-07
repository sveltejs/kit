import { to_fs } from '../../../utils/vite.js';

/** @param {string} url */
export async function loud_ssr_load_module(url) {
	try {
		return await import(/* @vite-ignore */ url);
	} catch (err) {
		if (err instanceof Error) {
			import.meta.hot?.send('sveltekit:ssr-load-module-error', {
				...err,
				// these properties are non-enumerable and will not be
				// serialized unless we explicitly include them
				message: err.message,
				stack: err.stack
			});
		}

		throw err;
	}
}

/** @param {string} id */
export async function resolve(id) {
	const url = id.startsWith('..') ? to_fs(id) : `file:///${id}`;
	const module = await loud_ssr_load_module(url);
	return { module, url };
}
