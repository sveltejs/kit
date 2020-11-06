const { fork } = require('child_process');
const path = require('path');
const { existsSync } = require('fs');

const entry = '../src/app-server.js';

let server = null;
let server_closed = null;

/**
 * Forks a child process and calls app-server to start a Svelte dev server there.
 */
async function start(app_path) {
	const cwd = app_path;

	const server_listening = deferred();
	server_closed = deferred();

	const env = {};

	if (!existsSync(path.join(app_path, 'snowpack.config.js'))) {
		env.SNOWPACK_CONFIG = '../snowpack.config.js';
	}

	server = fork(entry, [], {
		cwd,
		env
	});

	server.on('exit', () => {
		server_listening.reject();
		server_closed.resolve();
		server = null;
	});

	server.on('message', message => {
		if (!message.__kit__) return;

		switch (message.event) {
			case 'listening':
				server_listening.resolve();
				break;

			case 'error':
				console.error(message.error);
				break;

			default:
				console.log(`Unknown message: ${JSON.stringify(message)}`);
		}
	});

	return server_listening;
}

function is_running() {
	return server != null;
}

async function stop() {
	if (server) {
		server.kill();

		return server_closed;
	}
}

function deferred() {
	let resolve, reject;

	const deferred = new Promise((_resolve, _reject) => {
		resolve = _resolve;
		reject = _reject;
	});

	deferred.resolve = resolve;
	deferred.reject = reject;

	return deferred;
}

module.exports = { start, stop, is_running };
