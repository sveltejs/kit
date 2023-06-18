import { handler } from 'HANDLER';
import { env } from 'ENV';
import polka from 'polka';
import http from 'node:http';
import https from 'node:https';
import http2 from 'node:http2';
import fs from 'node:fs';

export const path = env('SOCKET_PATH', false);
export const host = env('HOST', '0.0.0.0');
export const port = env('PORT', !path && '3000');
export const cert_path = env('CERT_PATH', false);
export const cert_key_path = env('CERT_KEY_PATH', false);
export const https_port = env('HTTPS_PORT', !path && '3001');
export const only_https = env('ONLY_HTTPS', false);
export const no_http2 = env('NO_HTTP2', false);

const app = polka().use(handler);

if (!only_https) {
	http.createServer(app.handler).listen({ path, host, port }, () => {
		console.log(`Listening on http://${path ? path : host + ':' + port}`);
	});
}

if (cert_path && cert_key_path) {
	const cert = fs.readFileSync(cert_path);
	const key = fs.readFileSync(cert_key_path);
	const https_server = no_http2
		? https.createServer({ cert, key }, app.handler)
		: http2.createSecureServer({ allowHTTP1: true, cert, key }, app.handler);

	https_server.listen({ path, host, https_port }, () => {
		console.log(`Listening on https://${path ? path : host + ':' + https_port}`);
	});
}

export { app as server };
