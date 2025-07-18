import path from 'node:path';

// `posixify` and `to_fs` are duplicated from utils/filesystem.js to avoid
// the import from `node:fs` which isn't available in Cloudflare's workerd runtime

/** @param {string} str */
export function posixify(str) {
	return str.replace(/\\/g, '/');
}

/**
 * Prepend given path with `/@fs` prefix
 * @param {string} str
 */
export function to_fs(str) {
	str = posixify(str);
	return `/@fs${
		// Windows/Linux separation - Windows starts with a drive letter, we need a / in front there
		str.startsWith('/') ? '' : '/'
	}${str}`;
}

/** @param {string} id */
export async function resolve(id) {
	// TODO: doesn't work for files symlinked to kit package workspace. Try in new app with node_modules?
	const url = id.startsWith('..') ? to_fs(path.posix.resolve(id)) : `/${id}`;
	console.log({
		id,
		url
	})

	const module = await loud_ssr_load_module(url);

	// TODO: module_node
	// const module_node = await vite.moduleGraph.getModuleByUrl(url);
	// if (!module_node) throw new Error(`Could not find node for ${url}`);

	// return { module, module_node, url };
	return { module, module_node: '', url };
}

/**
 * @param {string} url 
 * @returns {Promise<Record<string, any>>}
 */
export async function loud_ssr_load_module(url) {
	try {
		return await import(/* @vite-ignore */ url);
	} catch (/** @type {any} */ err) {
		// TODO: implement error logging
		err;
		// const msg = buildErrorMessage(err, [colors.red(`Internal server error: ${err.message}`)]);

		// if (!vite.config.logger.hasErrorLogged(err)) {
		// 	vite.config.logger.error(msg, { error: err });
		// }

		// vite.ws.send({
		// 	type: 'error',
		// 	err: {
		// 		...err,
		// 		// these properties are non-enumerable and will
		// 		// not be serialized unless we explicitly include them
		// 		message: err.message,
		// 		stack: err.stack
		// 	}
		// });

		throw err;
	}
}
