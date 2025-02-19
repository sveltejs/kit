/**
 * @param {import('node:http').IncomingMessage} req
 * @param {import('node:http').ServerResponse} res
 * @param {() => void} next
 */
export default function middleware(req, res, next) {
	if (req.url === '/middleware/custom-response') {
		res.writeHead(200, { 'Content-Type': 'text/html' });
		res.end('<html><body><h1>Custom Response</h1></body></html>');
	} else {
		if (req.url === '/middleware/reroute/a') {
			req.url = '/middleware/reroute/b';
		} else if (req.url === '/middleware/headers') {
			req.headers['x-custom-request-header'] = 'value';
			res.setHeader('x-custom-response-header', 'value');
		}

		next();
	}
}
