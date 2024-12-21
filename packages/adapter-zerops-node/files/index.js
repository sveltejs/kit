import { Server } from 'SERVER';
import { manifest } from './manifest.js';
import { createServer } from 'node:http';

const server = new Server(manifest);
const port = process.env.PORT || 3000;

await server.init({
	env: process.env
});

const httpServer = createServer((req, res) => {
	server.respond(req, {
		getClientAddress() {
			return req.socket.remoteAddress;
		}
	}).then(response => {
		response.headers.forEach((value, key) => {
			res.setHeader(key, value);
		});
		
		res.writeHead(response.status);
		response.body.pipe(res);
	});
});

httpServer.listen(port, () => {
	console.log(`Server listening on port ${port}`);
}); 