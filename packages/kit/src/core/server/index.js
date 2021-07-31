import http from 'http';
import https from 'https';

/**
 * @param {boolean} use_https
 * @param {import('vite').UserConfig} user_config
 * @param {(req: http.IncomingMessage, res: http.ServerResponse) => void} handler
 * @returns {Promise<import('net').Server>}
 */
export async function get_server(use_https, user_config, handler) {
	/** @type {https.ServerOptions} */
	const https_options = {};

	if (use_https) {
		const secure_opts = user_config.server
			? /** @type {import('tls').SecureContextOptions} */ (user_config.server.https)
			: {};

		if (secure_opts.key && secure_opts.cert) {
			https_options.key = secure_opts.key.toString();
			https_options.cert = secure_opts.cert.toString();
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
