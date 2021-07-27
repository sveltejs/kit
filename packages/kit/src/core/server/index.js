import http from 'http';
import https from 'https';
import fs from 'fs';
import path from 'path';
/**
 *
 * @param {boolean} use_https
 * @param {import('types/config').ViteConfig} vite_config
 * @param {(req: http.IncomingMessage, res: http.ServerResponse) => void} handler
 * @returns {Promise<import('net').Server>}
 */
export async function get_server(use_https, vite_config, handler) {
	/** @type {https.ServerOptions} */
	let https_options;

	if (use_https) {
		https_options =
			vite_config && vite_config.server && typeof vite_config.server.https === 'object'
				? vite_config.server.https
				: {};

		if (https_options.ca) https_options.ca = readFileIfExists(https_options.ca);
		if (https_options.cert) https_options.cert = readFileIfExists(https_options.cert);
		if (https_options.key) https_options.key = readFileIfExists(https_options.key);
		if (https_options.pfx) {
			https_options.pfx = readFileIfExists(https_options.pfx);
			delete https_options.cert;
			delete https_options.key;
		}

		if (!https_options.pfx && (!https_options.key || !https_options.cert)) {
			https_options.cert = https_options.key = (await import('./cert')).createCertificate();
		}
	} else {
		if (vite_config && vite_config.server) {
			delete vite_config.server.https;
		}
	}

	return Promise.resolve(
		use_https
			? https.createServer(/** @type {https.ServerOptions} */(https_options), handler)
			: http.createServer(handler)
	);
}

/**
 *
 * @param {string | Buffer | any[]} value
 * @returns {string | Buffer | Buffer[]} value
 */
function readFileIfExists(value) {
	if (typeof value === 'string') {
		try {
			return fs.readFileSync(path.resolve(value));
			//			return fs.readFileSync(path.resolve(value), { encoding: 'utf-8' });
		} catch (e) {
			return value;
		}
	}
	return value;
}
