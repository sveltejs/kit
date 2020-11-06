const { fork } = require('child_process');
const path = require('path');
const { existsSync } = require('fs');

class Runner {
	terminate = null;
	server = null;
	messages = [];
	errors = [];
	port = null;
	path = null;

	constructor(path) {
		this.path = path;
	}

	async run() {
		const entry = '../start-app.js';
		const cwd = this.path;

		const server_listening = deferred();
		const server_closed = deferred();

		this.terminate = server_closed;

		const env = {};
		
		if (!existsSync(path.join(this.path, 'snowpack.config.js'))) {
			env.SNOWPACK_CONFIG = '../snowpack.config.js';
		}
		
		this.server = fork(entry, [], {
			cwd,
			env
		});
		this.server.on('exit', () => {
			console.log('got exit message');
			server_listening.reject();
			server_closed.resolve();
		});
		this.server.on('message', message => {
			console.log(message);

			if (!message.__kit__) return;

			switch (message.event) {
				case 'listening':
					this.port = message.port;
					this.base = `http://localhost:${this.port}`;

					server_listening.resolve();
					break;

				case 'error':
					this.errors.push(Object.assign(new Error(), message.error));
					break;

				default:
					this.messages.push(message);
			}
		});

		return server_listening;
	}

	end() {
		this.server.kill();

		return this.terminate;
	}
}

let runner = null;

const http = require('http');

const hostname = '127.0.0.1';
const port = 3003;

const server = http.createServer(async (req, res) => {
	const [command, arg] = req.url.slice(1).split('/');

	if (command === 'start') {
		const test_name = arg;

		if (runner) {
			await runner.end();
		}

		runner = new Runner(test_name);
		await runner.run();

		res.statusCode = 200;
		res.setHeader('Access-Control-Allow-Origin', '*');
		res.setHeader('Content-Type', 'application/json');
		res.end(JSON.stringify({ result: 'ok' }));
	} else {
		res.statusCode = 404;
	}
});

server.listen(port, hostname, () => {
	console.log(`Server running at http://${hostname}:${port}/`);
});

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
