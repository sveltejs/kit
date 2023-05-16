import { assert, test } from 'vitest';
import { create_kit_middleware } from '../src/handler.js';
import fetch from 'node-fetch';
import polka from 'polka';

const { PORT = 3000 } = process.env;
const DEFAULT_SERVER_OPTS = { render: () => {} };

async function startServer(opts = DEFAULT_SERVER_OPTS) {
	return new Promise((fulfil, reject) => {
		const server = polka().use(create_kit_middleware(opts));
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

test('passes through umlaut as encoded path', async () => {
	const server = await startServer({
		render: (incoming) => {
			return {
				status: 200,
				body: incoming.path
			};
		}
	});
	const res = await fetch(`http://localhost:${PORT}/%C3%BCber-uns`);
	assert.equal(await res.text(), '/%C3%BCber-uns');
	server.server.close();
});

test('serve a 400 when we have a malformed url', async () => {
	const server = await startServer();
	const res = await fetch(`http://localhost:${PORT}//`);
	assert.equal(res.status, 400);
	server.server.close();
});

test.run();
