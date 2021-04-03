import { test } from 'uvu';
import { createServer } from '../src/server.js';
import * as assert from 'uvu/assert';
import fetch from 'node-fetch';

const { PORT = 3000 } = process.env;
const DEFAULT_SERVER_OPTS = { render: () => {} };

function startServer(opts = DEFAULT_SERVER_OPTS) {
	const server = createServer(opts);
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

test('responses with the rendered status code', async () => {
	const server = await startServer({
		render: () => {
			return {
				headers: 'wow',
				status: 203,
				body: 'ok'
			};
		}
	});
	const res = await fetch(`http://localhost:${PORT}/wow`);
	assert.equal(res.status, 203);
	server.server.close();
});

test.run();
