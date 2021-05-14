import http from 'http';
import https from 'https';
import fs from 'fs';
/**
 *
 * @param {number} port
 * @param {string} host
 * @param {boolean} use_https
 * @param {any} user_config
 * @param {(req: http.IncomingMessage, res: http.ServerResponse) => void} handler
 * @returns {Promise<http.Server | https.Server>}
 */
export async function get_server(port, host, use_https, user_config, handler) {
	/** @type {https.ServerOptions} */
	const https_options = {};

	if (use_https) {
		if (user_config.server?.https?.cert === undefined) {
			https_options.key = https_options.cert = (await import('./cert.js')).createCertificate();
		} else {
			https_options.key = user_config.server.https.key.toString();
			https_options.cert = user_config.server.https.cert.toString();
		}
	}

	return new Promise((fulfil) => {
		const server = use_https
			? https.createServer(/** @type {https.ServerOptions} */ (https_options), handler)
			: http.createServer(handler);

		server.listen(port, host || '0.0.0.0', () => {
			fulfil(server);
		});
	});
}
