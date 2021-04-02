import http from 'http';
import https from 'https';

/**
 *
 * @param {number} port
 * @param {string} host
 * @param {boolean} use_https
 * @param {(req: http.IncomingMessage, res: http.ServerResponse) => void} handler
 * @returns {Promise<http.Server | https.Server>}
 */
export async function get_server(port, host, use_https, handler) {
	/** @type {https.ServerOptions} */
	const https_options = {};

	if (use_https) {
		https_options.key = https_options.cert = (await import('./cert')).createCertificate();
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
