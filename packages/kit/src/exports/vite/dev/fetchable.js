import { buildErrorMessage } from 'vite';

// `posixify` and `to_fs` are duplicated from utils/filesystem.js to avoid
// imports from `node:*` which aren't available in Cloudflare's workerd runtime

/** @param {string} str */
function posixify(str) {
	return str.replace(/\\/g, '/');
}

/**
 * Prepend given path with `/@fs` prefix
 * @param {string} str
 */
function to_fs(str) {
	str = posixify(str);
	return `/@fs${
		// Windows/Linux separation - Windows starts with a drive letter, we need a / in front there
		str.startsWith('/') ? '' : '/'
	}${str}`;
}

/**
 * Removes `/@fs` prefix from given path and posixifies it
 * @param {string} str
 */
export function from_fs(str) {
	str = posixify(str);
	if (!str.startsWith('/@fs')) return str;

	str = str.slice(4);
	// Windows/Linux separation - Windows starts with a drive letter, we need to strip the additional / here
	return str[2] === ':' && /[A-Z]/.test(str[1]) ? str.slice(1) : str;
}

/** @param {string} id */
export async function resolve(id) {
	// TODO: doesn't work for files symlinked to kit package workspace
	const url = id.startsWith('..') ? to_fs(id) : `${id}`;

	const module = await loud_ssr_load_module(url);

	// const module_node = await ssr_environment.moduleGraph.getModuleByUrl(url);
	// if (!module_node) throw new Error(`Could not find node for ${url}`);

	return { module, module_node: '', url };
}

// TODO: do we even need this or will Vite handle import errors for us?
/**
 * @param {string} url
 */
export async function loud_ssr_load_module(url) {
	try {
		// return await server.ssrLoadModule(url, { fixStacktrace: true });
		return await import(/* @vite-ignore */ url);
	} catch (/** @type {any} */ err) {
		// const msg = buildErrorMessage(err, [styleText('red', `Internal server error: ${err.message}`)]);
		const msg = buildErrorMessage(err, [`Internal server error: ${err.message}`]);

		// if (!server.config.logger.hasErrorLogged(err)) {
		// 	server.config.logger.error(msg, { error: err });
		// }
		console.error(msg);

		// server.ws.send({
		// 	type: 'error',
		// 	err: {
		// 		...err,
		// 		// these properties are non-enumerable and will
		// 		// not be serialized unless we explicitly include them
		// 		message: err.message,
		// 		stack: err.stack
		// 	}
		// });
		import.meta.hot?.send('vite:error', {
			...err,
			// these properties are non-enumerable and will
			// not be serialized unless we explicitly include them
			message: err.message,
			stack: err.stack
		});

		throw err;
	}
}
