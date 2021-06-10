import http from 'http';
import https from 'https';
/**
 *
 * @param {boolean} use_https
 * @param {any} user_config
 * @param {(req: http.IncomingMessage, res: http.ServerResponse) => void} handler
 * @returns {Promise<import('net').Server>}
 */
export async function get_server(use_https, user_config, handler) {
	/** @type {https.ServerOptions} */
	const https_options = {};

	if (use_https) {
		if (
			user_config &&
			user_config.server &&
			user_config.server.https &&
			user_config.server.https.key &&
			user_config.server.https.cert
		) {
			https_options.key = user_config.server.https.key.toString();
			https_options.cert = user_config.server.https.cert.toString();
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
