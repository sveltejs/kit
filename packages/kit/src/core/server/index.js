import http from 'http';
import https from 'https';

/**
 *
 * @param {number} port
 * @param {string} host
 * @param {boolean | https.ServerOptions} https_options
 * @param {(req: http.IncomingMessage, res: http.ServerResponse) => void} handler
 * @returns
 */
export async function get_server(port, host, https_options, handler) {
	if (https_options) {
		https_options =
			typeof https_options === 'boolean' ? /** @type {https.ServerOptions} */ ({}) : https_options;

		if (!https_options.key || !https_options.cert) {
			https_options.key = https_options.cert = (await import('./cert')).createCertificate();
		}
	}

	return new Promise((fulfil) => {
		const server = https_options
			? https.createServer(/** @type {https.ServerOptions} */ (https_options), handler)
			: http.createServer(handler);

		server.listen(port, host || '0.0.0.0', () => {
			fulfil(server);
		});
	});
}
