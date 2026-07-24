import path from 'node:path';
import { styleText } from 'node:util';
import { buildErrorMessage } from 'vite';
import { dev } from './context.js';
import { to_fs } from '../../../utils/vite.js';

/** @param {string} url */
export async function loud_ssr_load_module(url) {
	try {
		return await import(/* @vite-ignore */ url);
	} catch (/** @type {any} */ err) {
		const msg = buildErrorMessage(err, [styleText('red', `Internal server error: ${err.message}`)]);

		if (!dev.vite.config.logger.hasErrorLogged(err)) {
			dev.vite.config.logger.error(msg, { error: err });
		}

		// TODO this is inadequate — it doesn't reliably show the overlay on every page load,
		// and when it does appear it may immediately vanish. `vite.hot.send` broadcasts
		// to all connected clients, even ones that are unaffected by the error.
		// we need a more considered approach
		dev.vite.hot.send({
			type: 'error',
			err: /** @type {import('vite').ErrorPayload['err']} */ ({
				...err,
				// these properties are non-enumerable and will
				// not be serialized unless we explicitly include them
				message: err.message,
				stack: err.stack ?? ''
			})
		});

		throw err;
	}
}

/** @param {string} id */
export async function resolve(id) {
	const url = id.startsWith('..') ? to_fs(path.resolve(id)) : `file://${id}`;

	const module = await loud_ssr_load_module(url);

	const module_node = await dev.vite.environments.ssr.moduleGraph.getModuleByUrl(url);
	if (!module_node) throw new Error(`Could not find node for ${url}`);

	return { module, module_node, url };
}
