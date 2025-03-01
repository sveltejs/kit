import { normalizeUrl } from '@sveltejs/kit';

/**
 * @param {import('node:http').IncomingMessage} req
 * @param {import('node:http').ServerResponse} res
 * @param {() => void} next
 */
export default function middleware(req, res, next) {
	const { url, denormalize } = normalizeUrl(req.url || '/');

	if (url.pathname === '/middleware/custom-response') {
		res.writeHead(200, { 'Content-Type': 'text/html' });
		res.end('<html><body><h1>Custom Response</h1></body></html>');
	} else {
		if (url.pathname === '/middleware/reroute/a') {
			req.url = denormalize('/middleware/reroute/b').pathname;
		} else if (url.pathname === '/middleware/headers') {
			req.headers['x-custom-request-header'] = 'value';
			res.setHeader('x-custom-response-header', 'value');
		}

		next();
	}
}
