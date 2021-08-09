import { test } from 'uvu';
import { createServer } from '../src/server.js';
import * as assert from 'uvu/assert';
import fetch from 'node-fetch';
import httpProxy from 'http-proxy';
import fs from 'fs';
import path from 'path';
import os from 'os';

const socketPath = path.join(os.tmpdir(), 'mysocket');

const PROXY_PORT = 9090;
const { SOCKET_PATH = socketPath } = process.env;
const DEFAULT_SERVER_OPTS = { render: () => {} };

function cleanupSocketFile() {
	if (fs.existsSync(SOCKET_PATH)) {
		fs.unlinkSync(SOCKET_PATH);
	}
}

function createProxy() {
	const proxy = httpProxy.createProxyServer({
		target: {
			socketPath: SOCKET_PATH
		},
		xfwd: true,
		secure: false
	});
	proxy.listen(PROXY_PORT);
	return proxy;
}

function startServer(opts = DEFAULT_SERVER_OPTS) {
	const server = createServer(opts);
	return new Promise((fulfil, reject) => {
		server.listen(SOCKET_PATH, (err) => {
			if (err) {
				reject(err);
			}
			fulfil(server);
		});
	});
}

test('starts a server listening on a path (domain socket file)', async () => {
	const server = await startServer();
	assert.ok('server started');
	server.server.close();
	cleanupSocketFile();
});

test('serves a 404 via path', async () => {
	const server = await startServer();
	const proxy = createProxy();
	const res = await fetch(`http://localhost:${PROXY_PORT}/nothing`);
	assert.equal(res.status, 404);
	server.server.close();
	proxy.close();
	cleanupSocketFile();
});

test('responses with the rendered status code via path', async () => {
	const server = await startServer({
		render: () => {
			return {
				headers: 'wow',
				status: 203,
				body: 'ok'
			};
		}
	});
	const proxy = createProxy();
	const res = await fetch(`http://localhost:${PROXY_PORT}/wow`);
	assert.equal(res.status, 203);
	server.server.close();
	proxy.close();
	cleanupSocketFile();
});

test.run();
