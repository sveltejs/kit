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
export const certPath = env('CERT_PATH', false);
export const certKeyPath = env('CERT_KEY_PATH', false);
export const httpsPort = env('HTTPS_PORT', !path && '3001');
export const onlyHttps = env('ONLY_HTTPS', false);
export const noHttp2 = env('NO_HTTP2', false);

const app = polka().use(handler);

if (!onlyHttps) {
	// TODO Remove the `@ts-expect-error`s below once https://github.com/lukeed/polka/issues/194 is fixed
	// @ts-expect-error
	http.createServer(app.handler).listen({ path, host, port }, () => {
		console.log(`Listening on http://${path ? path : host + ':' + port}`);
	});
}

if (certPath && certKeyPath) {
	const cert = fs.readFileSync(certPath);
	const key = fs.readFileSync(certKeyPath);
	const https_server = noHttp2
		? // @ts-expect-error
		  https.createServer({ cert, key }, app.handler)
		: // @ts-expect-error
		  http2.createSecureServer({ allowHTTP1: true, cert, key }, app.handler);

	https_server.listen({ path, host, port: httpsPort }, () => {
		console.log(`Listening on https://${path ? path : host + ':' + httpsPort}`);
	});
}

export { app as server };
