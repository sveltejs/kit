import { test } from 'uvu';
import { createServer } from '../src/server.js';
import * as assert from 'uvu/assert';
import fetch from 'node-fetch';

const { PORT = 3000 } = process.env;

function startServer() {
	const server = createServer({ render: () => {} });
	return new Promise((fulfil, reject) => {
		server.listen(PORT, (err) => {
			if (err) {
				reject(err);
			}
			fulfil(server);
		});
	});
}

test('starts a server', async () => {
	const server = await startServer();
	assert.ok('server started');
	server.server.close();
});

test('serves a 404', async () => {
	const server = await startServer();
	const res = await fetch(`http://localhost:${PORT}/nothing`);
	assert.equal(res.status, 404);
	server.server.close();
});

test.run();
