import http from 'http';
import https from 'https';
//import config from '../../../test/apps/amp/svelte.config';
/**
 *
 * @param {boolean} use_https
 * @param {import('types/config').ViteConfig} vite_config
 * @param {(req: http.IncomingMessage, res: http.ServerResponse) => void} handler
 * @returns {Promise<import('net').Server>}
 */
export async function get_server(use_https, vite_config, handler) {
	/** @type {https.ServerOptions} */
	const https_options =
		vite_config && vite_config.server && vite_config.server.https === 'object'
			? vite_config.server.https
			: {};
	const { key, cert } = https_options;

	if (use_https) {
		if (key && cert) {
			https_options.key = key;
			https_options.cert = cert;
		} else {
			https_options.key = https_options.cert = (await import('./cert')).createCertificate();
		}
	}

	return Promise.resolve(
		use_https
			? https.createServer(/** @type {https.ServerOptions} */ (https_options), handler)
			: http.createServer(handler)
	);
}
